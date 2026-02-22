/**
 * Warden Shared Types
 *
 * Centralized type definitions used across the application.
 */

export type Severity = 'critical' | 'high' | 'medium' | 'low';
export type ScannerType = 'snyk' | 'npm-audit' | 'nmap' | 'metasploit';
export type ScanMode = 'sast' | 'dast';

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
    // DAST-specific fields
    targetHost?: string;
    targetPort?: number;
    service?: string;
    serviceVersion?: string;
    exploitAvailable?: boolean;
    exploitModule?: string;
    findings?: string[];
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
    scanner?: ScannerType;
    projectPath?: string;
    scanMode?: ScanMode;
    scanMetadata?: {
        target?: string;
        scanType?: string;
        duration?: number;
        nmapVersion?: string;
        msfVersion?: string;
        [key: string]: any;
    };
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
    dast?: DastConfig;
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

// DAST Configuration Types
export interface DastTarget {
    url: string;
    description?: string;
    authorized: boolean;
    ports?: string;
    excludePorts?: string;
}

export interface NmapConfig {
    enabled: boolean;
    scanType: 'quick' | 'standard' | 'comprehensive' | 'stealth';
    portRange?: string;
    timing?: number;
    options?: string[];
    outputFormat?: 'xml' | 'normal';
}

export interface MetasploitConfig {
    enabled: boolean;
    mode: 'scan-only' | 'safe-exploits' | 'full';
    modules?: string[];
    timeout?: number;
}

export interface SafetyConfig {
    requireConfirmation: boolean;
    authorizedTargetsOnly: boolean;
    disableExploits: boolean;
    maxScanDuration?: number;
}

export interface DastConfig {
    enabled: boolean;
    targets: DastTarget[];
    nmap: NmapConfig;
    metasploit: MetasploitConfig;
    safety: SafetyConfig;
}
