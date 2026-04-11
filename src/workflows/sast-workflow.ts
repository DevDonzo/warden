/**
 * SAST Workflow
 *
 * Encapsulates all Static Application Security Testing (SAST) orchestration
 * logic as a dedicated strategy class, implementing the IWorkflow contract.
 *
 * Responsibilities:
 *  - Clone / update remote workspaces (when --repo is supplied)
 *  - Run the appropriate scanner (Snyk → npm-audit fallback)
 *  - Drive the Engineer agent to diagnose and patch vulnerabilities
 *  - Drive the Diplomat agent to open a Pull Request with the fix
 *  - Fall back to DEMO MODE with mock data when all scanners fail locally
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

import { IWorkflow } from './index';
import { WardenOptions } from '../types';
import { SnykScanner, ScanResult } from '../agents/watchman/snyk';
import { NpmAuditScanner } from '../agents/watchman/npm-audit';
import { ProgressReporter } from '../utils/progress';
import { logger } from '../utils/logger';
import { getConfig } from '../utils/config';
import { WORKSPACES_DIR, SCAN_RESULTS_DIR, SCAN_RESULTS_FILE } from '../constants';

export class SastWorkflow implements IWorkflow {
    private progress: ProgressReporter;

    constructor() {
        const verbose = getConfig().get('logging').level === 'debug';
        this.progress = new ProgressReporter(verbose);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // IWorkflow entry point
    // ─────────────────────────────────────────────────────────────────────────

    async run(options: WardenOptions): Promise<void> {
        const originalCwd = process.cwd();

        try {
            // ── 1. Prepare workspace (remote repo mode) ───────────────────────
            if (options.repository) {
                const workspace = await this.prepareWorkspace(options.repository);
                process.chdir(workspace);
                logger.info(`Working directory: ${process.cwd()}`);
            }

            // ── 2. Run security scan ──────────────────────────────────────────
            this.progress.addStep('scan', 'Security Scan');
            this.progress.startStep('scan', 'Running security scan...');

            const snykUtils = new SnykScanner();

            try {
                const scanResult = await this.runSecurityScan(options);
                this.progress.succeedStep('scan', 'Security scan completed');

                snykUtils.printSummary(scanResult);

                // ── 3. Orchestrate fix ────────────────────────────────────────
                await this.orchestrateFix(scanResult, options);

                logger.header('✅ Patrol Session Completed Successfully');
            } catch (scanError: any) {
                this.progress.failStep('scan', 'Security scan failed');
                logger.error('Scanner execution failed', scanError);

                // Only fall back to demo mode for local repos when ALL scanners fail
                if (!options.repository) {
                    logger.warn('All scanners failed. Falling back to DEMO MODE with mock data...');

                    const { MockScanner } = await import('../scanners/mock-scanner');
                    const mockScanner = new MockScanner();
                    const scanResult = await mockScanner.scan();

                    // Persist mock results so the Engineer agent can read them
                    const outputDir = path.resolve(process.cwd(), SCAN_RESULTS_DIR);
                    if (!fs.existsSync(outputDir)) {
                        fs.mkdirSync(outputDir, { recursive: true });
                    }
                    fs.writeFileSync(
                        path.join(outputDir, SCAN_RESULTS_FILE),
                        JSON.stringify(scanResult, null, 2)
                    );

                    snykUtils.printSummary(scanResult as any);
                    await this.orchestrateFix(scanResult as any, options);

                    logger.header('✅ Session Completed (Demo Mode)');
                } else {
                    // Remote repo scans must not silently degrade
                    throw scanError;
                }
            }
        } finally {
            // Always restore the original working directory
            process.chdir(originalCwd);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Private helpers
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Clone a remote repository into the local workspaces directory, or pull
     * the latest changes if the workspace already exists.
     *
     * @param repoUrl  Full git URL (https or ssh) of the target repository.
     * @returns        Absolute path to the ready workspace directory.
     */
    private async prepareWorkspace(repoUrl: string): Promise<string> {
        this.progress.addStep('workspace', 'Prepare Workspace');
        this.progress.startStep('workspace', 'Preparing workspace...');

        try {
            const repoName = repoUrl.split('/').pop()?.replace('.git', '') || 'target-repo';
            const workspacePath = path.resolve(process.cwd(), WORKSPACES_DIR, repoName);

            if (fs.existsSync(workspacePath)) {
                this.progress.updateStep('workspace', `Updating ${repoName}...`);
                logger.debug(`Workspace for ${repoName} already exists. Pulling latest changes...`);
                execSync(`git -C ${workspacePath} pull`, { stdio: 'pipe' });
            } else {
                this.progress.updateStep('workspace', `Cloning ${repoName}...`);
                logger.debug(`Cloning ${repoUrl} into workspaces/${repoName}...`);
                fs.mkdirSync(path.dirname(workspacePath), { recursive: true });
                execSync(`git clone ${repoUrl} ${workspacePath}`, {
                    stdio: 'pipe',
                });
            }

            this.progress.succeedStep('workspace', `Workspace ready: ${workspacePath}`);
            return workspacePath;
        } catch (error: any) {
            this.progress.failStep('workspace', 'Failed to prepare workspace');
            throw error;
        }
    }

    /**
     * Run the appropriate security scanner, with an automatic fallback chain:
     *   npm-audit (explicit) → done
     *   snyk | all           → try snyk → fall back to npm-audit on failure
     *   default              → try snyk → fall back to npm-audit on failure
     *
     * @throws When every scanner in the chain fails.
     */
    private async runSecurityScan(options: WardenOptions): Promise<ScanResult> {
        const snykScanner = new SnykScanner();
        const npmAuditScanner = new NpmAuditScanner();

        // Explicit npm-audit request — no fallback needed
        if (options.scanner === 'npm-audit') {
            logger.info('Using npm-audit scanner (user specified)');
            return await npmAuditScanner.scan();
        }

        // Snyk (or all) — try Snyk first, fall through to npm-audit
        if (options.scanner === 'snyk' || options.scanner === 'all') {
            try {
                return await snykScanner.test();
            } catch (snykError: any) {
                logger.warn(`Snyk scan failed: ${snykError.message}`);
                logger.info('Falling back to npm-audit scanner...');

                try {
                    const result = await npmAuditScanner.scan();
                    logger.success('npm-audit fallback scan completed');
                    return result;
                } catch (npmError: any) {
                    logger.error(`npm-audit fallback also failed: ${npmError.message}`);
                    throw new Error('All scanners failed. Please check your environment.');
                }
            }
        }

        // Default path: Snyk with npm-audit fallback
        try {
            return await snykScanner.test();
        } catch {
            return await npmAuditScanner.scan();
        }
    }

    /**
     * Drive the Engineer agent to diagnose the top vulnerability and apply a
     * fix, then ask the Diplomat agent to open a Pull Request.
     *
     * In dry-run mode the proposed fix is logged but nothing is changed on disk
     * or in the remote repository.
     */
    private async orchestrateFix(scanResult: any, options: WardenOptions): Promise<void> {
        const snyk = new SnykScanner();
        const highPriority = snyk.filterHighPriority(scanResult);

        if (highPriority.length === 0) {
            logger.success('Clean Audit: No high-priority vulnerabilities identified.');
            return;
        }

        logger.warn(`Identified ${highPriority.length} high-priority vulnerabilities.`);

        const fixCount = Math.min(highPriority.length, options.maxFixes);
        logger.info(`Will attempt to fix ${fixCount} vulnerability(ies)`);

        // ── Engineer Agent ────────────────────────────────────────────────────
        logger.section('🔧 ENGINEER AGENT | Diagnosing & Patching');

        const { EngineerAgent } = await import('../agents/engineer');
        const engineer = new EngineerAgent();

        const resultsPath = path.resolve(process.cwd(), SCAN_RESULTS_DIR, SCAN_RESULTS_FILE);
        const diagnoses = await engineer.diagnose(resultsPath);

        if (diagnoses.length === 0) {
            logger.warn('No actionable diagnoses generated.');
            return;
        }

        const topIssue = diagnoses[0];

        // Dry-run: report the proposed fix without making any changes
        if (options.dryRun) {
            logger.info('DRY RUN MODE: Would apply the following fix:');
            logger.info(`  Vulnerability: ${topIssue.vulnerabilityId}`);
            logger.info(`  Description:   ${topIssue.description}`);
            logger.info(`  Fix:           ${topIssue.suggestedFix}`);
            logger.info(`  Files:         ${topIssue.filesToModify.join(', ')}`);
            return;
        }

        const fixSuccess = await engineer.applyFix(topIssue);

        if (!fixSuccess) {
            logger.error('Failed to apply fix. Aborting PR creation.');
            return;
        }

        // ── Diplomat Agent ────────────────────────────────────────────────────
        logger.section('🤝 DIPLOMAT AGENT | Opening Pull Request');

        const { DiplomatAgent } = await import('../agents/diplomat');
        const diplomat = new DiplomatAgent();

        const pkgName = topIssue.description.match(/in ([a-z0-9-]+)@/)?.[1] || 'unknown';
        const branchName = `warden/fix-${pkgName}`;

        const prUrl = await diplomat.createPullRequest({
            branch: branchName,
            title: `[SECURITY] Fix for ${topIssue.vulnerabilityId}`,
            body: [
                '## 🛡️ Automated Security Fix',
                '',
                topIssue.description,
                '',
                `**Remediation**: ${topIssue.suggestedFix}`,
                '',
                '---',
                '*Verified by Warden Patching Engine* ✅',
            ].join('\n'),
        });

        if (prUrl) {
            logger.success(`Pull Request created: ${prUrl}`);
        }
    }
}
