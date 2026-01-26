import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from './logger';

export interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

export class Validator {
    /**
     * Create a new validation result
     */
    private createResult(valid: boolean = true): ValidationResult {
        return {
            valid,
            errors: [],
            warnings: []
        };
    }

    /**
     * Check if a command exists in the system PATH
     */
    private commandExists(command: string): boolean {
        try {
            execSync(`which ${command}`, { stdio: 'pipe' });
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Validate environment variables
     */
    validateEnvironment(): ValidationResult {
        const result = this.createResult();

        // Check for .env file
        const envPath = path.resolve(process.cwd(), '.env');
        if (!fs.existsSync(envPath)) {
            result.warnings.push('.env file not found. Using system environment variables.');
        }

        // Required for GitHub operations
        if (!process.env.GITHUB_TOKEN) {
            result.errors.push('GITHUB_TOKEN is required for creating pull requests');
            result.valid = false;
        }

        // Optional but recommended
        if (!process.env.SNYK_TOKEN) {
            result.warnings.push('SNYK_TOKEN not set. Snyk may require authentication for some features.');
        }

        if (!process.env.GITHUB_OWNER) {
            result.warnings.push('GITHUB_OWNER not set. Will attempt to detect from git remote.');
        }

        if (!process.env.GITHUB_REPO) {
            result.warnings.push('GITHUB_REPO not set. Will attempt to detect from git remote.');
        }

        return result;
    }

    /**
     * Validate required system dependencies
     */
    validateDependencies(): ValidationResult {
        const result = this.createResult();

        // Check for Git
        if (!this.commandExists('git')) {
            result.errors.push('Git is not installed or not in PATH');
            result.valid = false;
        }

        // Check for Node.js (should always exist if we're running)
        if (!this.commandExists('node')) {
            result.errors.push('Node.js is not installed or not in PATH');
            result.valid = false;
        }

        // Check for npm
        if (!this.commandExists('npm')) {
            result.errors.push('npm is not installed or not in PATH');
            result.valid = false;
        }

        // Check for Snyk (optional but recommended)
        if (!this.commandExists('snyk')) {
            result.warnings.push('Snyk CLI is not installed. Install with: npm install -g snyk');
            result.warnings.push('Fallback to npm audit will be used if Snyk is unavailable.');
        }

        // Check for GitHub CLI (optional)
        if (!this.commandExists('gh')) {
            result.warnings.push('GitHub CLI (gh) is not installed. Some features may be limited.');
        }

        return result;
    }

    /**
     * Validate Git repository
     */
    validateGitRepository(targetPath: string = process.cwd()): ValidationResult {
        const result = this.createResult();

        const gitDir = path.join(targetPath, '.git');

        if (!fs.existsSync(gitDir)) {
            result.errors.push(`Not a git repository: ${targetPath}`);
            result.valid = false;
            return result;
        }

        try {
            // Check if we have a remote
            const remotes = execSync('git remote -v', {
                cwd: targetPath,
                stdio: 'pipe',
                encoding: 'utf-8'
            });

            if (!remotes || remotes.trim().length === 0) {
                result.warnings.push('No git remotes configured. PR creation may fail.');
            }

            // Check for uncommitted changes
            const status = execSync('git status --porcelain', {
                cwd: targetPath,
                stdio: 'pipe',
                encoding: 'utf-8'
            });

            if (status && status.trim().length > 0) {
                result.warnings.push('Repository has uncommitted changes. These will not be included in automated fixes.');
            }

        } catch (error: any) {
            result.errors.push(`Git validation failed: ${error.message}`);
            result.valid = false;
        }

        return result;
    }

    /**
     * Validate package.json exists
     */
    validatePackageJson(targetPath: string = process.cwd()): ValidationResult {
        const result = this.createResult();

        const packageJsonPath = path.join(targetPath, 'package.json');

        if (!fs.existsSync(packageJsonPath)) {
            result.errors.push('package.json not found. This tool requires a Node.js project.');
            result.valid = false;
            return result;
        }

        try {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

            if (!packageJson.dependencies && !packageJson.devDependencies) {
                result.warnings.push('No dependencies found in package.json');
            }

            if (!packageJson.scripts || !packageJson.scripts.test) {
                result.warnings.push('No test script found in package.json. Verification will be skipped.');
            }

        } catch (error: any) {
            result.errors.push(`Invalid package.json: ${error.message}`);
            result.valid = false;
        }

        return result;
    }

    /**
     * Run all validations
     */
    validateAll(targetPath: string = process.cwd()): ValidationResult {
        logger.debug('Running comprehensive validation...');

        const results: ValidationResult[] = [
            this.validateEnvironment(),
            this.validateDependencies(),
            this.validateGitRepository(targetPath),
            this.validatePackageJson(targetPath)
        ];

        const combined = this.createResult();

        for (const result of results) {
            if (!result.valid) {
                combined.valid = false;
            }
            combined.errors.push(...result.errors);
            combined.warnings.push(...result.warnings);
        }

        return combined;
    }

    /**
     * Print validation results
     */
    printValidationResults(result: ValidationResult) {
        if (result.errors.length > 0) {
            logger.error('Validation failed with the following errors:');
            result.errors.forEach(err => logger.error(`  ✗ ${err}`));
        }

        if (result.warnings.length > 0) {
            logger.warn('Validation warnings:');
            result.warnings.forEach(warn => logger.warn(`  ⚠ ${warn}`));
        }

        if (result.valid && result.errors.length === 0) {
            logger.success('All validations passed!');
        }
    }
}

export const validator = new Validator();
