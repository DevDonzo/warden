/**
 * Application-wide constants
 */

// Directories
export const WORKSPACES_DIR = 'workspaces';
export const LOGS_DIR = 'logs';
export const SCAN_RESULTS_DIR = 'scan-results';
export const DAST_OUTPUT_DIR = 'scan-results/dast';

// Files
export const SCAN_RESULTS_FILE = 'scan-results.json';
export const SCAN_RESULTS_PATH = `${SCAN_RESULTS_DIR}/${SCAN_RESULTS_FILE}`;
export const WARDEN_CONFIG_FILE = '.wardenrc.json';
export const ENV_FILE = '.env';
export const SECURITY_ADVISORY_FILE = 'SECURITY-ADVISORY.md';

// Git / Branch
export const DEFAULT_BRANCH_PREFIX = 'warden/fix';
export const DEFAULT_BASE_BRANCH = 'main';
export const DAST_BRANCH_PREFIX = 'warden/dast-advisory';

// Timeouts (in milliseconds)
export const DEFAULT_TIMEOUT_MS = 300000; // 5 minutes
export const GIT_TIMEOUT_MS = 60000; // 1 minute
export const SCANNER_TIMEOUT_MS = 300000; // 5 minutes

// Retries
export const DEFAULT_RETRIES = 3;
export const DEFAULT_RETRY_DELAY_MS = 1000; // 1 second

// Severity levels
export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low';
export const SEVERITY_LEVELS: readonly SeverityLevel[] = ['critical', 'high', 'medium', 'low'];
export const SEVERITY_PRIORITY: Record<SeverityLevel, number> = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
};

// Scanner types
export type ScannerType = 'snyk' | 'npm-audit' | 'all';
export const SCANNER_TYPES: readonly ScannerType[] = ['snyk', 'npm-audit', 'all'];

// Logging
export const LOG_LEVELS = ['error', 'warn', 'info', 'debug'] as const;
export const DEFAULT_LOG_LEVEL = 'info';

// Limits
export const DEFAULT_MAX_FIXES = 1;
export const DEFAULT_MIN_SEVERITY = 'high' as SeverityLevel;

// Messages
export const MESSAGES = {
    CLEAN_AUDIT: 'Clean Audit: No vulnerabilities identified.',
    SETUP_COMPLETE: 'Setup complete! You can now run: warden scan',
    WORKSPACE_READY: (repoName: string) => `Workspace ready: ${repoName}`,
    VALIDATION_PASSED: 'All validations passed!',
    VALIDATION_FAILED:
        'Validation failed. Fix the errors above or use --skip-validation to proceed anyway.',
} as const;
