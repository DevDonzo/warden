import * as fs from 'fs';
import * as path from 'path';
import { HtmlReportGenerator } from '../agents/watchman/html-report';
import { RemediationPlan, ScanResult, WardenRunResult } from '../types';
import { SCAN_RESULTS_DIR } from '../constants';

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

export function writeHtmlReport(scanResult: ScanResult): string {
    const generator = new HtmlReportGenerator();
    const outputPath = generator.generate(scanResult);
    return outputPath;
}
