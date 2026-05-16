import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { PolicyDecision } from '../src/types';
import fixture from './fixtures/sast-scan-result.json';
import { buildRemediationPlan } from '../src/utils/advisor';
import { writeAgentRunRecord } from '../src/utils/reports';

describe('Warden report outputs', () => {
    const originalCwd = process.cwd();

    afterEach(() => {
        process.chdir(originalCwd);
    });

    it('writes a durable agent handoff record', () => {
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'warden-report-'));
        const scanResult = fixture as any;
        const runResult = {
            mode: 'sast',
            targetPath: tempDir,
            repository: 'owner/repo',
            dryRun: false,
            selectedVulnerabilityIds: ['CRIT-1', 'HIGH-1'],
            attemptedFixes: 2,
            appliedFixes: 1,
            branches: ['warden/fix-lodash', 'warden/fix-axios'],
            pullRequestUrls: ['https://example.com/pr/1'],
            warnings: [
                'Approval required before auto-remediation because highest severity is critical.',
            ],
            advisoryPath: 'SECURITY-ADVISORY.md',
        } as any;
        const policyDecision: PolicyDecision = {
            shouldBlockFixes: true,
            shouldFailPipeline: false,
            approvalRequired: true,
            approvalSatisfied: false,
            exitCode: 0,
            reasons: ['Approval required'],
        };
        const remediationPlan = buildRemediationPlan(scanResult, {
            appliedFixes: runResult.appliedFixes,
            attemptedFixes: runResult.attemptedFixes,
            warnings: runResult.warnings,
        });

        process.chdir(tempDir);
        const recordPath = writeAgentRunRecord(
            scanResult,
            runResult,
            remediationPlan,
            policyDecision
        );
        const record = JSON.parse(fs.readFileSync(recordPath, 'utf-8'));

        expect(record.mode).toBe('sast');
        expect(record.selectedVulnerabilityIds).toEqual(['CRIT-1', 'HIGH-1']);
        expect(record.branches).toEqual(runResult.branches);
        expect(record.policyDecision?.approvalRequired).toBe(true);
        expect(record.topFindings).toHaveLength(3);
        expect(record.topFindings[0].id).toBe('CRIT-1');
        expect(record.whyMatters[0]).toContain('Found 3 total vulnerabilities');

        fs.rmSync(tempDir, { recursive: true, force: true });
    });
});
