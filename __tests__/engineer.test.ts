// Mock child_process and fs
jest.mock('child_process', () => ({
    exec: jest.fn(),
}));

import { EngineerAgent } from '../src/agents/engineer';

// Mock git to avoid actual git operations
jest.mock('../src/agents/engineer/git', () => ({
    GitManager: jest.fn().mockImplementation(() => ({
        createBranch: jest.fn().mockResolvedValue(true),
        commitChanges: jest.fn().mockResolvedValue(true),
        hasUncommittedChanges: jest.fn().mockResolvedValue(false),
    }))
}));

describe('EngineerAgent', () => {
    let engineer: EngineerAgent;

    beforeEach(() => {
        engineer = new EngineerAgent();
        jest.clearAllMocks();
    });

    describe('constructor', () => {
        it('should create an instance with GitManager', () => {
            expect(engineer).toBeInstanceOf(EngineerAgent);
        });
    });

    describe('canAttemptFix', () => {
        it('should return true for vulnerabilities with fixedIn versions', () => {
            const vuln = {
                id: 'VULN-001',
                title: 'Test Vulnerability',
                severity: 'high' as const,
                packageName: 'lodash',
                version: '4.17.0',
                fixedIn: ['4.17.21'],
                description: 'Test',
                cvssScore: 7.5,
            };
            expect(engineer.canAttemptFix(vuln)).toBe(true);
        });

        it('should return false for vulnerabilities without fixes', () => {
            const vuln = {
                id: 'VULN-002',
                title: 'No Fix Available',
                severity: 'critical' as const,
                packageName: 'unknown-pkg',
                version: '1.0.0',
                fixedIn: [],
                description: 'No fix',
                cvssScore: 9.0,
            };
            expect(engineer.canAttemptFix(vuln)).toBe(false);
        });
    });

    describe('getFixVersion', () => {
        it('should return the latest fixed version', () => {
            const vuln = {
                id: 'VULN-003',
                title: 'Test',
                severity: 'medium' as const,
                packageName: 'axios',
                version: '0.21.0',
                fixedIn: ['0.21.1', '0.21.2', '1.0.0'],
                description: 'Test',
                cvssScore: 5.0,
            };
            expect(engineer.getFixVersion(vuln)).toBe('1.0.0');
        });

        it('should return null for no fixed versions', () => {
            const vuln = {
                id: 'VULN-004',
                title: 'Test',
                severity: 'low' as const,
                packageName: 'test-pkg',
                version: '1.0.0',
                fixedIn: [],
                description: 'Test',
                cvssScore: 2.0,
            };
            expect(engineer.getFixVersion(vuln)).toBeNull();
        });
    });
});
