import * as fs from 'fs';
import * as path from 'path';
import { PolicyDecision, RemediationPlan, ScanResult, Severity, WardenOptions } from '../types';
import { SEVERITY_PRIORITY, SCAN_RESULTS_DIR } from '../constants';
import { WardenConfig } from './config';

const POSTURE_PRIORITY: Record<NonNullable<WardenConfig['policy']['failOnPosture']>, number> = {
    guarded: 1,
    elevated: 2,
    critical: 3
};

function posturePriority(posture: RemediationPlan['posture']): number {
    if (posture === 'stable') {
        return 0;
    }

    return POSTURE_PRIORITY[posture];
}

export function evaluatePolicy(
    scanResult: ScanResult,
    remediationPlan: RemediationPlan,
    options: Pick<WardenOptions, 'ci' | 'approvalToken'>,
    config: Pick<WardenConfig, 'policy'>
): PolicyDecision {
    const reasons: string[] = [];
    const highestSeverity = getHighestSeverity(scanResult);

    const approvalThreshold = config.policy.requireApprovalAboveSeverity;
    const approvalRequired =
        approvalThreshold !== undefined &&
        highestSeverity !== null &&
        SEVERITY_PRIORITY[highestSeverity] >= SEVERITY_PRIORITY[approvalThreshold];
    const approvalSatisfied = !approvalRequired || options.approvalToken === 'approved';

    if (approvalRequired && !approvalSatisfied) {
        reasons.push(
            `Approval required before auto-remediation because highest severity is ${highestSeverity} and policy threshold is ${approvalThreshold}.`
        );
    }

    if (
        config.policy.failOnSeverity &&
        highestSeverity !== null &&
        SEVERITY_PRIORITY[highestSeverity] >= SEVERITY_PRIORITY[config.policy.failOnSeverity]
    ) {
        reasons.push(
            `Pipeline gate triggered: highest severity ${highestSeverity} meets failOnSeverity=${config.policy.failOnSeverity}.`
        );
    }

    if (
        config.policy.failOnPosture &&
        posturePriority(remediationPlan.posture) >= POSTURE_PRIORITY[config.policy.failOnPosture]
    ) {
        reasons.push(
            `Pipeline gate triggered: posture ${remediationPlan.posture} meets failOnPosture=${config.policy.failOnPosture}.`
        );
    }

    const shouldFailPipeline = Boolean(options.ci) && reasons.some(reason => reason.includes('Pipeline gate triggered'));
    return {
        shouldBlockFixes: approvalRequired && !approvalSatisfied,
        shouldFailPipeline,
        exitCode: shouldFailPipeline ? 2 : 0,
        reasons,
        approvalRequired,
        approvalSatisfied
    };
}

export function writeApprovalRequest(
    scanResult: ScanResult,
    remediationPlan: RemediationPlan,
    decision: PolicyDecision
): string {
    const outputDir = path.resolve(process.cwd(), SCAN_RESULTS_DIR);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const approvalPath = path.join(outputDir, 'warden-approval-request.json');
    const payload = {
        generatedAt: new Date().toISOString(),
        highestSeverity: getHighestSeverity(scanResult),
        posture: remediationPlan.posture,
        riskScore: remediationPlan.riskScore,
        reasons: decision.reasons,
        nextStep: 'Re-run with --approval-token approved after human review.'
    };

    fs.writeFileSync(approvalPath, JSON.stringify(payload, null, 2), 'utf-8');
    return approvalPath;
}

function getHighestSeverity(scanResult: ScanResult): Severity | null {
    const order: Severity[] = ['critical', 'high', 'medium', 'low'];
    return order.find(severity => scanResult.summary[severity] > 0) || null;
}
