import { Vulnerability, ScanResult } from '../agents/watchman/snyk';

/**
 * Generate mock vulnerability data for testing without Snyk CLI
 */
export function generateMockScanResult(): ScanResult {
    const vulnerabilities: Vulnerability[] = [
        {
            id: 'SNYK-JS-LODASH-590103',
            title: 'Prototype Pollution',
            severity: 'critical',
            packageName: 'lodash',
            version: '4.17.15',
            fixedIn: ['4.17.21'],
            description: 'Prototype pollution vulnerability in lodash',
            cvssScore: 9.8,
        },
        {
            id: 'SNYK-JS-AXIOS-1038255',
            title: 'Server-Side Request Forgery (SSRF)',
            severity: 'high',
            packageName: 'axios',
            version: '0.21.0',
            fixedIn: ['0.21.1'],
            description: 'SSRF vulnerability in axios',
            cvssScore: 7.5,
        },
        {
            id: 'SNYK-JS-MINIMIST-559764',
            title: 'Prototype Pollution',
            severity: 'medium',
            packageName: 'minimist',
            version: '1.2.0',
            fixedIn: ['1.2.6'],
            description: 'Prototype pollution in minimist',
            cvssScore: 5.6,
        },
        {
            id: 'SNYK-JS-DOTENV-1015748',
            title: 'Information Exposure',
            severity: 'low',
            packageName: 'dotenv',
            version: '8.0.0',
            fixedIn: ['8.2.0'],
            description: 'Potential information exposure',
            cvssScore: 3.1,
        },
    ];

    // Count vulnerabilities by severity in single pass
    const summary = vulnerabilities.reduce(
        (acc, v) => ({
            ...acc,
            [v.severity]: (acc[v.severity as keyof typeof acc] || 0) + 1,
            total: acc.total + 1,
        }),
        { critical: 0, high: 0, medium: 0, low: 0, total: 0 }
    );

    return {
        timestamp: new Date().toISOString(),
        vulnerabilities,
        summary,
    };
}
