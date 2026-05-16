import * as fs from 'fs';
import * as path from 'path';
import { HtmlReportGenerator } from '../agents/watchman/html-report';
import { AgentRunRecord, PolicyDecision, RemediationPlan, ScanResult, WardenRunResult } from '../types';
import { SEVERITY_PRIORITY, SCAN_RESULTS_DIR } from '../constants';

const AGENT_RUN_RECORD_FILE = 'agent-run-record.json';

export function writeMarkdownReport(
    scanResult: ScanResult,
    runResult: Pick<
        WardenRunResult,
        | 'mode'
        | 'appliedFixes'
        | 'attemptedFixes'
        | 'warnings'
        | 'branches'
        | 'pullRequestUrls'
        | 'repository'
        | 'targetPath'
    >,
    remediationPlan: RemediationPlan
): string {
    const outputDir = path.resolve(process.cwd(), SCAN_RESULTS_DIR);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const reportPath = path.join(outputDir, 'warden-report.md');
    const content = [
        '# Warden Security Report',
        '',
        `- Timestamp: ${scanResult.timestamp}`,
        `- Mode: ${runResult.mode}`,
        `- Target: ${runResult.repository || runResult.targetPath}`,
        `- Findings: ${scanResult.summary.total}`,
        `- Applied Fixes: ${runResult.appliedFixes}/${runResult.attemptedFixes}`,
        `- Risk Score: ${remediationPlan.riskScore}/100`,
        `- Posture: ${remediationPlan.posture}`,
        '',
        '## Summary',
        '',
        remediationPlan.summary,
        '',
        '## Immediate Actions',
        '',
        ...remediationPlan.immediateActions.map(
            (action) => `- [${action.priority}] ${action.title}: ${action.rationale}`
        ),
        '',
        '## Manual Follow-Ups',
        '',
        ...(remediationPlan.manualFollowUps.length > 0
            ? remediationPlan.manualFollowUps.map((step) => `- ${step}`)
            : ['- No manual follow-ups identified.']),
        '',
        '## Strategic Improvements',
        '',
        ...remediationPlan.strategicImprovements.map((step) => `- ${step}`),
        '',
        '## Automation Output',
        '',
        ...(runResult.branches.length > 0
            ? runResult.branches.map((branch) => `- Branch: ${branch}`)
            : ['- No branches created.']),
        ...(runResult.pullRequestUrls.length > 0
            ? runResult.pullRequestUrls.map((url) => `- Pull Request: ${url}`)
            : ['- No pull requests created.']),
        '',
        '## Findings',
        '',
        ...scanResult.vulnerabilities.map(
            (vulnerability) =>
                `- ${vulnerability.severity.toUpperCase()} ${vulnerability.id} ${vulnerability.packageName}@${vulnerability.version} | ${vulnerability.title} | Fixes: ${vulnerability.fixedIn.join(', ') || 'manual'}`
        ),
        '',
        '## Warnings',
        '',
        ...(runResult.warnings.length > 0
            ? runResult.warnings.map((warning) => `- ${warning}`)
            : ['- None']),
    ].join('\n');

    fs.writeFileSync(reportPath, content, 'utf-8');
    return reportPath;
}

export function writeAgentRunRecord(
    scanResult: ScanResult,
    runResult: Pick<
        WardenRunResult,
        |
            'mode' |
            'targetPath' |
            'repository' |
            'selectedVulnerabilityIds' |
            'attemptedFixes' |
            'appliedFixes' |
            'branches' |
            'pullRequestUrls' |
            'advisoryPath' |
            'warnings'
    >,
    remediationPlan: RemediationPlan,
    policyDecision?: PolicyDecision
): string {
    const outputDir = path.resolve(process.cwd(), SCAN_RESULTS_DIR);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const recordPath = path.join(outputDir, AGENT_RUN_RECORD_FILE);
    const topFindings = [...scanResult.vulnerabilities]
        .sort((left, right) => {
            const severityDelta =
                SEVERITY_PRIORITY[right.severity] - SEVERITY_PRIORITY[left.severity];

            if (severityDelta !== 0) {
                return severityDelta;
            }

            return (right.cvssScore || 0) - (left.cvssScore || 0);
        })
        .slice(0, 5)
        .map((vulnerability) => ({
            id: vulnerability.id,
            title: vulnerability.title,
            severity: vulnerability.severity,
            packageName: vulnerability.packageName,
            version: vulnerability.version,
        }));

    const record: AgentRunRecord = {
        generatedAt: new Date().toISOString(),
        mode: runResult.mode,
        targetPath: runResult.targetPath,
        repository: runResult.repository,
        scanTimestamp: scanResult.timestamp,
        scanSummary: scanResult.summary,
        riskScore: remediationPlan.riskScore,
        posture: remediationPlan.posture,
        selectedVulnerabilityIds: runResult.selectedVulnerabilityIds,
        attemptedFixes: runResult.attemptedFixes,
        appliedFixes: runResult.appliedFixes,
        branches: runResult.branches,
        pullRequestUrls: runResult.pullRequestUrls,
        advisoryPath: runResult.advisoryPath,
        policyDecision: policyDecision
            ? {
                  shouldBlockFixes: policyDecision.shouldBlockFixes,
                  shouldFailPipeline: policyDecision.shouldFailPipeline,
                  approvalRequired: policyDecision.approvalRequired,
                  approvalSatisfied: policyDecision.approvalSatisfied,
                  reasons: policyDecision.reasons,
              }
            : undefined,
        warnings: runResult.warnings,
        whyMatters: [
            `Found ${scanResult.summary.total} total vulnerabilities (${scanResult.summary.critical} critical, ${scanResult.summary.high} high, ${scanResult.summary.medium} medium, ${scanResult.summary.low} low).`,
            `Applied ${runResult.appliedFixes}/${runResult.attemptedFixes} selected fixes.`,
            `Risk score ${remediationPlan.riskScore}/100 with posture ${remediationPlan.posture}.`,
            remediationPlan.summary,
        ],
        topFindings,
    };

    fs.writeFileSync(recordPath, JSON.stringify(record, null, 2), 'utf-8');
    return recordPath;
}

export function writeHtmlReport(scanResult: ScanResult): string {
    const generator = new HtmlReportGenerator();
    const outputPath = generator.generate(scanResult);
    return outputPath;
}
