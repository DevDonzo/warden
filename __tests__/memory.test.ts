import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { MemoryService } from '../src/utils/memory';
import { ScanResult } from '../src/types';

describe('MemoryService', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'warden-memory-'));

    afterAll(() => {
        fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('tracks recurring vulnerable packages by repo key', () => {
        const service = new MemoryService(tempDir);
        const result: ScanResult = {
            timestamp: '2026-05-09T12:00:00.000Z',
            vulnerabilities: [
                {
                    id: '1',
                    title: 'Issue 1',
                    severity: 'high',
                    packageName: 'lodash',
                    version: '1.0.0',
                    fixedIn: ['1.0.1'],
                    description: 'desc',
                },
                {
                    id: '2',
                    title: 'Issue 2',
                    severity: 'critical',
                    packageName: 'lodash',
                    version: '1.0.0',
                    fixedIn: ['1.0.1'],
                    description: 'desc',
                },
            ],
            summary: { total: 2, critical: 1, high: 1, medium: 0, low: 0 },
        };

        service.update('owner/repo', result);
        const snapshot = service.update('owner/repo', result);

        expect(snapshot.runCount).toBe(2);
        expect(snapshot.topHotspots[0].packageName).toBe('lodash');
        expect(snapshot.topHotspots[0].occurrences).toBe(4);
        expect(snapshot.topHotspots[0].lastSeverity).toBe('critical');
    });
});
