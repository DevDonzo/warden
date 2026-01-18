#!/usr/bin/env node

import { Command } from 'commander';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { logger } from './utils/logger';
import { validator } from './utils/validator';

// Load environment variables
dotenv.config();

const program = new Command();

program
    .name('warden')
    .description('Warden - Autonomous SRE & Security Orchestration Agent')
    .version('1.0.0');

program
    .command('scan')
    .description('Scan a repository for security vulnerabilities')
    .argument('[repository]', 'GitHub repository URL or local path (default: current directory)')
    .option('-v, --verbose', 'Enable verbose logging')
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

            logger.header('🛡️  WARDEN | Autonomous Security Orchestrator');

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

// Parse arguments
program.parse();
