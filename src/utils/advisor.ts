import {
    RemediationAction,
    RemediationPlan,
    RunHistoryEntry,
    ScanResult,
    Severity,
    WardenRunResult
} from '../types';
import { SEVERITY_PRIORITY } from '../constants';

const FIXABLE_PRIORITIES: Severity[] = ['critical', 'high', 'medium', 'low'];

export function buildRemediationPlan(
    scanResult: ScanResult,
    runResult: Pick<WardenRunResult, 'appliedFixes' | 'attemptedFixes' | 'warnings'>
): RemediationPlan {
    const autoFixable = scanResult.vulnerabilities.filter(vulnerability => vulnerability.fixedIn.length > 0);
    const manual = scanResult.vulnerabilities.filter(vulnerability => vulnerability.fixedIn.length === 0);
    const exploitCount = scanResult.vulnerabilities.filter(vulnerability => vulnerability.exploitAvailable).length;
    const riskScore = calculateRiskScore(scanResult);
    const posture = classifyPosture(riskScore);

    const immediateActions = buildImmediateActions(scanResult, autoFixable.length, runResult.appliedFixes);
    const manualFollowUps = buildManualFollowUps(manual);
    const strategicImprovements = buildStrategicImprovements(scanResult, runResult.warnings);

    return {
        riskScore,
        posture,
        autoFixableCount: autoFixable.length,
        manualCount: manual.length,
        exploitCount,
        immediateActions,
        manualFollowUps,
        strategicImprovements,
        summary: buildSummary(scanResult, autoFixable.length, manual.length, exploitCount, posture)
    };
}

export function createHistoryEntry(
    scanResult: ScanResult,
    runResult: Pick<WardenRunResult, 'mode' | 'targetPath' | 'repository' | 'appliedFixes' | 'attemptedFixes' | 'remediationPlan'>
): RunHistoryEntry {
    return {
        timestamp: scanResult.timestamp,
        mode: runResult.mode,
        targetPath: runResult.targetPath,
        repository: runResult.repository,
        totalVulnerabilities: scanResult.summary.total,
        critical: scanResult.summary.critical,
        high: scanResult.summary.high,
        medium: scanResult.summary.medium,
        low: scanResult.summary.low,
        appliedFixes: runResult.appliedFixes,
        attemptedFixes: runResult.attemptedFixes,
        autoFixableCount: runResult.remediationPlan?.autoFixableCount ?? 0,
        manualCount: runResult.remediationPlan?.manualCount ?? 0,
        riskScore: runResult.remediationPlan?.riskScore ?? calculateRiskScore(scanResult)
    };
}

function calculateRiskScore(scanResult: ScanResult): number {
    const weightedSum = scanResult.vulnerabilities.reduce((total, vulnerability) => {
        const base = SEVERITY_PRIORITY[vulnerability.severity] * 20;
        const cvssWeight = vulnerability.cvssScore ? Math.round(vulnerability.cvssScore * 3) : 0;
        const exploitWeight = vulnerability.exploitAvailable ? 25 : 0;
        return total + base + cvssWeight + exploitWeight;
    }, 0);

    return Math.min(100, weightedSum);
}

function classifyPosture(riskScore: number): RemediationPlan['posture'] {
    if (riskScore >= 90) return 'critical';
    if (riskScore >= 60) return 'elevated';
    if (riskScore >= 30) return 'guarded';
    return 'stable';
}

function buildImmediateActions(
    scanResult: ScanResult,
    autoFixableCount: number,
    appliedFixes: number
): RemediationAction[] {
    const actions: RemediationAction[] = [];
    const highestSeverity = FIXABLE_PRIORITIES.find(severity => scanResult.summary[severity] > 0);

    if (highestSeverity) {
        actions.push({
            title: `Contain ${highestSeverity} severity findings first`,
            priority: highestSeverity === 'critical' ? 'urgent' : 'high',
            rationale: `${scanResult.summary[highestSeverity]} ${highestSeverity} finding(s) remain in the current scan.`
        });
    }

    if (autoFixableCount > appliedFixes) {
        actions.push({
            title: 'Increase automated remediation throughput',
            priority: 'high',
            rationale: `${autoFixableCount - appliedFixes} fixable issue(s) still require execution or batching.`
        });
    }

    if (scanResult.vulnerabilities.some(vulnerability => vulnerability.exploitAvailable)) {
        actions.push({
            title: 'Escalate exploit-backed findings to incident priority',
            priority: 'urgent',
            rationale: 'At least one finding has a known exploit path and should bypass normal backlog flow.'
        });
    }

    return actions.slice(0, 4);
}

function buildManualFollowUps(manualVulnerabilities: ScanResult['vulnerabilities']): string[] {
    const packages = [...new Set(manualVulnerabilities.map(vulnerability => vulnerability.packageName).filter(Boolean))];
    return packages.slice(0, 6).map(packageName => `Investigate manual remediation path for ${packageName}`);
}

function buildStrategicImprovements(scanResult: ScanResult, warnings: string[]): string[] {
    const improvements: string[] = [];

    if (scanResult.summary.high + scanResult.summary.critical > 0) {
        improvements.push('Add Warden to CI so high and critical findings fail fast before merge.');
    }

    if (scanResult.vulnerabilities.some(vulnerability => vulnerability.fixedIn.length === 0)) {
        improvements.push('Track transitive dependencies and vendor advisories so manual-only issues are not orphaned.');
    }

    if (warnings.some(warning => warning.includes('GITHUB_TOKEN'))) {
        improvements.push('Configure GitHub credentials so Warden can complete the full branch-to-PR loop automatically.');
    }

    if (warnings.some(warning => warning.includes('uncommitted changes'))) {
        improvements.push('Run Warden in a clean workspace or dedicated CI checkout to preserve deterministic remediation.');
    }

    if (improvements.length === 0) {
        improvements.push('Raise max automated fixes per run gradually and monitor regression signals.');
    }

    return improvements;
}

function buildSummary(
    scanResult: ScanResult,
    autoFixableCount: number,
    manualCount: number,
    exploitCount: number,
    posture: RemediationPlan['posture']
): string {
    return [
        `${scanResult.summary.total} finding(s) detected with ${autoFixableCount} auto-fixable and ${manualCount} manual follow-up item(s).`,
        exploitCount > 0 ? `${exploitCount} finding(s) have exploit context.` : 'No exploit-backed findings were detected.',
        `Current security posture is ${posture}.`
    ].join(' ');
}
