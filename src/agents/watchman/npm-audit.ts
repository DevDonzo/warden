import { exec } from 'child_process';
import { promisify } from 'util';
import { ScanResult, Vulnerability } from './snyk';
import { logger } from '../../utils/logger';

const execAsync = promisify(exec);

const SEVERITY_MAPPING: Record<string, Vulnerability['severity']> = {
    critical: 'critical',
    high: 'high',
    moderate: 'medium',
    medium: 'medium',
    low: 'low',
    info: 'low',
};

export class NpmAuditScanner {
    /**
     * Parse severity string to normalized severity level
     */
    parseSeverity(severityStr: string): Vulnerability['severity'] {
        const normalized = (severityStr || 'low').toLowerCase();
        return SEVERITY_MAPPING[normalized] || 'medium';
    }

    /**
     * Format npm audit vulnerabilities object into our standard format
     */
    formatVulnerabilities(data: any): Vulnerability[] {
        const vulnerabilities: Vulnerability[] = [];

        if (!data.vulnerabilities) {
            return vulnerabilities;
        }

        for (const [key, val] of Object.entries(data.vulnerabilities)) {
            const vuln = val as any;
            const severity = this.parseSeverity(vuln.severity);

            vulnerabilities.push({
                id: `NPM-${key}-${vuln.via?.[0]?.source || 'audit'}`,
                title:
                    typeof vuln.via?.[0] === 'object'
                        ? vuln.via[0].title
                        : 'Vulnerability found via npm audit',
                severity,
                packageName: vuln.name,
                version: vuln.range || 'unknown',
                fixedIn: vuln.fixAvailable ? ['npm audit fix'] : [],
                description: `Dependency path: ${key}`,
                cvssScore: undefined,
            });
        }

        return vulnerabilities;
    }

    async scan(): Promise<ScanResult> {
        logger.watchman('Running npm audit fallback...');

        try {
            // npm audit returns exit code 1 if vulnerabilities are found, so we need to handle that
            let jsonOutput = '';
            try {
                const { stdout } = await execAsync('npm audit --json', {
                    maxBuffer: 10 * 1024 * 1024,
                });
                jsonOutput = stdout;
            } catch (error: any) {
                // If the error code is 1, it just means vulns were found, which is fine.
                // If it's something else, then it might be a real error.
                if (error.stdout) {
                    jsonOutput = error.stdout;
                } else {
                    throw error;
                }
            }

            return this.parseAuditOutput(jsonOutput);
        } catch (error: any) {
            logger.error('npm audit failed', error);
            throw new Error(`npm audit scan failed: ${error.message}`);
        }
    }

    private parseAuditOutput(jsonOutput: string): ScanResult {
        let data: any;
        try {
            data = JSON.parse(jsonOutput);
        } catch (e) {
            throw new Error('Failed to parse npm audit JSON output');
        }

        const vulnerabilities = this.formatVulnerabilities(data);
        const summary = {
            total: 0,
            critical: 0,
            high: 0,
            medium: 0,
            low: 0,
        };

        for (const vuln of vulnerabilities) {
            summary.total++;
            if (Object.hasOwn(summary, vuln.severity)) {
                summary[vuln.severity]++;
            }
        }

        return {
            timestamp: new Date().toISOString(),
            vulnerabilities,
            summary,
        };
    }
}
