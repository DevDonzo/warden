/**
 * Warden Shared Types
 * 
 * Centralized type definitions used across the application.
 */

export type Severity = 'critical' | 'high' | 'medium' | 'low';

export interface Vulnerability {
    id: string;
    title: string;
    severity: Severity;
    packageName: string;
    version: string;
    fixedIn: string[];
    description: string;
    cvssScore?: number;
    cwe?: string[];
    references?: string[];
}

export interface ScanSummary {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
}

export interface ScanResult {
    timestamp: string;
    vulnerabilities: Vulnerability[];
    summary: ScanSummary;
    scanner?: 'snyk' | 'npm-audit';
    projectPath?: string;
}

export interface FixResult {
    vulnerabilityId: string;
    packageName: string;
    success: boolean;
    previousVersion: string;
    newVersion: string;
    error?: string;
}

export interface PRResult {
    branch: string;
    url: string;
    number: number;
    title: string;
    labels: string[];
}

export interface WardenConfig {
    scanner: 'snyk' | 'npm-audit' | 'auto';
    autoFix: boolean;
    createPR: boolean;
    severityThreshold: Severity;
    ignoredVulnerabilities: string[];
    labelsForPR: string[];
    prAssignee?: string;
    slackWebhook?: string;
    outputFormat: 'text' | 'json';
    verbose: boolean;
    dryRun: boolean;
}

export interface WardenReport {
    timestamp: string;
    config: Partial<WardenConfig>;
    scan: ScanResult;
    fixes: FixResult[];
    pullRequests: PRResult[];
    duration: number;
    exitCode: number;
}

// CLI Option Types
export interface ScanOptions {
    target?: string;
    scanner?: 'snyk' | 'npm-audit';
    fix?: boolean;
    pr?: boolean;
    dryRun?: boolean;
    json?: boolean;
    quiet?: boolean;
    verbose?: boolean;
}

export interface ValidateOptions {
    verbose?: boolean;
}

// Agent Types
export interface Diagnosis {
    vulnerabilityId: string;
    description: string;
    suggestedFix: string;
    filesToModify: string[];
}

export interface PrConfig {
    branch: string;
    title: string;
    body: string;
    severity?: string;
    labels?: string[];
}
