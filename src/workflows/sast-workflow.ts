/**
 * SAST Workflow
 *
 * Encapsulates all Static Application Security Testing (SAST) orchestration
 * logic as a dedicated strategy class, implementing the IWorkflow contract.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

import { IWorkflow } from './index';
import { Diagnosis, ScanResult, Severity, WardenOptions, WardenRunResult } from '../types';
import { SnykScanner } from '../agents/watchman/snyk';
import { NpmAuditScanner } from '../agents/watchman/npm-audit';
import { ProgressReporter } from '../utils/progress';
import { logger } from '../utils/logger';
import { getConfig } from '../utils/config';
import { DEFAULT_BRANCH_PREFIX, SCAN_RESULTS_DIR, SCAN_RESULTS_FILE, WORKSPACES_DIR } from '../constants';
import { selectVulnerabilitiesForFix } from '../utils/scan-results';
import { validator } from '../utils/validator';

type SastFixSummary = Pick<
    WardenRunResult,
    'selectedVulnerabilityIds' | 'attemptedFixes' | 'appliedFixes' | 'branches' | 'pullRequestUrls' | 'warnings'
>;

export class SastWorkflow implements IWorkflow {
    private progress: ProgressReporter;

    constructor() {
        const verbose = getConfig().get('logging').level === 'debug';
        this.progress = new ProgressReporter(verbose);
    }

    async run(options: WardenOptions): Promise<WardenRunResult> {
        const originalCwd = process.cwd();
        const result: WardenRunResult = {
            mode: 'sast',
            targetPath: options.targetPath,
            repository: options.repository,
            dryRun: options.dryRun,
            scanResult: undefined,
            selectedVulnerabilityIds: [],
            attemptedFixes: 0,
            appliedFixes: 0,
            branches: [],
            pullRequestUrls: [],
            advisoryPath: undefined,
            warnings: []
        };

        try {
            if (options.repository) {
                const workspace = await this.prepareWorkspace(options.repository);
                process.chdir(workspace);
                result.targetPath = workspace;
                logger.info(`Working directory: ${process.cwd()}`);
            }

            this.progress.addStep('scan', 'Security Scan');
            this.progress.startStep('scan', 'Running security scan...');

            const snykUtils = new SnykScanner();

            try {
                const scanResult = await this.runSecurityScan(options);
                result.scanResult = scanResult;
                this.progress.succeedStep('scan', 'Security scan completed');
                snykUtils.printSummary(scanResult as any);

                const fixSummary = await this.orchestrateFix(scanResult, options);
                Object.assign(result, fixSummary);

                logger.header('✅ Patrol Session Completed Successfully');
            } catch (scanError: any) {
                this.progress.failStep('scan', 'Security scan failed');
                logger.error('Scanner execution failed', scanError);

                if (options.repository) {
                    throw scanError;
                }

                logger.warn('All scanners failed. Falling back to DEMO MODE with mock data...');

                const { MockScanner } = await import('../scanners/mock-scanner');
                const mockScanner = new MockScanner();
                const scanResult = await mockScanner.scan();
                result.scanResult = scanResult as any;
                result.warnings.push('All configured scanners failed; demo mode used mock data.');

                const outputDir = path.resolve(process.cwd(), SCAN_RESULTS_DIR);
                if (!fs.existsSync(outputDir)) {
                    fs.mkdirSync(outputDir, { recursive: true });
                }
                fs.writeFileSync(
                    path.join(outputDir, SCAN_RESULTS_FILE),
                    JSON.stringify(scanResult, null, 2)
                );

                snykUtils.printSummary(scanResult as any);
                const fixSummary = await this.orchestrateFix(scanResult as any, options);
                Object.assign(result, fixSummary);

                logger.header('✅ Session Completed (Demo Mode)');
            }
        } finally {
            process.chdir(originalCwd);
        }

        return result;
    }

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
                execSync(`git clone ${repoUrl} ${workspacePath}`, { stdio: 'pipe' });
            }

            this.progress.succeedStep('workspace', `Workspace ready: ${workspacePath}`);
            return workspacePath;
        } catch (error: any) {
            this.progress.failStep('workspace', 'Failed to prepare workspace');
            throw error;
        }
    }

    private async runSecurityScan(options: WardenOptions): Promise<ScanResult> {
        const snykScanner = new SnykScanner();
        const npmAuditScanner = new NpmAuditScanner();

        if (options.scanner === 'npm-audit') {
            logger.info('Using npm-audit scanner (user specified)');
            return npmAuditScanner.scan() as unknown as Promise<ScanResult>;
        }

        if (options.scanner === 'snyk' || options.scanner === 'all') {
            try {
                return await (snykScanner.test() as unknown as Promise<ScanResult>);
            } catch (snykError: any) {
                logger.warn(`Snyk scan failed: ${snykError.message}`);
                logger.info('Falling back to npm-audit scanner...');

                try {
                    const result = await (npmAuditScanner.scan() as unknown as Promise<ScanResult>);
                    logger.success('npm-audit fallback scan completed');
                    return result;
                } catch (npmError: any) {
                    logger.error(`npm-audit fallback also failed: ${npmError.message}`);
                    throw new Error('All scanners failed. Please check your environment.');
                }
            }
        }

        try {
            return await (snykScanner.test() as unknown as Promise<ScanResult>);
        } catch {
            return npmAuditScanner.scan() as unknown as Promise<ScanResult>;
        }
    }

    private async orchestrateFix(scanResult: ScanResult, options: WardenOptions): Promise<SastFixSummary> {
        const selected = selectVulnerabilitiesForFix(
            scanResult.vulnerabilities,
            options.minSeverity as Severity,
            options.maxFixes
        );

        if (selected.length === 0) {
            logger.success(`No vulnerabilities met the minimum severity threshold (${options.minSeverity}).`);
            return {
                selectedVulnerabilityIds: [],
                attemptedFixes: 0,
                appliedFixes: 0,
                branches: [],
                pullRequestUrls: [],
                warnings: []
            };
        }

        logger.warn(
            `Selected ${selected.length} vulnerability(ies) at or above ${options.minSeverity} severity.`
        );

        logger.section('🔧 ENGINEER AGENT | Diagnosing & Patching');

        const { EngineerAgent } = await import('../agents/engineer');
        const { DiplomatAgent } = await import('../agents/diplomat');
        const engineer = new EngineerAgent();
        const diplomat = new DiplomatAgent();
        const warnings: string[] = [];
        const branches: string[] = [];
        const pullRequestUrls: string[] = [];

        const resultsPath = path.resolve(process.cwd(), SCAN_RESULTS_DIR, SCAN_RESULTS_FILE);
        const diagnoses = await engineer.diagnose(resultsPath);
        const diagnosisById = new Map<string, Diagnosis>(
            diagnoses.map((diagnosis: Diagnosis) => [diagnosis.vulnerabilityId, diagnosis])
        );
        const actionableDiagnoses = selected
            .map(vulnerability => diagnosisById.get(vulnerability.id))
            .filter((diagnosis): diagnosis is Diagnosis => Boolean(diagnosis));

        if (actionableDiagnoses.length === 0) {
            logger.warn('No actionable diagnoses generated.');
            return {
                selectedVulnerabilityIds: selected.map(vulnerability => vulnerability.id),
                attemptedFixes: 0,
                appliedFixes: 0,
                branches: [],
                pullRequestUrls: [],
                warnings: ['Selected vulnerabilities could not be mapped to actionable diagnoses.']
            };
        }

        if (options.dryRun) {
            logger.info('DRY RUN MODE: Would apply the following fixes:');
            actionableDiagnoses.forEach((diagnosis, index) => {
                logger.info(`  ${index + 1}. Vulnerability: ${diagnosis.vulnerabilityId}`);
                logger.info(`     Description: ${diagnosis.description}`);
                logger.info(`     Fix:         ${diagnosis.suggestedFix}`);
                logger.info(`     Files:       ${diagnosis.filesToModify.join(', ') || 'None'}`);
            });

            return {
                selectedVulnerabilityIds: selected.map(vulnerability => vulnerability.id),
                attemptedFixes: actionableDiagnoses.length,
                appliedFixes: 0,
                branches: [],
                pullRequestUrls: [],
                warnings: []
            };
        }

        let appliedFixes = 0;

        for (const diagnosis of actionableDiagnoses) {
            const fixSuccess = await engineer.applyFix(diagnosis);
            if (!fixSuccess) {
                warnings.push(`Failed to apply fix for ${diagnosis.vulnerabilityId}.`);
                continue;
            }

            appliedFixes++;
            const branchName = diagnosis.fixInstruction
                ? validator.sanitizeBranchName(diagnosis.fixInstruction.packageName, DEFAULT_BRANCH_PREFIX)
                : `${DEFAULT_BRANCH_PREFIX}-${diagnosis.vulnerabilityId.toLowerCase()}`;
            branches.push(branchName);

            if (!process.env.GITHUB_TOKEN) {
                warnings.push(`Skipped PR creation for ${diagnosis.vulnerabilityId}: GITHUB_TOKEN is not set.`);
                continue;
            }

            logger.section('🤝 DIPLOMAT AGENT | Opening Pull Request');
            const pushed = await diplomat.pushBranch(branchName);

            if (!pushed) {
                warnings.push(`Branch push failed for ${branchName}; PR was not created.`);
                continue;
            }

            try {
                const matched = selected.find(vulnerability => vulnerability.id === diagnosis.vulnerabilityId);
                const prUrl = await diplomat.createPullRequest({
                    branch: branchName,
                    title: diplomat.generatePrTitle(branchName, diagnosis.vulnerabilityId),
                    body: diplomat.generatePrBody(
                        diagnosis.vulnerabilityId,
                        matched?.severity,
                        diagnosis.description
                    ),
                    severity: matched?.severity
                });
                pullRequestUrls.push(prUrl);
                logger.success(`Pull Request created: ${prUrl}`);
            } catch (error: any) {
                warnings.push(`PR creation failed for ${branchName}: ${error.message}`);
            }
        }

        return {
            selectedVulnerabilityIds: selected.map(vulnerability => vulnerability.id),
            attemptedFixes: actionableDiagnoses.length,
            appliedFixes,
            branches,
            pullRequestUrls,
            warnings
        };
    }
}
