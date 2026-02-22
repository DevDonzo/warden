import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { GitManager } from './git';
import { logger } from '../../utils/logger';
import { validator } from '../../utils/validator';
import { Vulnerability as DastVulnerability, ScanMode } from '../../types';

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
    scanMode?: ScanMode;
    scanner?: string;
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

        // Check if this is a DAST scan
        if (scanResults.scanMode === 'dast') {
            logger.info('DAST scan detected - generating advisory recommendations');
            return this.generateDastAdvisories(scanResults);
        }

        // SAST mode - traditional auto-fix
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
     * Generate DAST advisory recommendations (no auto-fix)
     */
    private generateDastAdvisories(scanResults: ScanResults): Diagnosis[] {
        logger.info(`Found ${scanResults.summary.total} DAST findings`);

        const dastVulns = scanResults.vulnerabilities as unknown as DastVulnerability[];
        const prioritized = this.prioritizeVulnerabilities(scanResults.vulnerabilities);

        const advisories: Diagnosis[] = prioritized.map((vuln) => {
            const dastVuln = dastVulns.find(v => v.id === vuln.id);

            return {
                vulnerabilityId: vuln.id,
                description: this.formatDastFinding(vuln, dastVuln),
                suggestedFix: this.generateDastRemediation(vuln, dastVuln),
                filesToModify: [] // No auto-fix for DAST
            };
        });

        return advisories;
    }

    /**
     * Format DAST finding for human readability
     */
    private formatDastFinding(vuln: Vulnerability, dastVuln?: DastVulnerability): string {
        let description = `${vuln.title} (${vuln.severity.toUpperCase()})`;

        if (dastVuln?.targetHost) {
            description += `\nHost: ${dastVuln.targetHost}`;
        }

        if (dastVuln?.targetPort) {
            description += `\nPort: ${dastVuln.targetPort}`;
        }

        if (dastVuln?.service) {
            description += `\nService: ${dastVuln.service}`;
            if (dastVuln.serviceVersion) {
                description += ` (${dastVuln.serviceVersion})`;
            }
        }

        description += `\n\n${vuln.description}`;

        if (dastVuln?.findings && dastVuln.findings.length > 0) {
            description += '\n\nTechnical Details:';
            dastVuln.findings.forEach(finding => {
                description += `\n  - ${finding}`;
            });
        }

        return description;
    }

    /**
     * Generate remediation steps for DAST findings
     */
    private generateDastRemediation(_vuln: Vulnerability, dastVuln?: DastVulnerability): string {
        const steps: string[] = [];

        steps.push('**Manual Remediation Required**');
        steps.push('');

        // Port-specific remediation
        if (dastVuln?.targetPort) {
            const port = dastVuln.targetPort;

            // Database ports
            if ([3306, 5432, 27017, 6379, 9200, 9300].includes(port)) {
                steps.push('1. Verify database exposure is intentional');
                steps.push('2. Implement firewall rules to restrict access to trusted IPs');
                steps.push('3. Enable authentication with strong passwords');
                steps.push('4. Use VPN or SSH tunneling for remote access');
                steps.push('5. Update to latest patch version');
            }
            // Insecure protocols
            else if ([21, 23].includes(port)) {
                steps.push('**CRITICAL: Disable this insecure protocol immediately**');
                steps.push('1. Stop the service');
                steps.push('2. Replace with secure alternative (SSH/SFTP)');
                steps.push('3. If required, restrict to internal network only');
            }
            // HTTP services
            else if ([80, 443, 8080, 8443].includes(port)) {
                steps.push('1. Ensure HTTPS is enabled with valid TLS certificate');
                steps.push('2. Configure security headers (HSTS, CSP, X-Frame-Options)');
                steps.push('3. Keep web server software up to date');
                steps.push('4. Review application security controls');
            }
            // Default remediation
            else {
                steps.push('1. Review if this port needs to be exposed');
                steps.push('2. Implement network segmentation');
                steps.push('3. Use firewall rules to restrict access');
                steps.push('4. Update service to latest version');
            }
        }

        // Service-specific remediation
        if (dastVuln?.service) {
            const service = dastVuln.service.toLowerCase();

            if (service.includes('ssh')) {
                steps.push('');
                steps.push('**SSH Hardening:**');
                steps.push('- Disable password authentication');
                steps.push('- Use SSH keys only');
                steps.push('- Implement fail2ban for brute-force protection');
            }
        }

        // Exploit available warning
        if (dastVuln?.exploitAvailable) {
            steps.push('');
            steps.push('⚠️  **EXPLOIT AVAILABLE** - Prioritize remediation');
            if (dastVuln.exploitModule) {
                steps.push(`Module: ${dastVuln.exploitModule}`);
            }
        }

        return steps.join('\n');
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
        let branchName = `warden/fix-${packageName}`;
        
        // Validate and sanitize branch name
        const branchValidation = validator.validateBranchName(branchName);
        if (!branchValidation.valid) {
            logger.warn('Branch name validation failed, sanitizing...');
            branchName = validator.sanitizeBranchName(packageName, 'warden/fix');
            logger.info(`Sanitized branch name: ${branchName}`);
        } else if (branchValidation.warnings.length > 0) {
            // Log warnings but continue
            branchValidation.warnings.forEach(warn => logger.warn(warn));
        }

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
