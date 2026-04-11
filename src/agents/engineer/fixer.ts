/**
 * Fixer Abstraction Layer
 *
 * Decouples the EngineerAgent from npm/Node.js specifics.
 * Defines the IFixer interface and provides NpmFixer as the default
 * implementation. Future package managers (pip, cargo, etc.) can be
 * added by implementing IFixer without touching EngineerAgent.
 */

import * as fs from 'fs';
import * as path from 'path';
import { GitManager } from './git';
import { runCommand } from '../../services/shell';
import { logger } from '../../utils/logger';
import { validator } from '../../utils/validator';
import { FixInstruction } from '../../types';
import { DEFAULT_BRANCH_PREFIX } from '../../constants';

// ─────────────────────────────────────────────────────────────────────────────
// Interface
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A Fixer encapsulates all package-manager-specific logic needed to apply a
 * security fix: branch creation, manifest update, lock-file refresh, and
 * verification.
 */
export interface IFixer {
    /** Human-readable identifier, e.g. 'npm', 'pip', 'cargo' */
    readonly name: string;

    /**
     * Return true when this fixer is capable of handling the given instruction
     * (e.g. NpmFixer checks that package.json exists and contains the package).
     */
    canFix(instruction: FixInstruction): boolean;

    /**
     * Apply the fix described by `instruction`.
     *
     * @param instruction  The structured update to apply.
     * @param vulnerabilityId  ID used in the commit message.
     * @param branchPrefix  Prefix for the git branch (default: DEFAULT_BRANCH_PREFIX).
     * @returns true on success, false on recoverable failure.
     */
    applyFix(
        instruction: FixInstruction,
        vulnerabilityId: string,
        branchPrefix?: string
    ): Promise<boolean>;
}

// ─────────────────────────────────────────────────────────────────────────────
// NpmFixer
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Applies security fixes to Node.js / npm projects.
 *
 * Steps:
 *  1. Derive & validate a git branch name
 *  2. Checkout (or create) the branch
 *  3. Update the version in package.json (dependencies / devDependencies)
 *  4. Run `npm install` to regenerate the lock-file
 *  5. Run `npm test` for verification
 *  6. On success: stage all changes and commit
 *  7. On test failure: revert all changes and return false
 */
export class NpmFixer implements IFixer {
    readonly name = 'npm';

    private git: GitManager;

    constructor() {
        this.git = new GitManager();
    }

    // ── canFix ──────────────────────────────────────────────────────────────

    canFix(instruction: FixInstruction): boolean {
        const pkgJsonPath = path.resolve(process.cwd(), 'package.json');

        if (!fs.existsSync(pkgJsonPath)) {
            return false;
        }

        try {
            const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
            return (
                (pkg.dependencies && pkg.dependencies[instruction.packageName] !== undefined) ||
                (pkg.devDependencies && pkg.devDependencies[instruction.packageName] !== undefined)
            );
        } catch {
            return false;
        }
    }

    // ── applyFix ─────────────────────────────────────────────────────────────

    async applyFix(
        instruction: FixInstruction,
        vulnerabilityId: string,
        branchPrefix: string = DEFAULT_BRANCH_PREFIX
    ): Promise<boolean> {
        const { packageName, targetVersion } = instruction;

        logger.engineer(`Applying npm fix: ${packageName} → ${targetVersion}`);

        // 1. Derive & validate branch name
        let branchName = `${branchPrefix}-${packageName}`;
        const branchValidation = validator.validateBranchName(branchName);

        if (!branchValidation.valid) {
            logger.warn('Branch name validation failed, sanitizing...');
            branchName = validator.sanitizeBranchName(packageName, branchPrefix);
            logger.info(`Sanitized branch name: ${branchName}`);
        } else if (branchValidation.warnings.length > 0) {
            branchValidation.warnings.forEach(w => logger.warn(w));
        }

        try {
            // 2. Checkout branch
            await this.git.checkoutBranch(branchName);

            // 3. Update package.json
            const packageJsonPath = path.resolve(process.cwd(), 'package.json');
            if (!fs.existsSync(packageJsonPath)) {
                throw new Error('package.json not found');
            }

            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
            let updated = false;

            if (packageJson.dependencies?.[packageName] !== undefined) {
                logger.info(
                    `Updating dependencies: ${packageName} ` +
                    `${packageJson.dependencies[packageName]} → ${targetVersion}`
                );
                packageJson.dependencies[packageName] = targetVersion;
                updated = true;
            }

            if (packageJson.devDependencies?.[packageName] !== undefined) {
                logger.info(
                    `Updating devDependencies: ${packageName} ` +
                    `${packageJson.devDependencies[packageName]} → ${targetVersion}`
                );
                packageJson.devDependencies[packageName] = targetVersion;
                updated = true;
            }

            if (!updated) {
                logger.error(
                    `Package "${packageName}" not found in dependencies or devDependencies. ` +
                    'This may be a transitive dependency.'
                );
                return false;
            }

            fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

            // 4. Regenerate lock-file
            logger.engineer('Running npm install to update lock-file...');
            await runCommand('npm install', { log: false });

            // 5. Verification
            logger.engineer('Running verification (npm test)...');
            try {
                await runCommand('npm test', { log: false });
                logger.success('Verification passed!');
            } catch {
                logger.error('Verification failed! Reverting changes...');
                await this.git.revertChanges();
                return false;
            }

            // 6. Commit
            await this.git.stageAll();
            await this.git.commit(`fix(${packageName}): resolve ${vulnerabilityId}`);

            logger.success(`Fix committed on branch "${branchName}"`);
            return true;

        } catch (error: any) {
            logger.error('NpmFixer encountered an error:', error);
            return false;
        }
    }
}
