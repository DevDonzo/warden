import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { RunHistoryService } from '../src/utils/history';
import { RunHistoryEntry } from '../src/types';

describe('RunHistoryService', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'warden-history-'));

    afterAll(() => {
        fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('appends entries and computes trend', () => {
        const service = new RunHistoryService(tempDir);
        const first: RunHistoryEntry = {
            timestamp: '2026-05-09T12:00:00.000Z',
            mode: 'sast',
            targetPath: '/tmp/project',
            totalVulnerabilities: 5,
            critical: 1,
            high: 2,
            medium: 1,
            low: 1,
            appliedFixes: 1,
            attemptedFixes: 2,
            autoFixableCount: 3,
            manualCount: 2,
            riskScore: 90,
        };

        const second: RunHistoryEntry = {
            ...first,
            timestamp: '2026-05-10T12:00:00.000Z',
            totalVulnerabilities: 2,
            critical: 0,
            high: 1,
            medium: 1,
            low: 0,
            appliedFixes: 2,
            attemptedFixes: 2,
            autoFixableCount: 1,
            manualCount: 1,
            riskScore: 40,
        };

        expect(service.append(first).trend).toBe('first-run');
        expect(service.append(second).trend).toBe('improving');
        expect(service.readAll()).toHaveLength(2);
    });
});
