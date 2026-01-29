import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { loadRules } from './core/rules';
import { loadSpecs } from './core/spec';
import { SnykScanner } from './agents/watchman/snyk';
import { logger } from './utils/logger';
import ora from 'ora';

const WORKSPACES_DIR = 'workspaces';

export interface WardenOptions {
    targetPath: string;
    repository?: string;
    dryRun: boolean;
    scanner: 'snyk' | 'npm-audit' | 'all';
    minSeverity: 'low' | 'medium' | 'high' | 'critical';
    maxFixes: number;
    verbose: boolean;
}

/**
 * Prepare workspace for remote repository scanning
 */
async function prepareWorkspace(repoUrl: string): Promise<string> {
    const spinner = ora('Preparing workspace...').start();

    try {
        const repoName = repoUrl.split('/').pop()?.replace('.git', '') || 'target-repo';
        const workspacePath = path.resolve(process.cwd(), WORKSPACES_DIR, repoName);

        if (fs.existsSync(workspacePath)) {
            spinner.text = `Updating ${repoName}...`;
            logger.debug(`Workspace for ${repoName} already exists. Pulling latest changes...`);
            execSync(`git -C ${workspacePath} pull`, { stdio: 'pipe' });
        } else {
            spinner.text = `Cloning ${repoName}...`;
            logger.debug(`Cloning ${repoUrl} into workspaces/${repoName}...`);
            fs.mkdirSync(path.dirname(workspacePath), { recursive: true });
            execSync(`git clone ${repoUrl} ${workspacePath}`, { stdio: 'pipe' });
        }

        spinner.succeed(`Workspace ready: ${workspacePath}`);
        return workspacePath;
    } catch (error: any) {
        spinner.fail('Failed to prepare workspace');
        throw error;
    }
}

/**
 * Orchestrate the fix process
 */
async function orchestrateFix(
    scanResult: any,
    options: WardenOptions
): Promise<void> {
    const snyk = new SnykScanner();
    const highPriority = snyk.filterHighPriority(scanResult);

    if (highPriority.length === 0) {
        logger.success('Clean Audit: No high-priority vulnerabilities identified.');
        return;
    }

    logger.warn(`Identified ${highPriority.length} high-priority vulnerabilities.`);

    // Limit fixes based on maxFixes option
    const fixCount = Math.min(highPriority.length, options.maxFixes);
    logger.info(`Will attempt to fix ${fixCount} vulnerability(ies)`);

    // --- THE ENGINEER ---
    logger.section('🔧 ENGINEER AGENT | Diagnosing & Patching');
    const { EngineerAgent } = await import('./agents/engineer');
    const engineer = new EngineerAgent();

    const resultsPath = path.resolve(process.cwd(), 'scan-results/scan-results.json');
    const diagnoses = await engineer.diagnose(resultsPath);

    if (diagnoses.length === 0) {
        logger.warn('No actionable diagnoses generated.');
        return;
    }

    const topIssue = diagnoses[0];

    if (options.dryRun) {
        logger.info('DRY RUN MODE: Would apply the following fix:');
        logger.info(`  Vulnerability: ${topIssue.vulnerabilityId}`);
        logger.info(`  Description: ${topIssue.description}`);
        logger.info(`  Fix: ${topIssue.suggestedFix}`);
        logger.info(`  Files: ${topIssue.filesToModify.join(', ')}`);
        return;
    }

    const fixSuccess = await engineer.applyFix(topIssue);

    if (!fixSuccess) {
        logger.error('Failed to apply fix. Aborting PR creation.');
        return;
    }

    // --- THE DIPLOMAT ---
    logger.section('🤝 DIPLOMAT AGENT | Opening Pull Request');
    const { DiplomatAgent } = await import('./agents/diplomat');
    const diplomat = new DiplomatAgent();

    const pkgName = topIssue.description.match(/in ([a-z0-9-]+)@/)?.[1] || 'unknown';
    const branchName = `warden/fix-${pkgName}`;

    const prUrl = await diplomat.createPullRequest({
        branch: branchName,
        title: `[SECURITY] Fix for ${topIssue.vulnerabilityId}`,
        body: `## 🛡️ Automated Security Fix\n\n${topIssue.description}\n\n**Remediation**: ${topIssue.suggestedFix}\n\n---\n*Verified by Warden Patching Engine* ✅`
    });

    if (prUrl) {
        logger.success(`Pull Request created: ${prUrl}`);
    }
}

/**
 * Main orchestration function
 */
export async function runWarden(options: WardenOptions): Promise<void> {
    const originalCwd = process.cwd();

    try {
        // 1. Load Core Configuration
        logger.section('📋 Loading Configuration');
        loadRules(); // Validate rules are available
        const specs = loadSpecs();

        if (specs.length === 0) {
            logger.warn('No active specifications found in /SPEC. Continuing with default behavior.');
        } else {
            logger.info(`Loaded ${specs.length} specification(s)`);
        }

        // 2. Handle Remote Repository
        if (options.repository) {
            const workspace = await prepareWorkspace(options.repository);
            process.chdir(workspace);
            logger.info(`Working directory: ${process.cwd()}`);
        }

        // 3. Run Security Scan
        logger.section('🔍 WATCHMAN AGENT | Security Scan');
        const spinner = ora('Running security scan...').start();

        const snyk = new SnykScanner();

        try {
            const scanResult = await snyk.test();
            spinner.succeed('Security scan completed');

            snyk.printSummary(scanResult);

            // 4. Orchestrate Fixes
            await orchestrateFix(scanResult, options);

            logger.header('✅ Patrol Session Completed Successfully');

        } catch (scanError: any) {
            spinner.fail('Security scan failed');
            logger.error('Scanner execution failed', scanError);

            // Fallback to demo mode for local repos
            if (!options.repository) {
                logger.warn('Falling back to DEMO MODE with mock data...');

                const { generateMockScanResult } = await import('./utils/mock-data');
                const scanResult = generateMockScanResult();

                const outputDir = path.resolve(originalCwd, 'scan-results');
                if (!fs.existsSync(outputDir)) {
                    fs.mkdirSync(outputDir, { recursive: true });
                }
                fs.writeFileSync(
                    path.join(outputDir, 'scan-results.json'),
                    JSON.stringify(scanResult, null, 2)
                );

                snyk.printSummary(scanResult);
                await orchestrateFix(scanResult, options);

                logger.header('✅ Session Completed (Demo Mode)');
            } else {
                throw scanError;
            }
        }

    } catch (error: any) {
        logger.error('Critical system error', error);
        throw error;
    } finally {
        // Always return to original directory
        process.chdir(originalCwd);
    }
}
