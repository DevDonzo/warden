/**
 * DAST Workflow
 *
 * Encapsulates all Dynamic Application Security Testing (DAST) orchestration
 * logic as a dedicated strategy class.
 */

import * as fs from 'fs';
import * as path from 'path';

import { IWorkflow } from './index';
import {
    DastConfig,
    DastTarget,
    ScanResult,
    Vulnerability,
    WardenOptions,
    WardenRunResult
} from '../types';
import { NmapScanner } from '../agents/watchman/nmap';
import { MetasploitScanner } from '../agents/watchman/metasploit';
import { ProgressReporter } from '../utils/progress';
import { logger } from '../utils/logger';
import { getConfig } from '../utils/config';
import { DAST_BRANCH_PREFIX, DAST_OUTPUT_DIR, SECURITY_ADVISORY_FILE } from '../constants';
import { GitManager } from '../agents/engineer/git';

type DastRemediationSummary = Pick<
    WardenRunResult,
    'branches' | 'pullRequestUrls' | 'advisoryPath' | 'warnings'
>;

export class DastWorkflow implements IWorkflow {
    private progress: ProgressReporter;

    constructor() {
        this.progress = new ProgressReporter();
    }

    async run(options: WardenOptions): Promise<WardenRunResult> {
        logger.header('🔍 DAST Mode - Dynamic Application Security Testing');

        const result: WardenRunResult = {
            mode: 'dast',
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

        const configManager = getConfig();
        const dastConfig = configManager.getDastConfig();

        if (!dastConfig || !dastConfig.enabled) {
            logger.error('DAST is not enabled. Please configure DAST in .wardenrc.json');
            return result;
        }

        const target: DastTarget | null = options.dastTarget
            ? configManager.findDastTarget(options.dastTarget)
            : dastConfig.targets.find(candidate => candidate.authorized) || null;

        if (!target) {
            logger.error(
                options.dastTarget
                    ? `Target "${options.dastTarget}" not found in configuration.`
                    : 'No authorized targets found in configuration.'
            );
            return result;
        }

        logger.info(`Target: ${target.url}`);
        logger.info(`Authorization: ${target.authorized ? '✓ Authorized' : '✗ NOT AUTHORIZED'}`);

        let scanResult: ScanResult;

        try {
            scanResult = await this.runDastScan(target, dastConfig);
        } catch (error: any) {
            logger.error('DAST scan failed', error);
            throw error;
        }

        result.scanResult = scanResult;
        result.selectedVulnerabilityIds = scanResult.vulnerabilities.map(vulnerability => vulnerability.id);
        result.attemptedFixes = scanResult.summary.total;

        logger.info('');
        logger.header('📊 DAST Scan Summary');
        logger.info(`Total findings:  ${scanResult.summary.total}`);
        logger.info(`  Critical:      ${scanResult.summary.critical}`);
        logger.info(`  High:          ${scanResult.summary.high}`);
        logger.info(`  Medium:        ${scanResult.summary.medium}`);
        logger.info(`  Low:           ${scanResult.summary.low}`);

        const remediationSummary = await this.orchestrateDastRemediation(scanResult, options);
        Object.assign(result, remediationSummary);

        logger.header('✅ DAST Session Completed');
        return result;
    }

    private async runDastScan(target: DastTarget, dastConfig: DastConfig): Promise<ScanResult> {
        let nmapResults: ScanResult | null = null;
        let metasploitResults: ScanResult | null = null;

        if (dastConfig.nmap.enabled) {
            this.progress.addStep('nmap', 'Nmap Network Scan');
            this.progress.startStep('nmap', 'Running Nmap scan...');

            try {
                const nmapScanner = new NmapScanner(dastConfig.nmap, target, DAST_OUTPUT_DIR);
                nmapResults = await nmapScanner.scan();
                this.progress.succeedStep(
                    'nmap',
                    `Nmap scan completed: ${nmapResults.vulnerabilities.length} findings`
                );
            } catch (error: any) {
                this.progress.failStep('nmap', `Nmap scan failed: ${error.message}`);
                throw error;
            }
        }

        if (dastConfig.metasploit.enabled) {
            this.progress.addStep('metasploit', 'Metasploit Validation Scan');
            this.progress.startStep('metasploit', 'Running Metasploit scan...');

            try {
                const msfScanner = new MetasploitScanner(
                    dastConfig.metasploit,
                    target,
                    dastConfig.safety,
                    DAST_OUTPUT_DIR
                );
                metasploitResults = await msfScanner.scan(nmapResults?.vulnerabilities as any);
                this.progress.succeedStep(
                    'metasploit',
                    `Metasploit scan completed: ${metasploitResults.vulnerabilities.length} findings`
                );
            } catch (error: any) {
                this.progress.failStep('metasploit', `Metasploit scan failed: ${error.message}`);
                logger.warn(`Metasploit scan failed (continuing without it): ${error.message}`);
            }
        }

        const vulnerabilities: Vulnerability[] = [
            ...(nmapResults?.vulnerabilities ?? []),
            ...(metasploitResults?.vulnerabilities ?? [])
        ];

        return {
            timestamp: new Date().toISOString(),
            vulnerabilities,
            summary: {
                total: vulnerabilities.length,
                critical: vulnerabilities.filter(vulnerability => vulnerability.severity === 'critical').length,
                high: vulnerabilities.filter(vulnerability => vulnerability.severity === 'high').length,
                medium: vulnerabilities.filter(vulnerability => vulnerability.severity === 'medium').length,
                low: vulnerabilities.filter(vulnerability => vulnerability.severity === 'low').length
            },
            scanner: 'nmap',
            projectPath: target.url,
            scanMode: 'dast',
            scanMetadata: {
                target: target.url,
                scanType: 'dast',
                nmapEnabled: nmapResults !== null,
                metasploitEnabled: metasploitResults !== null
            }
        };
    }

    private async orchestrateDastRemediation(
        scanResult: ScanResult,
        options: WardenOptions
    ): Promise<DastRemediationSummary> {
        if (scanResult.summary.total === 0) {
            logger.success('No infrastructure vulnerabilities found.');
            return {
                branches: [],
                pullRequestUrls: [],
                advisoryPath: undefined,
                warnings: []
            };
        }

        logger.warn(`Identified ${scanResult.summary.total} infrastructure finding(s).`);
        const advisory = this.generateDastAdvisory(scanResult);

        if (options.dryRun) {
            logger.info('DRY RUN MODE: Would create advisory PR with the following content:');
            logger.info(advisory);
            return {
                branches: [],
                pullRequestUrls: [],
                advisoryPath: undefined,
                warnings: []
            };
        }

        const git = new GitManager();
        const warnings: string[] = [];

        if (await git.hasUncommittedChanges()) {
            warnings.push('Skipped DAST PR creation because the repository has uncommitted changes.');
            const advisoryPath = path.resolve(process.cwd(), SECURITY_ADVISORY_FILE);
            fs.writeFileSync(advisoryPath, advisory, { encoding: 'utf-8' });
            logger.success(`Security advisory written: ${advisoryPath}`);
            return {
                branches: [],
                pullRequestUrls: [],
                advisoryPath,
                warnings
            };
        }

        const advisoryPath = path.resolve(process.cwd(), SECURITY_ADVISORY_FILE);
        fs.writeFileSync(advisoryPath, advisory, { encoding: 'utf-8' });
        logger.success(`Security advisory written: ${advisoryPath}`);

        if (!process.env.GITHUB_TOKEN) {
            warnings.push('Skipped DAST PR creation because GITHUB_TOKEN is not set.');
            return {
                branches: [],
                pullRequestUrls: [],
                advisoryPath,
                warnings
            };
        }

        logger.section('🤝 DIPLOMAT AGENT | Creating Advisory Pull Request');

        const branchName = `${DAST_BRANCH_PREFIX}-${Date.now()}`;
        await git.checkoutBranch(branchName);
        await git.stageAll();
        await git.commit('docs(security): add DAST advisory');

        const { DiplomatAgent } = await import('../agents/diplomat');
        const diplomat = new DiplomatAgent();
        const pushed = await diplomat.pushBranch(branchName);

        if (!pushed) {
            warnings.push(`Branch push failed for ${branchName}; DAST PR was not created.`);
            return {
                branches: [branchName],
                pullRequestUrls: [],
                advisoryPath,
                warnings
            };
        }

        const prUrl = await diplomat.createPullRequest({
            branch: branchName,
            title: '[SECURITY] DAST Infrastructure Security Advisory',
            body: advisory,
            labels: ['security', 'dast', 'infrastructure', 'requires-action']
        });

        logger.success(`Advisory Pull Request created: ${prUrl}`);

        return {
            branches: [branchName],
            pullRequestUrls: [prUrl],
            advisoryPath,
            warnings
        };
    }

    private generateDastAdvisory(scanResult: ScanResult): string {
        const lines: string[] = [
            '# DAST Security Advisory',
            '',
            `**Scan Date**: ${new Date(scanResult.timestamp).toLocaleString()}`,
            `**Target**: ${scanResult.projectPath ?? 'N/A'}`,
            `**Scanner**: ${scanResult.scanner ?? 'nmap'}`,
            '',
            '## Summary',
            '',
            `- **Total Findings**: ${scanResult.summary.total}`,
            `- **Critical**: ${scanResult.summary.critical}`,
            `- **High**: ${scanResult.summary.high}`,
            `- **Medium**: ${scanResult.summary.medium}`,
            `- **Low**: ${scanResult.summary.low}`,
            '',
            '## Findings',
            ''
        ];

        const bySeverity: Record<string, Vulnerability[]> = {
            critical: [],
            high: [],
            medium: [],
            low: []
        };

        for (const vulnerability of scanResult.vulnerabilities) {
            bySeverity[vulnerability.severity]?.push(vulnerability);
        }

        for (const severity of ['critical', 'high', 'medium', 'low'] as const) {
            const vulnerabilities = bySeverity[severity];
            if (vulnerabilities.length === 0) {
                continue;
            }

            lines.push(`### ${severity.toUpperCase()} Severity (${vulnerabilities.length})`, '');

            for (const vulnerability of vulnerabilities) {
                lines.push(`#### ${vulnerability.title}`, '');
                lines.push(`- **ID**: ${vulnerability.id}`);
                if (vulnerability.targetHost) lines.push(`- **Host**: ${vulnerability.targetHost}`);
                if (vulnerability.targetPort) lines.push(`- **Port**: ${vulnerability.targetPort}`);
                if (vulnerability.service) lines.push(`- **Service**: ${vulnerability.service}`);
                lines.push(`- **Description**: ${vulnerability.description}`);
                lines.push('');
            }
        }

        return lines.join('\n');
    }
}
