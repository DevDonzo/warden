/**
 * Centralized Shell Execution Service
 *
 * Provides a robust utility for running shell commands with consistent
 * logging, error handling, and timeout management.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../utils/logger';
import { DEFAULT_TIMEOUT_MS } from '../constants';

const execAsync = promisify(exec);

export interface ShellOptions {
    /** Maximum execution time in milliseconds (default: DEFAULT_TIMEOUT_MS) */
    timeout?: number;
    /** Working directory for the command */
    cwd?: string;
    /** Maximum stdout/stderr buffer size in bytes (default: 10MB) */
    maxBuffer?: number;
    /** Whether to log the command before executing (default: true) */
    log?: boolean;
}

/**
 * Error thrown when a shell command exits with a non-zero code.
 */
export class ShellCommandError extends Error {
    public readonly command: string;
    public readonly exitCode: number;
    public readonly stdout: string;
    public readonly stderr: string;

    constructor(command: string, exitCode: number, stdout: string, stderr: string) {
        const detail = stderr?.trim() || stdout?.trim() || 'Unknown error';
        super(`Command failed (exit ${exitCode}): ${command}\n${detail}`);
        this.name = 'ShellCommandError';
        this.command = command;
        this.exitCode = exitCode;
        this.stdout = stdout;
        this.stderr = stderr;
    }
}

/**
 * Run a shell command and return stdout as a trimmed string.
 * Throws ShellCommandError on non-zero exit code.
 */
export async function runCommand(
    command: string,
    options: ShellOptions = {}
): Promise<string> {
    const {
        timeout = DEFAULT_TIMEOUT_MS,
        cwd = process.cwd(),
        maxBuffer = 10 * 1024 * 1024,
        log = true
    } = options;

    if (log) {
        logger.debug(`Executing: ${command}`);
    }

    try {
        const { stdout } = await execAsync(command, { timeout, cwd, maxBuffer });
        return (stdout || '').trim();
    } catch (error: any) {
        const stdout = (error.stdout || '').trim();
        const stderr = (error.stderr || '').trim();
        const exitCode: number = typeof error.code === 'number' ? error.code : 1;
        throw new ShellCommandError(command, exitCode, stdout, stderr || error.message);
    }
}

/**
 * Run a shell command, capturing both stdout and stderr without throwing on non-zero exit.
 * Useful for commands like `npm audit` that use non-zero exit codes for informational results.
 *
 * @returns `{ stdout, stderr, success }` — success is true only if exit code was 0
 */
export async function runCommandCapturingAll(
    command: string,
    options: ShellOptions = {}
): Promise<{ stdout: string; stderr: string; success: boolean }> {
    const {
        timeout = DEFAULT_TIMEOUT_MS,
        cwd = process.cwd(),
        maxBuffer = 10 * 1024 * 1024,
        log = true
    } = options;

    if (log) {
        logger.debug(`Executing (capture-all): ${command}`);
    }

    try {
        const { stdout, stderr } = await execAsync(command, { timeout, cwd, maxBuffer });
        return { stdout: stdout || '', stderr: stderr || '', success: true };
    } catch (error: any) {
        return {
            stdout: error.stdout || '',
            stderr: error.stderr || error.message || '',
            success: false
        };
    }
}
