#!/usr/bin/env node

import { Command } from 'commander';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { logger } from './utils/logger';
import { validator } from './utils/validator';

// Load environment variables
dotenv.config();

// Read version from package.json
const packageJsonPath = path.resolve(__dirname, '../package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
const version = packageJson.version;

const program = new Command();

program
    .name('warden')
    .description('Warden - Autonomous SRE & Security Orchestration Agent')
    .version(version);

program
    .command('scan')
    .description('Scan a repository for security vulnerabilities')
    .argument('[repository]', 'GitHub repository URL or local path (default: current directory)')
    .option('-v, --verbose', 'Enable verbose logging')
    .option('-q, --quiet', 'Suppress non-essential output')
    .option('--json', 'Output results as JSON')
    .option('--dry-run', 'Preview changes without creating branches or PRs')
    .option('--skip-validation', 'Skip pre-flight validation checks')
    .option('--scanner <type>', 'Scanner to use: snyk, npm-audit, or all', 'snyk')
    .option('--severity <level>', 'Minimum severity to fix: low, medium, high, critical', 'high')
    .option('--max-fixes <number>', 'Maximum number of fixes to apply', '1')
    .action(async (repository, options) => {
        try {
            // Set verbose mode
            if (options.verbose) {
                logger.setVerbose(true);
                logger.debug('Verbose mode enabled');
            }

            // Set quiet mode
            if (options.quiet) {
                logger.setQuiet(true);
            }

            if (options.json && !options.verbose) {
                logger.setQuiet(true);
            }

            if (!options.json) {
                logger.header('🛡️  WARDEN | Autonomous Security Orchestrator');
            }

            // Determine target path
            let targetPath = process.cwd();
            let isRemote = false;
            let sanitizedRepo: string | undefined;

            if (repository) {
                if (repository.startsWith('http') || repository.includes('github.com')) {
                    isRemote = true;
                    
                    // Validate and sanitize repository URL
                    const repoValidation = validator.validateRepositoryUrl(repository);
                    if (!repoValidation.valid) {
                        logger.error('Invalid repository URL');
                        validator.printValidationResults(repoValidation);
                        process.exit(1);
                    }
                    
                    const sanitized = validator.sanitizeRepositoryUrl(repository);
                    if (!sanitized) {
                        logger.error(`Failed to sanitize repository URL: ${repository}`);
                        process.exit(1);
                    }
                    
                    sanitizedRepo = sanitized;
                    logger.info(`Target: Remote repository ${sanitizedRepo}`);
                } else {
                    targetPath = path.resolve(repository);
                    logger.info(`Target: Local path ${targetPath}`);
                }
            } else {
                logger.info(`Target: Current directory ${targetPath}`);
            }

            // Validation
            if (!options.skipValidation) {
                logger.section('🔍 Pre-flight Validation');
                const validationResult = validator.validateAll(targetPath);
                validator.printValidationResults(validationResult);

                if (!validationResult.valid) {
                    logger.error('Validation failed. Fix the errors above or use --skip-validation to proceed anyway.');
                    process.exit(1);
                }
            }

            // Import and run the main orchestrator
            const { runWarden } = await import('./orchestrator');
            const result = await runWarden({
                targetPath,
                repository: isRemote ? sanitizedRepo : undefined,
                dryRun: options.dryRun || false,
                scanner: options.scanner,
                minSeverity: options.severity,
                maxFixes: parseInt(options.maxFixes, 10),
                verbose: options.verbose || false
            });

            if (options.json) {
                console.log(JSON.stringify(result, null, 2));
            } else {
                if (result.remediationPlan) {
                    logger.section('🧠 Agentic Assessment');
                    logger.info(`Posture: ${result.remediationPlan.posture}`);
                    logger.info(`Risk Score: ${result.remediationPlan.riskScore}/100`);
                    logger.info(result.remediationPlan.summary);
                }

                if (result.history) {
                    logger.section('📈 Trend');
                    logger.info(`Trend: ${result.history.trend}`);
                }

                if (result.reportPaths?.markdown || result.reportPaths?.html) {
                    logger.section('📝 Reports');
                    if (result.reportPaths.markdown) {
                        logger.info(`Markdown: ${result.reportPaths.markdown}`);
                    }
                    if (result.reportPaths.html) {
                        logger.info(`HTML: ${result.reportPaths.html}`);
                    }
                }
            }

        } catch (error: any) {
            logger.error('Fatal error during scan', error);
            process.exit(1);
        }
    });

program
    .command('validate')
    .description('Validate environment and dependencies without running a scan')
    .option('-v, --verbose', 'Enable verbose logging')
    .action((options) => {
        if (options.verbose) {
            logger.setVerbose(true);
        }

        logger.header('🔍 Validation Check');
        const result = validator.validateAll();
        validator.printValidationResults(result);

        if (result.valid) {
            logger.success('Environment is ready for Warden!');
            process.exit(0);
        } else {
            logger.error('Environment validation failed. Please fix the errors above.');
            process.exit(1);
        }
    });

program
    .command('setup')
    .description('Interactive setup wizard for first-time configuration')
    .action(async () => {
        logger.header('⚙️  Warden Setup Wizard');
        const { runSetup } = await import('./setup');
        await runSetup();
    });

program
    .command('init')
    .description('Initialize Warden in the current repository')
    .action(async () => {
        logger.header('🚀 Initializing Warden');
        const { initializeWarden } = await import('./setup');
        await initializeWarden();
    });

program
    .command('config')
    .description('Manage configuration')
    .option('--show', 'Show current configuration')
    .option('--create', 'Create default configuration file')
    .option('--validate', 'Validate configuration file')
    .option('--path <path>', 'Path to configuration file')
    .action(async (options) => {
        const { ConfigManager } = await import('./utils/config');

        if (options.create) {
            try {
                ConfigManager.createDefault(options.path || '.wardenrc.json');
                logger.success('Configuration file created successfully!');
            } catch (error: any) {
                logger.error('Failed to create configuration', error);
                process.exit(1);
            }
        } else if (options.validate) {
            const config = new ConfigManager(options.path);
            const result = config.validate();

            if (result.valid) {
                logger.success('Configuration is valid!');
            } else {
                logger.error('Configuration validation failed:');
                result.errors.forEach(err => logger.error(`  - ${err}`));
                process.exit(1);
            }
        } else if (options.show) {
            const config = new ConfigManager(options.path);
            config.print();
        } else {
            logger.info('Use --show, --create, or --validate');
            logger.info('Example: warden config --create');
        }
    });

program
    .command('status')
    .description('Show Warden status and recent scan history')
    .action(async () => {
        logger.header('📊 Warden Status');
        
        // Check for scan results
        const fs = await import('fs');
        const path = await import('path');
        const scanResultsPath = path.join(process.cwd(), 'scan-results');
        
        if (fs.existsSync(scanResultsPath)) {
            const files = fs.readdirSync(scanResultsPath)
                .filter(f => f.endsWith('.json'))
                .sort()
                .reverse()
                .slice(0, 5);
            
            if (files.length > 0) {
                logger.section('Recent Scans');
                for (const file of files) {
                    try {
                        const data = JSON.parse(
                            fs.readFileSync(path.join(scanResultsPath, file), 'utf-8')
                        );
                        const date = new Date(data.timestamp || file).toLocaleDateString();
                        const vulns = data.summary?.total ?? data.vulnerabilities?.length ?? 0;
                        logger.info(`  ${file}: ${vulns} vulnerabilities (${date})`);
                    } catch {
                        logger.info(`  ${file}: Unable to parse`);
                    }
                }
            } else {
                logger.info('No scan history found.');
            }
        } else {
            logger.info('No scan results directory found. Run "warden scan" first.');
        }
        
        // Check configuration
        logger.section('Configuration');
        const configPath = path.join(process.cwd(), '.wardenrc.json');
        if (fs.existsSync(configPath)) {
            logger.success('  .wardenrc.json found');
        } else {
            logger.warn('  No .wardenrc.json (using defaults)');
        }
        
        // Check environment
        logger.section('Environment');
        logger.info(`  GITHUB_TOKEN: ${process.env.GITHUB_TOKEN ? '✓ Set' : '✗ Not set'}`);
        logger.info(`  SNYK_TOKEN: ${process.env.SNYK_TOKEN ? '✓ Set' : '✗ Not set'}`);
    });

program
    .command('clean')
    .description('Remove generated files (scan-results, logs)')
    .option('--all', 'Also remove .wardenrc.json')
    .option('--dry-run', 'Show what would be deleted without deleting')
    .action(async (options) => {
        logger.header('🧹 Cleaning Generated Files');
        
        const fs = await import('fs');
        const path = await import('path');
        
        const dirsToClean = ['scan-results', 'logs'];
        const filesToClean = options.all ? ['.wardenrc.json'] : [];
        
        let cleaned = 0;
        
        for (const dir of dirsToClean) {
            const dirPath = path.join(process.cwd(), dir);
            if (fs.existsSync(dirPath)) {
                if (options.dryRun) {
                    logger.info(`Would delete: ${dir}/`);
                } else {
                    fs.rmSync(dirPath, { recursive: true });
                    logger.success(`Deleted: ${dir}/`);
                }
                cleaned++;
            }
        }
        
        for (const file of filesToClean) {
            const filePath = path.join(process.cwd(), file);
            if (fs.existsSync(filePath)) {
                if (options.dryRun) {
                    logger.info(`Would delete: ${file}`);
                } else {
                    fs.rmSync(filePath);
                    logger.success(`Deleted: ${file}`);
                }
                cleaned++;
            }
        }
        
        if (cleaned === 0) {
            logger.info('Nothing to clean.');
        } else if (options.dryRun) {
            logger.info(`Would delete ${cleaned} item(s). Run without --dry-run to delete.`);
        } else {
            logger.success(`Cleaned ${cleaned} item(s).`);
        }
    });

program
    .command('doctor')
    .description('Diagnose common issues and suggest fixes')
    .action(async () => {
        logger.header('🩺 Warden Doctor');
        
        const { execSync } = await import('child_process');
        const fs = await import('fs');
        const path = await import('path');
        
        let issues = 0;
        
        // Check Node version
        logger.section('Node.js');
        try {
            const nodeVersion = process.version;
            const major = parseInt(nodeVersion.slice(1).split('.')[0], 10);
            if (major >= 18) {
                logger.success(`  Node ${nodeVersion} ✓`);
            } else {
                logger.error(`  Node ${nodeVersion} (requires v18+)`);
                issues++;
            }
        } catch {
            logger.error('  Could not detect Node version');
            issues++;
        }
        
        // Check Git
        logger.section('Git');
        try {
            const gitVersion = execSync('git --version', { encoding: 'utf-8' }).trim();
            logger.success(`  ${gitVersion} ✓`);
        } catch {
            logger.error('  Git not found');
            issues++;
        }
        
        // Check npm
        logger.section('npm');
        try {
            const npmVersion = execSync('npm --version', { encoding: 'utf-8' }).trim();
            logger.success(`  npm v${npmVersion} ✓`);
        } catch {
            logger.error('  npm not found');
            issues++;
        }
        
        // Check Snyk
        logger.section('Snyk CLI');
        try {
            execSync('snyk --version', { encoding: 'utf-8', stdio: 'pipe' });
            logger.success('  Snyk CLI installed ✓');
        } catch {
            logger.warn('  Snyk CLI not found (optional, will use npm audit)');
        }
        
        // Check tokens
        logger.section('Tokens');
        if (process.env.GITHUB_TOKEN) {
            logger.success('  GITHUB_TOKEN set ✓');
        } else {
            logger.warn('  GITHUB_TOKEN not set (required for PR creation)');
        }
        
        if (process.env.SNYK_TOKEN) {
            logger.success('  SNYK_TOKEN set ✓');
        } else {
            logger.warn('  SNYK_TOKEN not set (required for Snyk scanner)');
        }
        
        // Check project
        logger.section('Project');
        const pkgPath = path.join(process.cwd(), 'package.json');
        if (fs.existsSync(pkgPath)) {
            logger.success('  package.json found ✓');
        } else {
            logger.error('  No package.json found');
            issues++;
        }
        
        // Summary
        logger.section('Summary');
        if (issues === 0) {
            logger.success('All checks passed! Warden is ready to use.');
        } else {
            logger.error(`Found ${issues} issue(s) that need attention.`);
        }
    });

program
    .command('dast')
    .description('Run DAST (Dynamic Application Security Testing) scan')
    .argument('<target>', 'Target URL to scan (must be configured in .wardenrc.json)')
    .option('-v, --verbose', 'Enable verbose logging')
    .option('--dry-run', 'Preview scan without creating PRs')
    .option('--nmap-only', 'Run only Nmap scan')
    .option('--metasploit-only', 'Run only Metasploit scan')
    .option('--no-confirm', 'Skip safety confirmation prompts (not recommended)')
    .action(async (target, options) => {
        try {
            // Set verbose mode
            if (options.verbose) {
                logger.setVerbose(true);
                logger.debug('Verbose mode enabled');
            }

            logger.header('🛡️  WARDEN DAST | Dynamic Application Security Testing');

            // Load configuration
            const { getConfig } = await import('./utils/config');
            const configManager = getConfig();
            const dastConfig = configManager.getDastConfig();

            if (!dastConfig) {
                logger.error('DAST is not configured. Add "dast" section to .wardenrc.json');
                logger.info('Run: warden config --create');
                process.exit(1);
            }

            if (!dastConfig.enabled) {
                logger.error('DAST is disabled in configuration.');
                logger.info('Set "dast.enabled: true" in .wardenrc.json to enable DAST scanning.');
                process.exit(1);
            }

            // Validate DAST configuration
            const validation = configManager.validateDastConfig();
            if (!validation.valid) {
                logger.error('DAST configuration validation failed:');
                validation.errors.forEach(err => logger.error(`  - ${err}`));
                process.exit(1);
            }

            // Find target
            const targetConfig = configManager.findDastTarget(target);
            if (!targetConfig) {
                logger.error(`Target "${target}" not found in configuration.`);
                logger.info('Available targets:');
                dastConfig.targets.forEach(t => {
                    logger.info(`  - ${t.url} (${t.authorized ? 'authorized' : 'NOT AUTHORIZED'})`);
                });
                process.exit(1);
            }

            if (!targetConfig.authorized) {
                logger.error(`Target "${target}" is not authorized for scanning.`);
                logger.error('Set "authorized: true" in configuration to scan this target.');
                logger.error('');
                logger.error('⚠️  WARNING: Unauthorized scanning may be illegal.');
                process.exit(1);
            }

            // Display target info
            logger.info(`Target: ${targetConfig.url}`);
            logger.info(`Description: ${targetConfig.description || 'N/A'}`);
            logger.info(`Authorization: ✓ Authorized`);
            logger.info('');

            // Safety warning
            if (!options.noConfirm && dastConfig.safety.requireConfirmation) {
                logger.warn('═══════════════════════════════════════════════════════════');
                logger.warn('  ⚠️  LEGAL NOTICE - READ CAREFULLY');
                logger.warn('═══════════════════════════════════════════════════════════');
                logger.warn('');
                logger.warn('  Only scan systems you own or have written authorization to test.');
                logger.warn('  Unauthorized scanning may violate laws including:');
                logger.warn('  - Computer Fraud and Abuse Act (USA)');
                logger.warn('  - Computer Misuse Act (UK)');
                logger.warn('  - Similar laws in other jurisdictions');
                logger.warn('');
                logger.warn('  By proceeding, you confirm:');
                logger.warn('  ✓ You have proper authorization to scan this target');
                logger.warn('  ✓ You understand the legal implications');
                logger.warn('  ✓ You accept full responsibility for this scan');
                logger.warn('');
                logger.warn('═══════════════════════════════════════════════════════════');
                logger.warn('');

                // In a real implementation, you'd wait for user confirmation here
                // For now, we'll proceed automatically if --no-confirm is not set
                logger.info('Proceeding with scan...');
                logger.info('');
            }

            // Temporarily disable specific scanners if requested
            if (options.nmapOnly) {
                dastConfig.metasploit.enabled = false;
            } else if (options.metasploitOnly) {
                dastConfig.nmap.enabled = false;
            }

            // Import and run the orchestrator
            const { runWarden } = await import('./orchestrator');
            await runWarden({
                targetPath: process.cwd(),
                dryRun: options.dryRun || false,
                scanner: 'snyk', // Not used in DAST mode
                minSeverity: 'high',
                maxFixes: 1,
                verbose: options.verbose || false,
                scanMode: 'dast',
                dastTarget: target
            });

        } catch (error: any) {
            logger.error('Fatal error during DAST scan', error);
            process.exit(1);
        }
    });

// Parse arguments
program.parse();
