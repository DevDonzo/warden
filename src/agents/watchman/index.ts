#!/usr/bin/env node
/**
 * The Watchman — Security Scanner Agent
 *
 * CLI entry point for the Watchman agent. Supports both SAST and DAST modes.
 *
 * SAST mode: Scans the current project using the registered scanner chain
 *            (Snyk → npm-audit fallback by default). New scanners can be
 *            added at run time via WatchmanAgent.registerScanner().
 *
 * DAST mode: Runs Nmap and optionally Metasploit against a configured target.
 */

import * as fs from 'fs';
import * as path from 'path';

import { ScanResult } from './snyk';
import { HtmlReportGenerator } from './html-report';
import { NmapScanner } from './nmap';
import { MetasploitScanner } from './metasploit';
import { logger } from '../../utils/logger';
import { getConfig } from '../../utils/config';
import { DastTarget } from '../../types';
import { IScanner, ScannerRegistry, ScannerResult } from '../../scanners/index';
import { SnykScannerAdapter } from '../../scanners/snyk-adapter';
import { NpmAuditScannerAdapter } from '../../scanners/npm-audit-adapter';
import { SCAN_RESULTS_DIR, SCAN_RESULTS_FILE } from '../../constants';

// ─────────────────────────────────────────────────────────────────────────────
// WatchmanAgent
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The WatchmanAgent orchestrates security scanning and report generation.
 *
 * Scanner registration follows the plugin pattern: callers can add any
 * IScanner-compliant implementation via `registerScanner()`. The default
 * constructor registers Snyk (primary) and npm-audit (fallback).
 */
export class WatchmanAgent {
    private registry: ScannerRegistry;

    constructor() {
        this.registry = new ScannerRegistry();

        // Register default scanner chain: Snyk → npm-audit
        this.registry.register(new SnykScannerAdapter());
        this.registry.register(new NpmAuditScannerAdapter());
    }

    /**
     * Register an additional scanner plugin.
     * The scanner will be added to the fallback chain after all previously
     * registered scanners.
     */
    registerScanner(scanner: IScanner): void {
        this.registry.register(scanner);
    }

    /**
     * Run a SAST scan using the registered scanner chain.
     *
     * @param primaryScanner  Optional name of the scanner to try first.
     *                        Pass 'npm-audit' to skip Snyk entirely.
     */
    async runSastScan(primaryScanner?: string): Promise<ScannerResult> {
        return this.registry.scan(primaryScanner);
    }

    /**
     * Run a DAST scan (Nmap + optional Metasploit) against the given target.
     */
    async runDastScan(targetUrl: string | null): Promise<void> {
        logger.header('🔍 DAST Scan Mode - Dynamic Application Security Testing');

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

        // Resolve target
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
            target = dastConfig.targets.find((t) => t.authorized) || null;
            if (!target) {
                logger.error('No authorized targets found in configuration.');
                process.exit(1);
            }
            logger.info(`Using default target: ${target.url}`);
        }

        // Validate DAST configuration
        const validation = configManager.validateDastConfig();
        if (!validation.valid) {
            logger.error('DAST configuration validation failed:');
            validation.errors.forEach((err) => logger.error(`  - ${err}`));
            process.exit(1);
        }

        logger.info(`Target:        ${target.url}`);
        logger.info(`Description:   ${target.description || 'N/A'}`);
        logger.info(`Authorization: ${target.authorized ? '✓ Authorized' : '✗ NOT AUTHORIZED'}`);
        logger.info('');

        const outputDir = 'scan-results/dast';
        let nmapResults: ScanResult | null = null;
        let metasploitResults: ScanResult | null = null;

        // Nmap
        if (dastConfig.nmap.enabled) {
            try {
                logger.info('Starting Nmap scan...');
                const nmapScanner = new NmapScanner(dastConfig.nmap, target, outputDir);
                nmapResults = await nmapScanner.scan();
                logger.success(
                    `Nmap scan completed: ${nmapResults.vulnerabilities.length} findings`
                );
            } catch (error: any) {
                logger.error(`Nmap scan failed: ${error.message}`);
            }
        }

        // Metasploit
        if (dastConfig.metasploit.enabled) {
            try {
                logger.info('Starting Metasploit scan...');
                const msfScanner = new MetasploitScanner(
                    dastConfig.metasploit,
                    target,
                    dastConfig.safety,
                    outputDir
                );
                const nmapVulns = nmapResults?.vulnerabilities as any;
                metasploitResults = await msfScanner.scan(nmapVulns);
                logger.success(
                    `Metasploit scan completed: ${metasploitResults.vulnerabilities.length} findings`
                );
            } catch (error: any) {
                logger.error(`Metasploit scan failed: ${error.message}`);
            }
        }

        // Merge and persist
        const mergedResults = this.mergeDastResults(nmapResults, metasploitResults, target);

        if (!mergedResults) {
            logger.error('No scan results to process.');
            process.exit(2);
        }

        this.saveResults(mergedResults);

        // HTML report
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
        logger.info(`  High:     ${mergedResults.summary.high}`);
        logger.info(`  Medium:   ${mergedResults.summary.medium}`);
        logger.info(`  Low:      ${mergedResults.summary.low}`);

        const criticalCount = mergedResults.summary.critical + mergedResults.summary.high;
        if (criticalCount > 0) {
            logger.warn(`High priority findings detected: ${criticalCount}`);
            process.exit(1);
        } else {
            logger.success('No high priority findings detected.');
            process.exit(0);
        }
    }

    // ─── Private helpers ───────────────────────────────────────────────────────

    private saveResults(result: ScanResult | ScannerResult): void {
        const outputDir = path.resolve(process.cwd(), SCAN_RESULTS_DIR);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const filename = `scan-${new Date().toISOString().replace(/:/g, '-')}.json`;
        const filepath = path.join(outputDir, filename);
        const latestPath = path.join(outputDir, SCAN_RESULTS_FILE);

        const jsonContent = JSON.stringify(result, null, 2);

        fs.writeFileSync(filepath, jsonContent);
        fs.writeFileSync(latestPath, jsonContent);

        logger.info(`Scan results saved to: ${filepath}`);
        logger.info(`Latest results:        ${latestPath}`);
    }

    private mergeDastResults(
        nmapResults: ScanResult | null,
        metasploitResults: ScanResult | null,
        target: DastTarget
    ): ScanResult | null {
        if (!nmapResults && !metasploitResults) return null;

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

        return {
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
                nmapFindings: nmapResults?.vulnerabilities.length || 0,
                metasploitFindings: metasploitResults?.vulnerabilities.length || 0,
            },
        } as ScanResult;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// CLI entry point
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
    logger.header('🛡️  THE WATCHMAN - Security Scanner Agent');

    const args = process.argv.slice(2);
    const options: {
        maxRetries?: number;
        timeoutMs?: number;
        retryDelayMs?: number;
        token?: string;
        scanner?: string;
    } = {};
    let dastMode = false;
    let dastTarget: string | null = null;

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--max-retries':
                options.maxRetries = parseInt(args[++i], 10);
                break;
            case '--timeout':
                options.timeoutMs = parseInt(args[++i], 10) * 1000;
                break;
            case '--retry-delay':
                options.retryDelayMs = parseInt(args[++i], 10);
                break;
            case '--token':
                options.token = args[++i];
                break;
            case '--scanner':
                options.scanner = args[++i];
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
                break;
            default:
                if (args[i].startsWith('--')) {
                    logger.error(`Unknown option: ${args[i]}`);
                    printHelp();
                    process.exit(1);
                }
        }
    }

    const agent = new WatchmanAgent();

    if (dastMode) {
        await agent.runDastScan(dastTarget);
        return;
    }

    // SAST scan
    let results: ScannerResult | null = null;
    let scannerUsed = 'unknown';

    try {
        results = await agent.runSastScan(options.scanner);
        scannerUsed = results.scanner || 'unknown';
    } catch (error: any) {
        logger.error(`All scanners failed: ${error.message}`);
        process.exit(2);
    }

    if (!results) {
        process.exit(2);
        return;
    }

    // Persist results
    const outputDir = path.resolve(process.cwd(), SCAN_RESULTS_DIR);
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    const filename = `scan-${new Date().toISOString().replace(/:/g, '-')}.json`;
    const filepath = path.join(outputDir, filename);
    const latestPath = path.join(outputDir, SCAN_RESULTS_FILE);
    const jsonContent = JSON.stringify(results, null, 2);
    fs.writeFileSync(filepath, jsonContent);
    fs.writeFileSync(latestPath, jsonContent);
    logger.info(`Scan results saved to: ${filepath}`);

    // HTML report
    try {
        const htmlGenerator = new HtmlReportGenerator();
        htmlGenerator.generate(results as unknown as ScanResult);
    } catch (error: any) {
        logger.warn(`Failed to generate HTML report: ${error.message}`);
    }

    logger.success(`Scan completed using [${scannerUsed}]`);

    const criticalCount = results.summary.critical + results.summary.high;
    if (criticalCount > 0) {
        logger.warn(`High priority vulnerabilities found: ${criticalCount}`);
        process.exit(1);
    } else {
        logger.success('No high priority vulnerabilities found.');
        process.exit(0);
    }
}

function printHelp() {
    logger.info(`
Usage: npx ts-node src/agents/watchman/index.ts [options]

SAST Mode Options:
  --max-retries <n>     Maximum number of retry attempts (default: 3)
  --timeout <seconds>   Scan timeout in seconds (default: 300)
  --retry-delay <ms>    Initial retry delay in milliseconds (default: 2000)
  --token <token>       Snyk API token (can also use SNYK_TOKEN env var)
  --scanner <name>      Primary scanner to use: snyk | npm-audit (default: snyk)

DAST Mode Options:
  --dast                Enable DAST mode (Nmap + Metasploit)
  --target <url>        Target URL to scan (must be in .wardenrc.json)

General Options:
  --help                Show this help message

Examples:
  npx ts-node src/agents/watchman/index.ts
  npx ts-node src/agents/watchman/index.ts --scanner npm-audit
  npx ts-node src/agents/watchman/index.ts --dast --target https://staging.example.com

Exit Codes:
  0 - Success, no high priority vulnerabilities
  1 - High priority vulnerabilities found
  2 - Scan failed
`);
}

if (require.main === module) {
    main().catch((err) => {
        logger.error('Fatal error', err);
        process.exit(2);
    });
}

export { main };
