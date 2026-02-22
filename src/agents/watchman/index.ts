#!/usr/bin/env node
/**
 * The Watchman - Security Scanner Agent
 *
 * This is the entry point for The Watchman agent.
 * It orchestrates the scanning process, handling fallbacks (Snyk -> npm audit)
 * and generating reports (JSON + HTML).
 */

import * as fs from 'fs';
import * as path from 'path';
import { SnykScanner, ScanResult } from './snyk';
import { NpmAuditScanner } from './npm-audit';
import { HtmlReportGenerator } from './html-report';
import { NmapScanner } from './nmap';
import { MetasploitScanner } from './metasploit';
import { logger } from '../../utils/logger';
import { getConfig } from '../../utils/config';
import { DastTarget } from '../../types';

async function main() {
    logger.header('🛡️  THE WATCHMAN - Security Scanner Agent');

    // Parse command line arguments
    const args = process.argv.slice(2);
    const options: any = {};
    let dastMode = false;
    let dastTarget: string | null = null;

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--max-retries':
                options.maxRetries = parseInt(args[++i], 10);
                break;
            case '--timeout':
                options.timeoutMs = parseInt(args[++i], 10) * 1000; // Convert to ms
                break;
            case '--retry-delay':
                options.retryDelayMs = parseInt(args[++i], 10);
                break;
            case '--token':
                options.token = args[++i];
                break;
            case '--dast':
                dastMode = true;
                break;
            case '--target':
                dastTarget = args[++i];
                break;
            case '--help':
                printHelp();
                process.exit(0);
            default:
                if (args[i].startsWith('--')) {
                    logger.error(`Unknown option: ${args[i]}`);
                    printHelp();
                    process.exit(1);
                }
        }
    }

    // If DAST mode, run DAST scan
    if (dastMode) {
        await runDastScan(dastTarget);
        return;
    }

    let results: ScanResult | null = null;
    let scannerUsed = 'snyk';

    // 1. Try Snyk Scanner
    try {
        const snykScanner = new SnykScanner(options);
        results = await snykScanner.test();
        // SnykScanner saves JSON internally
    } catch (snykError: any) {
        logger.warn(`Snyk scan failed: ${snykError.message}`);
        logger.info('Switching to fallback scanner: npm audit');

        // 2. Fallback to npm audit
        try {
            const auditScanner = new NpmAuditScanner();
            results = await auditScanner.scan();
            scannerUsed = 'npm-audit';

            // Save JSON explicitly for npm audit (as it's just a simple class rn)
            saveResults(results);
        } catch (auditError: any) {
            logger.error('All scanners failed!');
            logger.error(`Snyk: ${snykError.message}`);
            logger.error(`npm audit: ${auditError.message}`);
            process.exit(2);
        }
    }

    if (!results) {
        // Should not happen due to process.exit(2) above
        process.exit(2);
        return;
    }

    // 3. Generate Dashboard
    try {
        const htmlGenerator = new HtmlReportGenerator();
        htmlGenerator.generate(results);
    } catch (reportError: any) {
        logger.warn(`Failed to generate HTML report: ${reportError.message}`);
        // Non-fatal, continue to exit code check
    }

    logger.success(`Scan completed successfully using [${scannerUsed}]`);

    // Exit with appropriate code
    const criticalCount = results.summary.critical + results.summary.high;
    if (criticalCount > 0) {
        logger.warn(`High priority vulnerabilities found: ${criticalCount}`);
        process.exit(1);
    } else {
        logger.success('No high priority vulnerabilities found.');
        process.exit(0);
    }
}

function saveResults(result: ScanResult): void {
    const outputDir = path.resolve(process.cwd(), 'scan-results');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const filename = `scan-${new Date().toISOString().replace(/:/g, '-')}.json`;
    const filepath = path.join(outputDir, filename);
    const latestPath = path.join(outputDir, 'scan-results.json');

    const jsonContent = JSON.stringify(result, null, 2);

    fs.writeFileSync(filepath, jsonContent);
    fs.writeFileSync(latestPath, jsonContent);

    logger.info(`Scan results saved to: ${filepath}`);
    logger.info(`Latest results: ${latestPath}`);
}

/**
 * Run DAST scan (Nmap + Metasploit)
 */
async function runDastScan(targetUrl: string | null): Promise<void> {
    logger.header('🔍 DAST Scan Mode - Dynamic Application Security Testing');

    // Load configuration
    const configManager = getConfig();
    const dastConfig = configManager.getDastConfig();

    if (!dastConfig) {
        logger.error('DAST is not configured. Please add "dast" section to .wardenrc.json');
        process.exit(1);
    }

    if (!dastConfig.enabled) {
        logger.error('DAST is disabled in configuration. Set "dast.enabled: true" to enable.');
        process.exit(1);
    }

    // Determine target
    let target: DastTarget | null = null;

    if (targetUrl) {
        target = configManager.findDastTarget(targetUrl);
        if (!target) {
            logger.error(`Target ${targetUrl} not found in configuration.`);
            logger.info('Available targets:');
            dastConfig.targets.forEach((t) =>
                logger.info(`  - ${t.url} (${t.authorized ? 'authorized' : 'NOT AUTHORIZED'})`)
            );
            process.exit(1);
        }
    } else {
        // Use first authorized target
        target = dastConfig.targets.find((t) => t.authorized) || null;
        if (!target) {
            logger.error('No authorized targets found in configuration.');
            process.exit(1);
        }
        logger.info(`Using default target: ${target.url}`);
    }

    // Validate DAST config
    const validation = configManager.validateDastConfig();
    if (!validation.valid) {
        logger.error('DAST configuration validation failed:');
        validation.errors.forEach((err) => logger.error(`  - ${err}`));
        process.exit(1);
    }

    logger.info(`Target: ${target.url}`);
    logger.info(`Description: ${target.description || 'N/A'}`);
    logger.info(`Authorization: ${target.authorized ? '✓ Authorized' : '✗ NOT AUTHORIZED'}`);
    logger.info('');

    const outputDir = 'scan-results/dast';
    let nmapResults: ScanResult | null = null;
    let metasploitResults: ScanResult | null = null;

    // Run Nmap scan
    if (dastConfig.nmap.enabled) {
        try {
            logger.info('Starting Nmap scan...');
            const nmapScanner = new NmapScanner(dastConfig.nmap, target, outputDir);
            nmapResults = await nmapScanner.scan();
            logger.success(`Nmap scan completed: ${nmapResults.vulnerabilities.length} findings`);
        } catch (error: any) {
            logger.error(`Nmap scan failed: ${error.message}`);
        }
    }

    // Run Metasploit scan
    if (dastConfig.metasploit.enabled) {
        try {
            logger.info('Starting Metasploit scan...');
            const msfScanner = new MetasploitScanner(
                dastConfig.metasploit,
                target,
                dastConfig.safety,
                outputDir
            );
            const nmapVulns = nmapResults?.vulnerabilities as DastTarget[] | undefined;
            metasploitResults = await msfScanner.scan(nmapVulns as any);
            logger.success(
                `Metasploit scan completed: ${metasploitResults.vulnerabilities.length} findings`
            );
        } catch (error: any) {
            logger.error(`Metasploit scan failed: ${error.message}`);
        }
    }

    // Merge results
    const mergedResults = mergeDastResults(nmapResults, metasploitResults, target);

    if (!mergedResults) {
        logger.error('No scan results to process.');
        process.exit(2);
    }

    // Save results
    saveResults(mergedResults);

    // Generate HTML report
    try {
        const htmlGenerator = new HtmlReportGenerator();
        htmlGenerator.generate(mergedResults);
        logger.success('HTML report generated successfully');
    } catch (error: any) {
        logger.warn(`Failed to generate HTML report: ${error.message}`);
    }

    // Summary
    logger.info('');
    logger.header('📊 DAST Scan Summary');
    logger.info(`Total findings: ${mergedResults.summary.total}`);
    logger.info(`  Critical: ${mergedResults.summary.critical}`);
    logger.info(`  High: ${mergedResults.summary.high}`);
    logger.info(`  Medium: ${mergedResults.summary.medium}`);
    logger.info(`  Low: ${mergedResults.summary.low}`);

    // Exit with appropriate code
    const criticalCount = mergedResults.summary.critical + mergedResults.summary.high;
    if (criticalCount > 0) {
        logger.warn(`High priority findings detected: ${criticalCount}`);
        process.exit(1);
    } else {
        logger.success('No high priority findings detected.');
        process.exit(0);
    }
}

/**
 * Merge DAST results from multiple scanners
 */
function mergeDastResults(
    nmapResults: ScanResult | null,
    metasploitResults: ScanResult | null,
    target: DastTarget
): ScanResult | null {
    if (!nmapResults && !metasploitResults) {
        return null;
    }

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

    const result: any = {
        timestamp: new Date().toISOString(),
        vulnerabilities,
        summary,
        scanner: 'nmap',
        projectPath: target.url,
        scanMode: 'dast',
        scanMetadata: {
            target: target.url,
            scanType: 'dast',
            nmapEnabled: !!nmapResults,
            metasploitEnabled: !!metasploitResults,
            nmapFindings: nmapResults?.vulnerabilities.length || 0,
            metasploitFindings: metasploitResults?.vulnerabilities.length || 0,
        },
    };
    return result;
}

function printHelp() {
    logger.info(`
Usage: npx ts-node src/agents/watchman/index.ts [options]

SAST Mode Options:
  --max-retries <n>     Maximum number of retry attempts (default: 3)
  --timeout <seconds>   Scan timeout in seconds (default: 300)
  --retry-delay <ms>    Initial retry delay in milliseconds (default: 2000)
  --token <token>       Snyk API token (can also use SNYK_TOKEN env var)

DAST Mode Options:
  --dast                Enable DAST mode (Nmap + Metasploit)
  --target <url>        Target URL to scan (must be in .wardenrc.json)

General Options:
  --help                Show this help message

Examples:
  # Run SAST scan with defaults
  npx ts-node src/agents/watchman/index.ts

  # Run SAST scan with custom timeout
  npx ts-node src/agents/watchman/index.ts --timeout 600

  # Run DAST scan on configured target
  npx ts-node src/agents/watchman/index.ts --dast --target https://staging.example.com

  # Run DAST scan on first authorized target
  npx ts-node src/agents/watchman/index.ts --dast

Exit Codes:
  0 - Success, no high priority vulnerabilities
  1 - Success, but high priority vulnerabilities found
  2 - Scan failed
`);
}

// Run if called directly
if (require.main === module) {
    main();
}

export { main };
