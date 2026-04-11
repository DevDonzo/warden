/**
 * Mock Scanner
 *
 * A fake scanner that returns pre-defined vulnerabilities for use in
 * demo mode and unit tests. Implements IScanner so it can be swapped
 * in via ScannerRegistry just like a real scanner.
 */

import { IScanner, ScannerResult } from './index';

export class MockScanner implements IScanner {
    readonly name = 'mock';

    async scan(): Promise<ScannerResult> {
        const vulnerabilities = [
            {
                id: 'SNYK-JS-LODASH-590103',
                title: 'Prototype Pollution',
                severity: 'critical' as const,
                packageName: 'lodash',
                version: '4.17.15',
                fixedIn: ['4.17.21'],
                description: 'Prototype pollution vulnerability in lodash allows attackers to add arbitrary properties to Object.prototype.',
                cvssScore: 9.8
            },
            {
                id: 'SNYK-JS-AXIOS-1038255',
                title: 'Server-Side Request Forgery (SSRF)',
                severity: 'high' as const,
                packageName: 'axios',
                version: '0.21.0',
                fixedIn: ['0.21.1'],
                description: 'SSRF vulnerability in axios allows attackers to make arbitrary HTTP requests from the server.',
                cvssScore: 7.5
            },
            {
                id: 'SNYK-JS-MINIMIST-559764',
                title: 'Prototype Pollution',
                severity: 'medium' as const,
                packageName: 'minimist',
                version: '1.2.0',
                fixedIn: ['1.2.6'],
                description: 'Prototype pollution in minimist allows modification of Object.prototype.',
                cvssScore: 5.6
            },
            {
                id: 'SNYK-JS-DOTENV-1015748',
                title: 'Information Exposure',
                severity: 'low' as const,
                packageName: 'dotenv',
                version: '8.0.0',
                fixedIn: ['8.2.0'],
                description: 'Potential information exposure through dotenv configuration leakage.',
                cvssScore: 3.1
            }
        ];

        const summary = vulnerabilities.reduce(
            (acc, v) => ({
                ...acc,
                [v.severity]: (acc[v.severity as keyof typeof acc] as number) + 1,
                total: acc.total + 1
            }),
            { critical: 0, high: 0, medium: 0, low: 0, total: 0 }
        );

        return {
            timestamp: new Date().toISOString(),
            vulnerabilities,
            summary,
            scanner: 'mock'
        };
    }
}
