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
            expect(result[0].fixedIn).toEqual(['4.17.21']);
            expect(result[0].description).toContain('Direct dependency can be upgraded');
        });

        it('should handle empty vulnerabilities', () => {
            const npmOutput = { vulnerabilities: {} };
            const result = scanner.formatVulnerabilities(npmOutput);
            expect(result).toHaveLength(0);
        });

        it('should avoid fabricating a package.json fix for transitive issues', () => {
            const npmOutput = {
                vulnerabilities: {
                    'ansi-regex': {
                        name: 'ansi-regex',
                        severity: 'moderate',
                        via: [{ title: 'ReDoS', url: 'https://example.com' }],
                        range: '<5.0.1',
                        fixAvailable: true,
                    },
                },
            };

            const result = scanner.formatVulnerabilities(npmOutput);
            expect(result[0].fixedIn).toEqual([]);
            expect(result[0].description).toContain('No direct package.json upgrade is available');
        });
    });
});
