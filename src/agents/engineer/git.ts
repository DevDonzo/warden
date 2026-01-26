import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../../utils/logger';

const execAsync = promisify(exec);

export class GitManager {
    /**
     * Execute a shell command
     */
    private async exec(command: string): Promise<string> {
        try {
            const { stdout, stderr } = await execAsync(command);
            if (stderr && !stderr.includes('Already on') && !stderr.includes('Switched to')) {
                // Git messages often go to stderr even on success, so we just log them if needed
            }
            return stdout.trim();
        } catch (error: any) {
            throw new Error(`Command failed: ${command}\n${error.message}`);
        }
    }

    /**
     * Check if a branch exists
     */
    async branchExists(branchName: string): Promise<boolean> {
        try {
            await this.exec(`git rev-parse --verify ${branchName}`);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Create and checkout a new branch.
     * If branch exists, just checkout it.
     */
    async checkoutBranch(branchName: string): Promise<void> {
        // Check if we are already on the branch to avoid errors
        try {
            const currentBranch = await this.exec('git rev-parse --abbrev-ref HEAD');
            if (currentBranch === branchName) {
                logger.debug(`Already on branch: ${branchName}`);
                return;
            }

            const exists = await this.branchExists(branchName);
            if (exists) {
                logger.debug(`Switching to existing branch: ${branchName}`);
                await this.exec(`git checkout ${branchName}`);
            } else {
                logger.debug(`Creating new branch: ${branchName}`);
                await this.exec(`git checkout -b ${branchName}`);
            }
        } catch (error) {
            throw new Error(`Failed to checkout branch ${branchName}: ${error}`);
        }
    }

    /**
     * Stage all changes
     */
    async stageAll(): Promise<void> {
        logger.debug('Staging changes...');
        await this.exec('git add .');
    }

    /**
     * Commit changes
     */
    async commit(message: string): Promise<void> {
        logger.debug(`Committing changes: "${message}"`);
        await this.exec(`git commit -m "${message}"`);
    }

    /**
     * Revert all changes in the current directory (hard reset)
     * USE WITH CAUTION
     */
    async revertChanges(): Promise<void> {
        console.log('[INFO] Reverting changes...');
        await this.exec('git checkout .');
        await this.exec('git clean -fd');
    }

    /**
     * Return to main branch
     */
    async checkoutMain(): Promise<void> {
        // Try 'main' or 'master'
        try {
            await this.exec('git checkout main');
        } catch {
            await this.exec('git checkout master');
        }
    }
}
