import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { GitManager } from './git';
import { logger } from '../../utils/logger';

const execAsync = promisify(exec);

export interface Diagnosis {
    vulnerabilityId: string;
    description: string;
    suggestedFix: string;
    filesToModify: string[];
}

interface Vulnerability {
    id: string;
    title: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    packageName: string;
    version: string;
    fixedIn: string[];
    description: string;
    cvssScore: number;
}

interface ScanResults {
    timestamp: string;
    vulnerabilities: Vulnerability[];
    summary: {
        total: number;
        critical: number;
        high: number;
        medium: number;
        low: number;
    };
}

const SEVERITY_PRIORITY: Record<string, number> = {
    'critical': 4,
    'high': 3,
    'medium': 2,
    'low': 1
};

export class EngineerAgent {
    private git: GitManager;

    constructor() {
        this.git = new GitManager();
    }

    /**
     * Read and parse the scan results JSON file
     */
    private async readScanResults(scanResultsPath: string): Promise<ScanResults> {
        logger.engineer(`Reading scan results from ${scanResultsPath}...`);

        const absolutePath = path.isAbsolute(scanResultsPath)
            ? scanResultsPath
            : path.resolve(process.cwd(), scanResultsPath);

        if (!fs.existsSync(absolutePath)) {
            throw new Error(`Scan results file not found: ${absolutePath}`);
        }

        const fileContent = fs.readFileSync(absolutePath, 'utf-8');
        return JSON.parse(fileContent) as ScanResults;
    }

    /**
     * Sort vulnerabilities by severity (critical first)
     */
    private prioritizeVulnerabilities(vulnerabilities: Vulnerability[]): Vulnerability[] {
        return [...vulnerabilities].sort((a, b) => {
            const priorityDiff = SEVERITY_PRIORITY[b.severity] - SEVERITY_PRIORITY[a.severity];
            if (priorityDiff !== 0) return priorityDiff;
            return b.cvssScore - a.cvssScore;
        });
    }

    /**
     * Check if a fix can be attempted for a vulnerability
     */
    canAttemptFix(vuln: Vulnerability): boolean {
        return vuln.fixedIn && vuln.fixedIn.length > 0;
    }

    /**
     * Get the best fixed version for a vulnerability
     */
    getFixVersion(vuln: Vulnerability): string | null {
        if (!vuln.fixedIn || vuln.fixedIn.length === 0) {
            return null;
        }
        // Return the latest (last) fixed version
        return vuln.fixedIn[vuln.fixedIn.length - 1];
    }

    /**
     * Run a shell command (for npm)
     */
    private async runCommand(command: string): Promise<void> {
        logger.debug(`Executing: ${command}`);
        try {
            await execAsync(command);
        } catch (error: any) {
            throw new Error(`Command failed: ${command}\n${error.stderr || error.message}`);
        }
    }

    /**
     * Analyze scan results and create diagnoses for vulnerabilities
     */
    async diagnose(scanResultsPath: string): Promise<Diagnosis[]> {
        logger.engineer('Analyzing scan results...');

        const scanResults = await this.readScanResults(scanResultsPath);
        const prioritized = this.prioritizeVulnerabilities(scanResults.vulnerabilities);

        logger.info(`Found ${scanResults.summary.total} vulnerabilities`);

        const diagnoses: Diagnosis[] = prioritized.map(vuln => ({
            vulnerabilityId: vuln.id,
            description: `${vuln.title} in ${vuln.packageName}@${vuln.version} (${vuln.severity.toUpperCase()})`,
            suggestedFix: `Update ${vuln.packageName} from ${vuln.version} to ${vuln.fixedIn[0]}`,
            filesToModify: ['package.json']
        }));

        return diagnoses;
    }

    /**
     * Apply a fix for a specific vulnerability
     */
    async applyFix(diagnosis: Diagnosis): Promise<boolean> {
        logger.engineer(`Applying fix for ${diagnosis.vulnerabilityId}...`);

        // Parsing the strings to get the package info
        // Format: "Update [package] from [old] to [new]"
        const match = diagnosis.suggestedFix.match(/Update\s+([^\s]+)\s+from\s+([^\s]+)\s+to\s+([^\s]+)/);

        if (!match) {
            logger.error('Could not parse fix suggestion format.');
            return false;
        }

        const [, packageName, , newVersion] = match;
        const branchName = `warden/fix-${packageName}`;

        try {
            // 1. Checkout Branch
            await this.git.checkoutBranch(branchName);

            // 2. Read package.json
            const packageJsonPath = path.resolve(process.cwd(), 'package.json');
            if (!fs.existsSync(packageJsonPath)) {
                throw new Error("package.json not found!");
            }
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

            // 3. Update Dependency
            let updated = false;
            // Check dependencies
            if (packageJson.dependencies && packageJson.dependencies[packageName]) {
                logger.info(`Updating dependencies: ${packageName} ${packageJson.dependencies[packageName]} -> ${newVersion}`);
                packageJson.dependencies[packageName] = newVersion;
                updated = true;
            }
            // Check devDependencies
            if (packageJson.devDependencies && packageJson.devDependencies[packageName]) {
                logger.info(`Updating devDependencies: ${packageName} ${packageJson.devDependencies[packageName]} -> ${newVersion}`);
                packageJson.devDependencies[packageName] = newVersion;
                updated = true;
            }

            if (!updated) {
                logger.warn(`Package ${packageName} not found in dependencies. Trying to install directly...`);
                logger.error('Failed to find direct dependency in package.json. This might be a transitive dependency.');
                return false;
            }

            // 4. Write package.json
            fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

            // 5. Update lockfile
            logger.engineer('Running npm install to update lockfile...');
            await this.runCommand('npm install');

            // 6. Verify
            logger.engineer('Running Verification (npm test)...');
            try {
                await this.runCommand('npm test');
                logger.success('Verification Passed!');
            } catch {
                logger.error('Verification Failed! Reverting changes...');
                await this.git.revertChanges();
                return false;
            }

            // 7. Commit
            await this.git.stageAll();
            await this.git.commit(`fix(${packageName}): resolve ${diagnosis.vulnerabilityId}`);

            logger.success(`Fix applied successfully on branch ${branchName}`);
            return true;

        } catch (error) {
            logger.error('Failed to apply fix:', error as Error);
            return false;
        }
    }

    async run(scanResultsPath: string): Promise<void> {
        logger.engineer('Engineer Agent Starting...');

        try {
            const diagnoses = await this.diagnose(scanResultsPath);

            if (diagnoses.length === 0) {
                logger.info('No vulnerabilities found.');
                return;
            }

            const criticalDiagnosis = diagnoses[0];
            logger.info(`Targeting highest priority vulnerability: ${criticalDiagnosis.vulnerabilityId}`);

            const success = await this.applyFix(criticalDiagnosis);

            if (success) {
                logger.success('Engineer Agent completed successfully!');
            } else {
                logger.warn('Engineer Agent failed to fix the issue.');
            }

        } catch (error) {
            logger.error('Engineer Agent encountered an error:', error as Error);
            throw error;
        }
    }
}
