// Mock file system and child_process
jest.mock('fs');
jest.mock('child_process', () => ({
    exec: jest.fn(),
    execSync: jest.fn(),
}));

import { NpmAuditScanner } from '../src/agents/watchman/npm-audit';

describe('NpmAuditScanner', () => {
    let scanner: NpmAuditScanner;

    beforeEach(() => {
        scanner = new NpmAuditScanner();
        jest.clearAllMocks();
    });

    describe('constructor', () => {
        it('should create an instance', () => {
            expect(scanner).toBeInstanceOf(NpmAuditScanner);
        });
    });

    describe('parseSeverity', () => {
        it('should parse critical severity', () => {
            expect(scanner.parseSeverity('critical')).toBe('critical');
        });

        it('should parse high severity', () => {
            expect(scanner.parseSeverity('high')).toBe('high');
        });

        it('should parse moderate as medium', () => {
            expect(scanner.parseSeverity('moderate')).toBe('medium');
        });

        it('should parse low severity', () => {
            expect(scanner.parseSeverity('low')).toBe('low');
        });

        it('should default to medium for unknown severity', () => {
            expect(scanner.parseSeverity('unknown')).toBe('medium');
        });
    });

    describe('formatVulnerabilities', () => {
        it('should format npm audit output into vulnerability objects', () => {
            const npmOutput = {
                vulnerabilities: {
                    lodash: {
                        name: 'lodash',
                        severity: 'high',
                        via: [{ title: 'Prototype Pollution', url: 'https://example.com' }],
                        range: '< 4.17.21',
                        fixAvailable: { version: '4.17.21' },
                    },
                },
            };

            const result = scanner.formatVulnerabilities(npmOutput);
            expect(result).toHaveLength(1);
            expect(result[0].packageName).toBe('lodash');
            expect(result[0].severity).toBe('high');
        });

        it('should handle empty vulnerabilities', () => {
            const npmOutput = { vulnerabilities: {} };
            const result = scanner.formatVulnerabilities(npmOutput);
            expect(result).toHaveLength(0);
        });
    });
});
