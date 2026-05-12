import { isSeverityAtLeast, selectVulnerabilitiesForFix } from '../src/utils/scan-results';
import { Vulnerability } from '../src/types';

const vulnerabilities: Vulnerability[] = [
    {
        id: 'low-1',
        title: 'Low severity issue',
        severity: 'low',
        packageName: 'a',
        version: '1.0.0',
        fixedIn: ['1.0.1'],
        description: 'low',
        cvssScore: 2,
    },
    {
        id: 'high-1',
        title: 'High severity issue',
        severity: 'high',
        packageName: 'b',
        version: '1.0.0',
        fixedIn: ['1.1.0'],
        description: 'high',
        cvssScore: 7.5,
    },
    {
        id: 'critical-1',
        title: 'Critical severity issue',
        severity: 'critical',
        packageName: 'c',
        version: '1.0.0',
        fixedIn: ['2.0.0'],
        description: 'critical',
        cvssScore: 9.8,
    },
    {
        id: 'high-2',
        title: 'Higher CVSS high severity issue',
        severity: 'high',
        packageName: 'd',
        version: '1.0.0',
        fixedIn: ['1.2.0'],
        description: 'high-2',
        cvssScore: 8.4,
    },
];

describe('scan-results helpers', () => {
    describe('isSeverityAtLeast', () => {
        it('treats higher severities as matching the threshold', () => {
            expect(isSeverityAtLeast('critical', 'high')).toBe(true);
            expect(isSeverityAtLeast('high', 'high')).toBe(true);
            expect(isSeverityAtLeast('medium', 'high')).toBe(false);
        });
    });

    describe('selectVulnerabilitiesForFix', () => {
        it('filters out lower severities and respects the fix limit', () => {
            const selected = selectVulnerabilitiesForFix(vulnerabilities, 'high', 2);
            expect(selected.map((vulnerability) => vulnerability.id)).toEqual([
                'critical-1',
                'high-2',
            ]);
        });

        it('returns an empty list when maxFixes is zero', () => {
            expect(selectVulnerabilitiesForFix(vulnerabilities, 'low', 0)).toEqual([]);
        });
    });
});
