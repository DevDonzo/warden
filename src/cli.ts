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

            if (!options.json) {
                logger.header('🛡️  WARDEN | Autonomous Security Orchestrator');
            }

            // Determine target path
            let targetPath = process.cwd();
            let isRemote = false;

            if (repository) {
                if (repository.startsWith('http') || repository.includes('github.com')) {
                    isRemote = true;
                    logger.info(`Target: Remote repository ${repository}`);
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
            await runWarden({
                targetPath,
                repository: isRemote ? repository : undefined,
                dryRun: options.dryRun || false,
                scanner: options.scanner,
                minSeverity: options.severity,
                maxFixes: parseInt(options.maxFixes, 10),
                verbose: options.verbose || false
            });

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

// Parse arguments
program.parse();
