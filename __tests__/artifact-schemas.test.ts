import * as fs from 'fs';
import * as path from 'path';

const schemaDir = path.resolve(__dirname, '../schemas');

describe('artifact schemas', () => {
    it('publishes machine-readable contracts for durable Warden artifacts', () => {
        const expectedSchemas = [
            'agent-run-record.schema.json',
            'approval-request.schema.json',
            'history.schema.json',
            'memory.schema.json',
            'scan-results.schema.json',
        ];

        for (const fileName of expectedSchemas) {
            const schemaPath = path.join(schemaDir, fileName);
            expect(fs.existsSync(schemaPath)).toBe(true);

            const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
            expect(schema.$schema).toContain('json-schema.org');
            expect(schema.$id).toContain(fileName);
            expect(schema.title).toBeTruthy();
        }
    });

    it('keeps the agent run record contract useful for future agents', () => {
        const schema = JSON.parse(
            fs.readFileSync(path.join(schemaDir, 'agent-run-record.schema.json'), 'utf-8')
        );

        expect(schema.required).toEqual(
            expect.arrayContaining([
                'scanSummary',
                'riskScore',
                'posture',
                'selectedVulnerabilityIds',
                'attemptedFixes',
                'appliedFixes',
                'warnings',
                'whyMatters',
                'topFindings',
            ])
        );
        expect(schema.properties.policyDecision.required).toEqual(
            expect.arrayContaining(['approvalRequired', 'approvalSatisfied', 'reasons'])
        );
    });
});
