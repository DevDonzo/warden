import ora, { Ora } from 'ora';
import chalk from 'chalk';
import { logger } from './logger';

export interface ProgressStep {
    name: string;
    status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
    message?: string;
    duration?: number;
}

export class ProgressReporter {
    private steps: Map<string, ProgressStep>;
    private currentSpinner: Ora | null;
    private startTime: number;
    private verbose: boolean;

    constructor(verbose: boolean = false) {
        this.steps = new Map();
        this.currentSpinner = null;
        this.startTime = Date.now();
        this.verbose = verbose;
    }

    /**
     * Add a step to track
     */
    addStep(id: string, name: string): void {
        this.steps.set(id, {
            name,
            status: 'pending'
        });
    }

    /**
     * Start a step
     */
    startStep(id: string, message?: string): void {
        const step = this.steps.get(id);
        if (!step) {
            logger.warn(`Step ${id} not found`);
            return;
        }

        step.status = 'running';
        step.message = message || step.name;

        if (this.currentSpinner) {
            this.currentSpinner.stop();
        }

        this.currentSpinner = ora({
            text: step.message,
            color: 'cyan'
        }).start();
    }

    /**
     * Complete a step successfully
     */
    succeedStep(id: string, message?: string): void {
        const step = this.steps.get(id);
        if (!step) return;

        step.status = 'success';
        step.message = message || step.message;
        step.duration = Date.now() - this.startTime;

        if (this.currentSpinner) {
            this.currentSpinner.succeed(chalk.green(`✓ ${step.message}`));
            this.currentSpinner = null;
        }
    }

    /**
     * Fail a step
     */
    failStep(id: string, message?: string): void {
        const step = this.steps.get(id);
        if (!step) return;

        step.status = 'failed';
        step.message = message || step.message;
        step.duration = Date.now() - this.startTime;

        if (this.currentSpinner) {
            this.currentSpinner.fail(chalk.red(`✗ ${step.message}`));
            this.currentSpinner = null;
        }
    }

    /**
     * Skip a step
     */
    skipStep(id: string, message?: string): void {
        const step = this.steps.get(id);
        if (!step) return;

        step.status = 'skipped';
        step.message = message || step.message;

        if (this.currentSpinner) {
            this.currentSpinner.info(chalk.gray(`○ ${step.message}`));
            this.currentSpinner = null;
        }
    }

    /**
     * Update current step message
     */
    updateStep(id: string, message: string): void {
        const step = this.steps.get(id);
        if (!step) return;

        step.message = message;

        if (this.currentSpinner) {
            this.currentSpinner.text = message;
        }
    }

    /**
     * Print summary of all steps
     */
    printSummary(): void {
        console.log('\n' + chalk.bold('═'.repeat(60)));
        console.log(chalk.bold.cyan('  Execution Summary'));
        console.log(chalk.bold('═'.repeat(60)) + '\n');

        const totalDuration = Date.now() - this.startTime;
        let successCount = 0;
        let failedCount = 0;
        let skippedCount = 0;

        this.steps.forEach((step, id) => {
            const icon = this.getStatusIcon(step.status);
            const color = this.getStatusColor(step.status);
            const duration = step.duration ? ` (${this.formatDuration(step.duration)})` : '';

            console.log(`  ${icon} ${color(step.name)}${chalk.gray(duration)}`);

            if (step.message && step.message !== step.name && this.verbose) {
                console.log(`     ${chalk.gray(step.message)}`);
            }

            if (step.status === 'success') successCount++;
            if (step.status === 'failed') failedCount++;
            if (step.status === 'skipped') skippedCount++;
        });

        console.log('\n' + chalk.bold('─'.repeat(60)));
        console.log(chalk.bold('  Results:'));
        console.log(`  ${chalk.green('✓')} Success: ${successCount}`);
        if (failedCount > 0) {
            console.log(`  ${chalk.red('✗')} Failed: ${failedCount}`);
        }
        if (skippedCount > 0) {
            console.log(`  ${chalk.gray('○')} Skipped: ${skippedCount}`);
        }
        console.log(`  ${chalk.cyan('⏱')} Total Time: ${this.formatDuration(totalDuration)}`);
        console.log(chalk.bold('═'.repeat(60)) + '\n');
    }

    /**
     * Get icon for status
     */
    private getStatusIcon(status: ProgressStep['status']): string {
        const icons: Record<ProgressStep['status'], string> = {
            pending: chalk.gray('○'),
            running: chalk.cyan('◐'),
            success: chalk.green('✓'),
            failed: chalk.red('✗'),
            skipped: chalk.gray('○')
        };
        return icons[status];
    }

    /**
     * Get color function for status
     */
    private getStatusColor(status: ProgressStep['status']): (text: string) => string {
        const colors: Record<ProgressStep['status'], (text: string) => string> = {
            pending: chalk.gray,
            running: chalk.cyan,
            success: chalk.green,
            failed: chalk.red,
            skipped: chalk.gray
        };
        return colors[status];
    }

    /**
     * Format duration in human-readable format
     */
    private formatDuration(ms: number): string {
        if (ms < 1000) {
            return `${ms}ms`;
        }
        const seconds = Math.floor(ms / 1000);
        if (seconds < 60) {
            return `${seconds}s`;
        }
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}m ${remainingSeconds}s`;
    }

    /**
     * Stop current spinner
     */
    stop(): void {
        if (this.currentSpinner) {
            this.currentSpinner.stop();
            this.currentSpinner = null;
        }
    }

    /**
     * Clear all steps
     */
    clear(): void {
        this.stop();
        this.steps.clear();
        this.startTime = Date.now();
    }
}

/**
 * Create a simple progress bar
 */
export class ProgressBar {
    private total: number;
    private current: number;
    private width: number;
    private label: string;

    constructor(total: number, label: string = 'Progress', width: number = 40) {
        this.total = total;
        this.current = 0;
        this.width = width;
        this.label = label;
    }

    /**
     * Update progress
     */
    update(current: number): void {
        this.current = current;
        this.render();
    }

    /**
     * Increment progress
     */
    increment(): void {
        this.current++;
        this.render();
    }

    /**
     * Render progress bar
     */
    private render(): void {
        const percentage = Math.min(100, Math.floor((this.current / this.total) * 100));
        const filled = Math.floor((this.width * this.current) / this.total);
        const empty = this.width - filled;

        const bar = chalk.cyan('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
        const text = `${this.label}: [${bar}] ${percentage}% (${this.current}/${this.total})`;

        // Clear line and print
        process.stdout.write('\r' + text);

        if (this.current >= this.total) {
            process.stdout.write('\n');
        }
    }

    /**
     * Complete the progress bar
     */
    complete(): void {
        this.current = this.total;
        this.render();
    }
}
