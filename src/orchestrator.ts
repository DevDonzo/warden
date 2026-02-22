import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { loadRules } from './core/rules';
import { loadSpecs } from './core/spec';
import { SnykScanner, ScanResult } from './agents/watchman/snyk';
import { NpmAuditScanner } from './agents/watchman/npm-audit';
import { NmapScanner } from './agents/watchman/nmap';
import { MetasploitScanner } from './agents/watchman/metasploit';
import { logger } from './utils/logger';
import { getConfig } from './utils/config';
import { Vulnerability, DastTarget, ScanMode } from './types';
import ora from 'ora';

const WORKSPACES_DIR = 'workspaces';

/**
 * Run security scan with the specified scanner, with fallback support
 */
async function runSecurityScan(options: WardenOptions): Promise<ScanResult> {
    const snykScanner = new SnykScanner();
    const npmAuditScanner = new NpmAuditScanner();

    // If user explicitly requested npm-audit, use it directly
    if (options.scanner === 'npm-audit') {
        logger.info('Using npm-audit scanner (user specified)');
        return await npmAuditScanner.scan();
    }

    // If user requested snyk or all, try snyk first
    if (options.scanner === 'snyk' || options.scanner === 'all') {
        try {
            return await snykScanner.test();
        } catch (snykError: any) {
            logger.warn(`Snyk scan failed: ${snykError.message}`);

            // Fall back to npm-audit
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

    // Default: try snyk with npm-audit fallback
    try {
        return await snykScanner.test();
    } catch {
        return await npmAuditScanner.scan();
    }
}

export interface WardenOptions {
    targetPath: string;
    repository?: string;
    dryRun: boolean;
    scanner: 'snyk' | 'npm-audit' | 'all';
    minSeverity: 'low' | 'medium' | 'high' | 'critical';
    maxFixes: number;
    verbose: boolean;
    scanMode?: ScanMode;
    dastTarget?: string;
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
async function orchestrateFix(scanResult: any, options: WardenOptions): Promise<void> {
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
        body: `## 🛡️ Automated Security Fix\n\n${topIssue.description}\n\n**Remediation**: ${topIssue.suggestedFix}\n\n---\n*Verified by Warden Patching Engine* ✅`,
    });

    if (prUrl) {
        logger.success(`Pull Request created: ${prUrl}`);
    }
}

/**
 * Run DAST workflow
 */
async function runDastWorkflow(target: DastTarget): Promise<ScanResult> {
    const configManager = getConfig();
    const dastConfig = configManager.getDastConfig();

    if (!dastConfig) {
        throw new Error('DAST configuration not found');
    }

    const outputDir = 'scan-results/dast';
    let nmapResults: ScanResult | null = null;
    let metasploitResults: ScanResult | null = null;

    // Run Nmap scan
    if (dastConfig.nmap.enabled) {
        const spinner = ora('Running Nmap scan...').start();
        try {
            const nmapScanner = new NmapScanner(dastConfig.nmap, target, outputDir);
            nmapResults = await nmapScanner.scan();
            spinner.succeed(`Nmap scan completed: ${nmapResults.vulnerabilities.length} findings`);
        } catch (error: any) {
            spinner.fail(`Nmap scan failed: ${error.message}`);
            throw error;
        }
    }

    // Run Metasploit scan
    if (dastConfig.metasploit.enabled) {
        const spinner = ora('Running Metasploit scan...').start();
        try {
            const msfScanner = new MetasploitScanner(
                dastConfig.metasploit,
                target,
                dastConfig.safety,
                outputDir
            );
            metasploitResults = await msfScanner.scan(nmapResults?.vulnerabilities as any);
            spinner.succeed(
                `Metasploit scan completed: ${metasploitResults.vulnerabilities.length} findings`
            );
        } catch (error: any) {
            spinner.fail(`Metasploit scan failed: ${error.message}`);
        }
    }

    // Merge results
    const vulnerabilities = [
        ...(nmapResults?.vulnerabilities || []),
        ...(metasploitResults?.vulnerabilities || []),
    ];

    const summary = {
        total: vulnerabilities.length,
        critical: vulnerabilities.filter((v) => v.severity === 'critical').length,
        high: vulnerabilities.filter((v) => v.severity === 'high').length,
        medium: vulnerabilities.filter((v) => v.severity === 'medium').length,
        low: vulnerabilities.filter((v) => v.severity === 'low').length,
    };

    const result: ScanResult = {
        timestamp: new Date().toISOString(),
        vulnerabilities,
        summary,
        scanner: 'nmap',
        projectPath: target.url,
        scanMode: 'dast',
        metadata: {
            target: target.url,
            scanType: 'dast',
            nmapEnabled: !!nmapResults,
            metasploitEnabled: !!metasploitResults,
        },
    };
    return result;
}

/**
 * Orchestrate DAST remediation (advisory PR instead of auto-fix)
 */
async function orchestrateDastRemediation(
    scanResult: ScanResult,
    options: WardenOptions
): Promise<void> {
    if (scanResult.summary.total === 0) {
        logger.success('No infrastructure vulnerabilities found.');
        return;
    }

    logger.warn(`Identified ${scanResult.summary.total} infrastructure findings.`);

    // Generate advisory content
    const advisory = generateDastAdvisory(scanResult);

    if (options.dryRun) {
        logger.info('DRY RUN MODE: Would create advisory PR with the following content:');
        logger.info(advisory);
        return;
    }

    // Create advisory file
    const advisoryPath = path.resolve(process.cwd(), 'SECURITY-ADVISORY.md');
    fs.writeFileSync(advisoryPath, advisory);
    logger.success(`Security advisory created: ${advisoryPath}`);

    // Create PR with advisory
    logger.section('🤝 DIPLOMAT AGENT | Creating Advisory Pull Request');
    const { DiplomatAgent } = await import('./agents/diplomat');
    const diplomat = new DiplomatAgent();

    const branchName = `warden/dast-advisory-${Date.now()}`;
    const prUrl = await diplomat.createPullRequest({
        branch: branchName,
        title: `[SECURITY] DAST Infrastructure Security Advisory`,
        body: advisory,
        labels: ['security', 'dast', 'infrastructure', 'requires-action'],
    });

    if (prUrl) {
        logger.success(`Advisory Pull Request created: ${prUrl}`);
    }
}

/**
 * Generate DAST security advisory content
 */
function generateDastAdvisory(scanResult: ScanResult): string {
    const lines: string[] = [
        '# DAST Security Advisory',
        '',
        `**Scan Date**: ${new Date(scanResult.timestamp).toLocaleString()}`,
        `**Target**: ${scanResult.projectPath || 'N/A'}`,
        `**Scanner**: ${scanResult.scanner || 'nmap'}`,
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
        '',
    ];

    // Group by severity
    const bySeverity: Record<string, any[]> = {
        critical: [],
        high: [],
        medium: [],
        low: [],
    };

    scanResult.vulnerabilities.forEach((vuln: any) => {
        bySeverity[vuln.severity].push(vuln);
    });

    for (const severity of ['critical', 'high', 'medium', 'low']) {
        const vulns = bySeverity[severity];
        if (vulns.length === 0) continue;

        lines.push(`### ${severity.toUpperCase()} Severity (${vulns.length})`);
        lines.push('');

        vulns.forEach((vuln) => {
            lines.push(`#### ${vuln.title}`);
            lines.push('');
            lines.push(`- **ID**: ${vuln.id}`);
            if (vuln.targetHost) lines.push(`- **Host**: ${vuln.targetHost}`);
            if (vuln.targetPort) lines.push(`- **Port**: ${vuln.targetPort}`);
            if (vuln.service)
                lines.push(`- **Service**: ${vuln.service} ${vuln.serviceVersion || ''}`);
            if (vuln.cvssScore) lines.push(`- **CVSS Score**: ${vuln.cvssScore}`);
            lines.push('');
            lines.push('**Description**:');
            lines.push(vuln.description);
            lines.push('');

            // Add remediation steps
            const remediation = generateRemediationSteps(vuln);
            if (remediation) {
                lines.push('**Remediation**:');
                lines.push(remediation);
                lines.push('');
            }

            if (vuln.findings && vuln.findings.length > 0) {
                lines.push('**Technical Details**:');
                vuln.findings.forEach((finding: string) => {
                    lines.push(`- ${finding}`);
                });
                lines.push('');
            }

            lines.push('---');
            lines.push('');
        });
    }

    lines.push('## Recommended Actions');
    lines.push('');
    lines.push('1. Review all findings above, prioritizing Critical and High severity items');
    lines.push('2. Verify that exposed services are intentional and properly secured');
    lines.push('3. Close unnecessary ports or restrict access using firewall rules');
    lines.push('4. Update services to latest versions to patch known vulnerabilities');
    lines.push('5. Implement network segmentation and defense-in-depth strategies');
    lines.push('6. Schedule regular DAST scans to detect new infrastructure vulnerabilities');
    lines.push('');
    lines.push('---');
    lines.push('*Generated by Warden DAST Scanner* 🛡️');

    return lines.join('\n');
}

/**
 * Generate context-specific remediation steps
 */
function generateRemediationSteps(vuln: Vulnerability): string {
    const steps: string[] = [];

    // Port-specific remediation
    if (vuln.targetPort) {
        const port = vuln.targetPort;

        // Database ports
        if ([3306, 5432, 27017, 6379, 9200].includes(port)) {
            steps.push('- Ensure database is not exposed to the public internet');
            steps.push('- Use firewall rules to restrict access to trusted IPs only');
            steps.push('- Enable authentication and use strong passwords');
            steps.push('- Consider using VPN or SSH tunneling for remote access');
        }

        // Telnet, FTP (insecure protocols)
        if ([21, 23].includes(port)) {
            steps.push('- **CRITICAL**: Disable this insecure protocol immediately');
            steps.push(`- Replace with secure alternative (SSH for telnet, SFTP/FTPS for FTP)`);
            steps.push('- If absolutely necessary, restrict to internal network only');
        }

        // HTTP services
        if ([80, 443, 8080, 8443].includes(port)) {
            steps.push('- Ensure HTTPS is enabled with valid TLS certificate');
            steps.push('- Configure security headers (HSTS, CSP, X-Frame-Options)');
            steps.push('- Keep web server software up to date');
            steps.push(
                '- Review application-level security (authentication, authorization, input validation)'
            );
        }
    }

    // Service-specific remediation
    if (vuln.service) {
        const service = vuln.service.toLowerCase();

        if (service.includes('ssh')) {
            steps.push('- Disable password authentication, use SSH keys only');
            steps.push('- Change default SSH port if exposed to internet');
            steps.push('- Implement fail2ban or similar brute-force protection');
        }

        if (service.includes('mysql') || service.includes('postgres')) {
            steps.push('- Update to latest patch version');
            steps.push('- Review user permissions and remove unnecessary privileges');
            steps.push('- Enable SSL/TLS for database connections');
        }
    }

    return steps.length > 0
        ? steps.join('\n')
        : 'Review service configuration and apply security best practices.';
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
            logger.warn(
                'No active specifications found in /SPEC. Continuing with default behavior.'
            );
        } else {
            logger.info(`Loaded ${specs.length} specification(s)`);
        }

        // Check if DAST mode
        if (options.scanMode === 'dast') {
            logger.header('🔍 DAST Mode - Dynamic Application Security Testing');

            // Load DAST configuration
            const configManager = getConfig();
            const dastConfig = configManager.getDastConfig();

            if (!dastConfig || !dastConfig.enabled) {
                logger.error('DAST is not enabled. Please configure DAST in .wardenrc.json');
                return;
            }

            // Find target
            const targetUrl = options.dastTarget;
            let target: DastTarget | null = null;

            if (targetUrl) {
                target = configManager.findDastTarget(targetUrl);
                if (!target) {
                    logger.error(`Target ${targetUrl} not found in configuration.`);
                    return;
                }
            } else {
                target = dastConfig.targets.find((t) => t.authorized) || null;
                if (!target) {
                    logger.error('No authorized targets found in configuration.');
                    return;
                }
            }

            logger.info(`Target: ${target.url}`);
            logger.info(
                `Authorization: ${target.authorized ? '✓ Authorized' : '✗ NOT AUTHORIZED'}`
            );

            // Run DAST workflow
            const scanResult = await runDastWorkflow(target);

            // Print summary
            logger.info('');
            logger.header('📊 DAST Scan Summary');
            logger.info(`Total findings: ${scanResult.summary.total}`);
            logger.info(`  Critical: ${scanResult.summary.critical}`);
            logger.info(`  High: ${scanResult.summary.high}`);
            logger.info(`  Medium: ${scanResult.summary.medium}`);
            logger.info(`  Low: ${scanResult.summary.low}`);

            // Orchestrate remediation (advisory PR)
            await orchestrateDastRemediation(scanResult, options);

            logger.header('✅ DAST Session Completed');
            return;
        }

        // 2. Handle Remote Repository (SAST mode only)
        if (options.repository) {
            const workspace = await prepareWorkspace(options.repository);
            process.chdir(workspace);
            logger.info(`Working directory: ${process.cwd()}`);
        }

        // 3. Run Security Scan (SAST mode)
        logger.section('🔍 WATCHMAN AGENT | Security Scan');
        const spinner = ora('Running security scan...').start();

        const snykForUtils = new SnykScanner();

        try {
            const scanResult = await runSecurityScan(options);
            spinner.succeed('Security scan completed');

            snykForUtils.printSummary(scanResult);

            // 4. Orchestrate Fixes
            await orchestrateFix(scanResult, options);

            logger.header('✅ Patrol Session Completed Successfully');
        } catch (scanError: any) {
            spinner.fail('Security scan failed');
            logger.error('Scanner execution failed', scanError);

            // Only fall back to demo mode for local repos when ALL scanners fail
            if (!options.repository) {
                logger.warn('All scanners failed. Falling back to DEMO MODE with mock data...');

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

                snykForUtils.printSummary(scanResult);
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
