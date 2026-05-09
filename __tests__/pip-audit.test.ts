import { PipAuditScanner } from '../src/agents/watchman/pip-audit';

describe('PipAuditScanner', () => {
    it('parses pip-audit JSON output into vulnerabilities', () => {
        const scanner = new PipAuditScanner();
        const output = JSON.stringify({
            dependencies: [
                {
                    name: 'jinja2',
                    version: '2.11.2',
                    vulns: [
                        {
                            id: 'PYSEC-2021-66',
                            description: 'High severity template injection issue',
                            aliases: ['CVE-2020-28493'],
                            fix_versions: ['2.11.3']
                        }
                    ]
                }
            ]
        });

        const result = scanner.parseAuditOutput(output);
        expect(result.summary.total).toBe(1);
        expect(result.vulnerabilities[0].packageName).toBe('jinja2');
        expect(result.vulnerabilities[0].fixedIn).toEqual(['2.11.3']);
        expect(result.vulnerabilities[0].ecosystem).toBe('python');
    });
});
