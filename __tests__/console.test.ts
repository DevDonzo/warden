import * as fs from 'fs';
import * as http from 'http';
import * as os from 'os';
import * as path from 'path';
import { buildConsoleState, startWardenConsole } from '../src/utils/console';
import { createBaselineSnapshot } from '../src/utils/baseline';
import { ScanResult } from '../src/types';

const scanResult: ScanResult = {
    timestamp: '2026-05-12T12:00:00.000Z',
    scanner: 'npm-audit',
    scanMode: 'sast',
    projectPath: '/tmp/warden-app',
    summary: {
        total: 2,
        critical: 1,
        high: 0,
        medium: 1,
        low: 0,
    },
    vulnerabilities: [
        {
            id: 'CRIT-1',
            title: 'Critical dependency issue',
            severity: 'critical',
            packageName: 'express',
            version: '4.17.0',
            fixedIn: ['4.18.3'],
            description: 'critical dependency issue',
            ecosystem: 'npm',
            cvssScore: 9.8,
        },
        {
            id: 'MED-1',
            title: 'Medium dependency issue',
            severity: 'medium',
            packageName: 'debug',
            version: '2.6.0',
            fixedIn: [],
            description: 'medium dependency issue',
            ecosystem: 'npm',
        },
    ],
};

describe('Warden console', () => {
    it('builds console state from scan artifacts and baseline data', () => {
        const tempDir = createConsoleFixture();
        const baseline = createBaselineSnapshot({
            ...scanResult,
            summary: {
                total: 1,
                critical: 0,
                high: 0,
                medium: 1,
                low: 0,
            },
            vulnerabilities: [scanResult.vulnerabilities[1]],
        });

        try {
            fs.writeFileSync(
                path.join(tempDir, '.warden-baseline.json'),
                JSON.stringify(baseline, null, 2),
                'utf-8'
            );

            const state = buildConsoleState(tempDir);

            expect(state.scan?.riskScore).toBeGreaterThan(0);
            expect(state.scan?.topFindings[0].id).toBe('CRIT-1');
            expect(state.baseline?.comparison?.summary.new).toBe(1);
            expect(state.artifacts.scanResults.exists).toBe(true);
        } finally {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    it('serves the local console HTML and state API', async () => {
        const tempDir = createConsoleFixture();
        const server = await startWardenConsole({
            rootDir: tempDir,
            port: 0,
            open: false,
        });

        try {
            const html = await get(`${server.url}/`);
            const state = JSON.parse(await get(`${server.url}/api/state`));

            expect(html).toContain('Warden Console');
            expect(state.scan.summary.total).toBe(2);
            expect(state.scan.topFindings[0].id).toBe('CRIT-1');
        } finally {
            await server.close();
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });
});

function createConsoleFixture(): string {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'warden-console-'));
    const scanDir = path.join(tempDir, 'scan-results');
    fs.mkdirSync(scanDir, { recursive: true });
    fs.writeFileSync(
        path.join(scanDir, 'scan-results.json'),
        JSON.stringify(scanResult, null, 2),
        'utf-8'
    );
    fs.writeFileSync(
        path.join(scanDir, 'history.json'),
        JSON.stringify(
            [
                {
                    timestamp: '2026-05-11T12:00:00.000Z',
                    mode: 'sast',
                    targetPath: tempDir,
                    totalVulnerabilities: 3,
                    critical: 1,
                    high: 1,
                    medium: 1,
                    low: 0,
                    appliedFixes: 0,
                    attemptedFixes: 1,
                    autoFixableCount: 2,
                    manualCount: 1,
                    riskScore: 100,
                },
                {
                    timestamp: '2026-05-12T12:00:00.000Z',
                    mode: 'sast',
                    targetPath: tempDir,
                    totalVulnerabilities: 2,
                    critical: 1,
                    high: 0,
                    medium: 1,
                    low: 0,
                    appliedFixes: 1,
                    attemptedFixes: 1,
                    autoFixableCount: 1,
                    manualCount: 1,
                    riskScore: 95,
                },
            ],
            null,
            2
        ),
        'utf-8'
    );
    fs.writeFileSync(
        path.join(scanDir, 'memory.json'),
        JSON.stringify(
            {
                [tempDir]: {
                    runCount: 2,
                    packages: {
                        express: {
                            occurrences: 2,
                            lastSeverity: 'critical',
                        },
                    },
                },
            },
            null,
            2
        ),
        'utf-8'
    );

    return tempDir;
}

function get(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
        http.get(url, (response) => {
            let body = '';
            response.setEncoding('utf-8');
            response.on('data', (chunk) => {
                body += chunk;
            });
            response.on('end', () => {
                resolve(body);
            });
        }).on('error', reject);
    });
}
