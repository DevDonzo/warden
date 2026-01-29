// Mock @octokit/rest to avoid ESM import issues
jest.mock('@octokit/rest', () => ({
    Octokit: jest.fn().mockImplementation(() => ({
        pulls: { create: jest.fn() },
        issues: { addLabels: jest.fn(), addAssignees: jest.fn() }
    }))
}));

import { DiplomatAgent } from '../src/agents/diplomat';

describe('DiplomatAgent', () => {
    let diplomat: DiplomatAgent;

    beforeEach(() => {
        diplomat = new DiplomatAgent();
    });

    describe('generatePrTitle', () => {
        it('should generate title from branch name', () => {
            const title = diplomat.generatePrTitle('warden/fix-lodash');
            expect(title).toBe('[SECURITY] Fix for Lodash');
        });

        it('should use provided vulnerability name', () => {
            const title = diplomat.generatePrTitle('warden/fix-test', 'CVE-2021-1234');
            expect(title).toBe('[SECURITY] Fix for CVE-2021-1234');
        });

        it('should handle complex branch names', () => {
            const title = diplomat.generatePrTitle('warden/fix-some-complex-package-name');
            expect(title).toBe('[SECURITY] Fix for Some Complex Package Name');
        });
    });

    describe('generatePrBody', () => {
        it('should generate basic body without details', () => {
            const body = diplomat.generatePrBody();
            expect(body).toContain('Automated Security Fix');
            expect(body).toContain('Warden');
            expect(body).toContain('Review Checklist');
        });

        it('should include vulnerability details when provided', () => {
            const body = diplomat.generatePrBody('CVE-2021-1234', 'critical', 'XSS vulnerability');
            expect(body).toContain('CVE-2021-1234');
            expect(body).toContain('critical');
            expect(body).toContain('XSS vulnerability');
        });

        it('should include severity when provided', () => {
            const body = diplomat.generatePrBody('TEST-123', 'high');
            expect(body).toContain('high');
        });
    });
});
