/**
 * DAST Workflow
 *
 * Encapsulates all Dynamic Application Security Testing (DAST) orchestration
 * logic as a dedicated strategy class, implementing the IWorkflow contract.
 *
 * Responsibilities:
 *  - Validate DAST configuration and locate an authorised scan target
 *  - Drive the Nmap scanner for network / port discovery
 *  - Drive the Metasploit scanner for vulnerability validation (optional)
 *  - Merge and summarise findings from both scanners
 *  - Generate a human-readable security advisory in Markdown
 *  - Drive the Diplomat agent to open an advisory Pull Request
 */

import * as fs from 'fs';
import * as path from 'path';

import { IWorkflow } from './index';
import {
    WardenOptions,
    DastTarget,
    DastConfig,
    ScanResult,
    Vulnerability
} from '../types';
import { NmapScanner } from '../agents/watchman/nmap';
import { MetasploitScanner } from '../agents/watchman/metasploit';
import { ProgressReporter } from '../utils/progress';
import { logger } from '../utils/logger';
import { getConfig } from '../utils/config';
import { DAST_OUTPUT_DIR, SECURITY_ADVISORY_FILE } from '../constants';

export class DastWorkflow implements IWorkflow {
    private progress: ProgressReporter;

    constructor() {
        this.progress = new ProgressReporter();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // IWorkflow entry point
    // ─────────────────────────────────────────────────────────────────────────

    async run(options: WardenOptions): Promise<void> {
        logger.header('🔍 DAST Mode - Dynamic Application Security Testing');

        // ── 1. Load & validate DAST configuration ────────────────────────────
        const configManager = getConfig();
        const dastConfig = configManager.getDastConfig();

        if (!dastConfig || !dastConfig.enabled) {
            logger.error(
                'DAST is not enabled. Please configure DAST in .wardenrc.json'
            );
            return;
        }

        // ── 2. Resolve scan target ────────────────────────────────────────────
        const target: DastTarget | null = options.dastTarget
            ? configManager.findDastTarget(options.dastTarget)
            : dastConfig.targets.find(t => t.authorized) || null;

        if (!target) {
            logger.error(
                options.dastTarget
                    ? `Target "${options.dastTarget}" not found in configuration.`
                    : 'No authorized targets found in configuration.'
            );
            return;
        }

        logger.info(`Target: ${target.url}`);
        logger.info(
            `Authorization: ${target.authorized ? '✓ Authorized' : '✗ NOT AUTHORIZED'}`
        );

        // ── 3. Execute scanners ───────────────────────────────────────────────
        let scanResult: ScanResult;

        try {
            scanResult = await this.runDastScan(target, dastConfig);
        } catch (error: any) {
            logger.error('DAST scan failed', error);
            throw error;
        }

        // ── 4. Print consolidated summary ─────────────────────────────────────
        logger.info('');
        logger.header('📊 DAST Scan Summary');
        logger.info(`Total findings:  ${scanResult.summary.total}`);
        logger.info(`  Critical:      ${scanResult.summary.critical}`);
        logger.info(`  High:          ${scanResult.summary.high}`);
        logger.info(`  Medium:        ${scanResult.summary.medium}`);
        logger.info(`  Low:           ${scanResult.summary.low}`);

        // ── 5. Orchestrate advisory PR ────────────────────────────────────────
        await this.orchestrateDastRemediation(scanResult, options);

        logger.header('✅ DAST Session Completed');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Private helpers
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Execute the Nmap and (optionally) Metasploit scanners in sequence,
     * then merge their findings into a single consolidated ScanResult.
     *
     * Nmap failures are fatal; Metasploit failures are logged and skipped so
     * that the workflow can continue with partial results.
     *
     * @param target      Authorised DAST target from the configuration.
     * @param dastConfig  Full DAST configuration block.
     * @returns           Merged ScanResult containing all findings.
     */
    private async runDastScan(
        target: DastTarget,
        dastConfig: DastConfig
    ): Promise<ScanResult> {
        let nmapResults: ScanResult | null = null;
        let metasploitResults: ScanResult | null = null;

        // ── Nmap scan ─────────────────────────────────────────────────────────
        if (dastConfig.nmap.enabled) {
            this.progress.addStep('nmap', 'Nmap Network Scan');
            this.progress.startStep('nmap', 'Running Nmap scan...');

            try {
                const nmapScanner = new NmapScanner(
                    dastConfig.nmap,
                    target,
                    DAST_OUTPUT_DIR
                );
                nmapResults = await nmapScanner.scan();
                this.progress.succeedStep(
                    'nmap',
                    `Nmap scan completed: ${nmapResults.vulnerabilities.length} findings`
                );
            } catch (error: any) {
                this.progress.failStep(
                    'nmap',
                    `Nmap scan failed: ${error.message}`
                );
                // Nmap is the primary scanner — propagate the failure
                throw error;
            }
        }

        // ── Metasploit scan ───────────────────────────────────────────────────
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
                metasploitResults = await msfScanner.scan(
                    nmapResults?.vulnerabilities as any
                );
                this.progress.succeedStep(
                    'metasploit',
                    `Metasploit scan completed: ${metasploitResults.vulnerabilities.length} findings`
                );
            } catch (error: any) {
                // Metasploit is optional — log and continue with Nmap results
                this.progress.failStep(
                    'metasploit',
                    `Metasploit scan failed: ${error.message}`
                );
                logger.warn(
                    `Metasploit scan failed (continuing without it): ${error.message}`
                );
            }
        }

        // ── Merge results ─────────────────────────────────────────────────────
        const vulnerabilities: Vulnerability[] = [
            ...(nmapResults?.vulnerabilities ?? []),
            ...(metasploitResults?.vulnerabilities ?? [])
        ];

        const summary = {
            total: vulnerabilities.length,
            critical: vulnerabilities.filter(v => v.severity === 'critical').length,
            high: vulnerabilities.filter(v => v.severity === 'high').length,
            medium: vulnerabilities.filter(v => v.severity === 'medium').length,
            low: vulnerabilities.filter(v => v.severity === 'low').length
        };

        return {
            timestamp: new Date().toISOString(),
            vulnerabilities,
            summary,
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

    /**
     * Generate a Markdown security advisory from the DAST scan results and,
     * unless running in dry-run mode, write it to disk and open an advisory
     * Pull Request via the Diplomat agent.
     *
     * @param scanResult  Merged DAST scan result.
     * @param options     Top-level Warden run options (dry-run, etc.).
     */
    private async orchestrateDastRemediation(
        scanResult: ScanResult,
        options: WardenOptions
    ): Promise<void> {
        if (scanResult.summary.total === 0) {
            logger.success('No infrastructure vulnerabilities found.');
            return;
        }

        logger.warn(
            `Identified ${scanResult.summary.total} infrastructure finding(s).`
        );

        const advisory = this.generateDastAdvisory(scanResult);

        // Dry-run: preview the advisory without writing anything
        if (options.dryRun) {
            logger.info(
                'DRY RUN MODE: Would create advisory PR with the following content:'
            );
            logger.info(advisory);
            return;
        }

        // Write advisory file to the working directory
        const advisoryPath = path.resolve(
            process.cwd(),
            SECURITY_ADVISORY_FILE
        );
        fs.writeFileSync(advisoryPath, advisory, { encoding: 'utf-8' });
        logger.success(`Security advisory written: ${advisoryPath}`);

        // ── Diplomat Agent ────────────────────────────────────────────────────
        logger.section('🤝 DIPLOMAT AGENT | Creating Advisory Pull Request');

        const { DiplomatAgent } = await import('../agents/diplomat');
        const diplomat = new DiplomatAgent();

        const branchName = `warden/dast-advisory-${Date.now()}`;

        const prUrl = await diplomat.createPullRequest({
            branch: branchName,
            title: '[SECURITY] DAST Infrastructure Security Advisory',
            body: advisory,
            labels: ['security', 'dast', 'infrastructure', 'requires-action']
        });

        if (prUrl) {
            logger.success(`Advisory Pull Request created: ${prUrl}`);
        }
    }

    /**
     * Render a full Markdown security advisory document from the DAST scan
     * results, grouped by severity and annotated with per-finding remediation
     * guidance.
     *
     * @param scanResult  Merged DAST scan result.
     * @returns           Advisory content as a Markdown string.
     */
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

        // Group vulnerabilities by descending severity
        const bySeverity: Record<string, Vulnerability[]> = {
            critical: [],
            high: [],
            medium: [],
            low: []
        };

        for (const vuln of scanResult.vulnerabilities) {
            const bucket = bySeverity[vuln.severity];
            if (bucket) {
                bucket.push(vuln);
            }
        }

        for (const severity of ['critical', 'high', 'medium', 'low'] as const) {
            const vulns = bySeverity[severity];
            if (vulns.length === 0) continue;

            lines.push(
                `### ${severity.toUpperCase()} Severity (${vulns.length})`
            );
            lines.push('');

            for (const vuln of vulns) {
                lines.push(`#### ${vuln.title}`);
                lines.push('');
                lines.push(`- **ID**: \`${vuln.id}\``);

                if (vuln.targetHost) {
                    lines.push(`- **Host**: ${vuln.targetHost}`);
                }
                if (vuln.targetPort !== undefined) {
                    lines.push(`- **Port**: ${vuln.targetPort}`);
                }
                if (vuln.service) {
                    const svcVersion = vuln.serviceVersion
                        ? ` ${vuln.serviceVersion}`
                        : '';
                    lines.push(`- **Service**: ${vuln.service}${svcVersion}`);
                }
                if (vuln.cvssScore !== undefined) {
                    lines.push(`- **CVSS Score**: ${vuln.cvssScore}`);
                }
                if (vuln.exploitAvailable) {
                    lines.push(
                        `- **Exploit Available**: ⚠️  Yes — ${vuln.exploitModule ?? 'unknown module'}`
                    );
                }

                lines.push('');
                lines.push('**Description**:');
                lines.push(vuln.description ?? 'No description available.');
                lines.push('');

                const remediation = this.generateRemediationSteps(vuln);
                lines.push('**Remediation**:');
                lines.push(remediation);
                lines.push('');

                if (vuln.findings && vuln.findings.length > 0) {
                    lines.push('**Technical Details**:');
                    for (const finding of vuln.findings) {
                        lines.push(`- ${finding}`);
                    }
                    lines.push('');
                }

                lines.push('---');
                lines.push('');
            }
        }

        lines.push('## Recommended Actions');
        lines.push('');
        lines.push(
            '1. Review all findings above, prioritising Critical and High severity items'
        );
        lines.push(
            '2. Verify that exposed services are intentional and properly secured'
        );
        lines.push(
            '3. Close unnecessary ports or restrict access using firewall rules'
        );
        lines.push(
            '4. Update all services to the latest versions to patch known vulnerabilities'
        );
        lines.push(
            '5. Implement network segmentation and defence-in-depth strategies'
        );
        lines.push(
            '6. Schedule regular DAST scans to detect new infrastructure vulnerabilities'
        );
        lines.push('');
        lines.push('---');
        lines.push('*Generated by Warden DAST Scanner* 🛡️');

        return lines.join('\n');
    }

    /**
     * Produce context-aware remediation guidance for an individual finding.
     * Guidance is tailored by port number (database, insecure-protocol, HTTP,
     * SSH) and by service name.  A generic fallback is returned when no
     * specific match is found.
     *
     * @param vuln  Individual vulnerability / finding from the DAST scan.
     * @returns     Remediation steps as a Markdown-formatted string.
     */
    private generateRemediationSteps(vuln: Vulnerability): string {
        const steps: string[] = [];

        // ── Port-specific guidance ────────────────────────────────────────────
        if (vuln.targetPort !== undefined) {
            const port = vuln.targetPort;

            // Databases — should never be public-facing
            if ([3306, 5432, 27017, 6379, 9200].includes(port)) {
                steps.push(
                    '- Ensure the database is **not** exposed to the public internet'
                );
                steps.push(
                    '- Use firewall rules to restrict access to trusted IP addresses only'
                );
                steps.push(
                    '- Enable authentication and enforce strong, unique passwords'
                );
                steps.push(
                    '- Use a VPN or SSH tunnel for any required remote access'
                );
            }

            // Legacy / plaintext protocols — disable immediately
            if ([21, 23].includes(port)) {
                steps.push(
                    '- **CRITICAL**: Disable this insecure protocol immediately'
                );
                steps.push(
                    '- Replace with a secure alternative: SSH instead of Telnet, SFTP/FTPS instead of FTP'
                );
                steps.push(
                    '- If removal is not immediately possible, restrict to internal network only'
                );
            }

            // HTTP/S services
            if ([80, 443, 8080, 8443].includes(port)) {
                steps.push(
                    '- Ensure HTTPS is enforced with a valid TLS certificate (disable plain HTTP)'
                );
                steps.push(
                    '- Configure security headers: HSTS, Content-Security-Policy, X-Frame-Options, X-Content-Type-Options'
                );
                steps.push(
                    '- Keep the web server software up to date with security patches'
                );
                steps.push(
                    '- Review application-level controls: authentication, authorisation, and input validation'
                );
            }
        }

        // ── Service-specific guidance ─────────────────────────────────────────
        if (vuln.service) {
            const service = vuln.service.toLowerCase();

            if (service.includes('ssh')) {
                steps.push(
                    '- Disable password-based authentication; use SSH key pairs only'
                );
                steps.push(
                    '- Consider changing the default SSH port if exposed to the internet'
                );
                steps.push(
                    '- Install and configure fail2ban (or equivalent) for brute-force protection'
                );
                steps.push(
                    '- Restrict SSH access via AllowUsers / AllowGroups or firewall rules'
                );
            }

            if (service.includes('mysql') || service.includes('postgres')) {
                steps.push('- Update the database server to the latest patch version');
                steps.push(
                    '- Audit user accounts — remove unnecessary privileges (principle of least privilege)'
                );
                steps.push(
                    '- Enable SSL/TLS encryption for all database connections'
                );
            }

            if (service.includes('http') || service.includes('nginx') || service.includes('apache')) {
                steps.push(
                    '- Run the web server process under a dedicated, unprivileged user account'
                );
                steps.push(
                    '- Disable server version disclosure (ServerTokens, server_tokens off)'
                );
                steps.push(
                    '- Enable a Web Application Firewall (WAF) for additional protection'
                );
            }

            if (service.includes('ftp')) {
                steps.push(
                    '- Migrate to SFTP or FTPS — plain FTP transmits credentials in clear text'
                );
                steps.push(
                    '- If FTP must remain, restrict to explicit FTPS (port 21 with STARTTLS)'
                );
            }
        }

        // ── Exploit-available escalation ──────────────────────────────────────
        if (vuln.exploitAvailable) {
            steps.unshift(
                '- ⚠️  **A known exploit exists for this finding — treat as URGENT**'
            );
            steps.unshift(
                '- Isolate or take the affected service offline until the vulnerability is patched'
            );
        }

        // ── Generic fallback ──────────────────────────────────────────────────
        if (steps.length === 0) {
            return 'Review the service configuration and apply current security best practices.';
        }

        return steps.join('\n');
    }
}
