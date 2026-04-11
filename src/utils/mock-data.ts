/**
 * Mock Data Utilities
 *
 * Provides mock scan results for demo mode and unit tests.
 * Delegates to MockScanner so there is a single source of truth for
 * demo vulnerability data.
 */

import { MockScanner } from '../scanners/mock-scanner';
import { ScanResult } from '../agents/watchman/snyk';

/**
 * @deprecated Prefer instantiating MockScanner directly and calling scan().
 *             This function is kept for backward compatibility.
 */
export async function generateMockScanResult(): Promise<ScanResult> {
    const scanner = new MockScanner();
    const result = await scanner.scan();
    return result as unknown as ScanResult;
}

/**
 * Synchronous wrapper — uses pre-computed mock data without async overhead.
 * Suitable for tests that cannot use async/await.
 */
export function generateMockScanResultSync(): ScanResult {
    return {
        timestamp: new Date().toISOString(),
        vulnerabilities: [
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
        ],
        summary: { critical: 1, high: 1, medium: 1, low: 1, total: 4 },
    };
}
