import { Severity, Vulnerability } from '../types';
import { SEVERITY_PRIORITY } from '../constants';

export function isSeverityAtLeast(
    severity: Severity,
    minimumSeverity: Severity
): boolean {
    return SEVERITY_PRIORITY[severity] >= SEVERITY_PRIORITY[minimumSeverity];
}

export function selectVulnerabilitiesForFix(
    vulnerabilities: Vulnerability[],
    minimumSeverity: Severity,
    maxFixes: number
): Vulnerability[] {
    if (maxFixes <= 0) {
        return [];
    }

    return [...vulnerabilities]
        .filter(vulnerability => isSeverityAtLeast(vulnerability.severity, minimumSeverity))
        .sort((left, right) => {
            const severityDelta =
                SEVERITY_PRIORITY[right.severity] - SEVERITY_PRIORITY[left.severity];

            if (severityDelta !== 0) {
                return severityDelta;
            }

            return (right.cvssScore ?? 0) - (left.cvssScore ?? 0);
        })
        .slice(0, maxFixes);
}
