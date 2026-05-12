import { evaluatePolicy } from '../src/utils/policy';
import { buildRemediationPlan } from '../src/utils/advisor';
import fixture from './fixtures/sast-scan-result.json';

describe('policy', () => {
    it('blocks automated fixes when approval is required and missing', () => {
        const plan = buildRemediationPlan(fixture as any, {
            appliedFixes: 0,
            attemptedFixes: 1,
            warnings: [],
        });

        const decision = evaluatePolicy(
            fixture as any,
            plan,
            { ci: false, approvalToken: undefined },
            {
                policy: {
                    failOnSeverity: 'critical',
                    failOnPosture: 'critical',
                    requireApprovalAboveSeverity: 'high',
                },
            } as any
        );

        expect(decision.shouldBlockFixes).toBe(true);
        expect(decision.approvalRequired).toBe(true);
        expect(decision.approvalSatisfied).toBe(false);
    });

    it('fails CI when severity/posture gates are hit', () => {
        const plan = buildRemediationPlan(fixture as any, {
            appliedFixes: 0,
            attemptedFixes: 0,
            warnings: [],
        });

        const decision = evaluatePolicy(
            fixture as any,
            plan,
            { ci: true, approvalToken: 'approved' },
            {
                policy: {
                    failOnSeverity: 'high',
                    failOnPosture: 'elevated',
                    requireApprovalAboveSeverity: 'critical',
                },
            } as any
        );

        expect(decision.shouldFailPipeline).toBe(true);
        expect(decision.exitCode).toBe(2);
    });
});
