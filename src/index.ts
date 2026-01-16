import * as dotenv from 'dotenv';
import { loadRules } from './core/rules';
import { loadSpecs } from './core/spec';
import { SnykScanner } from './agents/watchman/snyk';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

/**
 * Shared orchestration logic to run Engineer and Diplomat agents
 */
async function orchestrateFix(scanResult: any) {
    const snyk = new SnykScanner();
    const highPriority = snyk.filterHighPriority(scanResult);

    if (highPriority.length > 0) {
        console.log(`\n🚨 Identified ${highPriority.length} high-priority vulnerabilities.`);

        // --- THE ENGINEER ---
        console.log("\n🛠️  AGENT: THE ENGINEER | Diagnosing & Patching...");
        const { EngineerAgent } = await import('./agents/engineer');
        const engineer = new EngineerAgent();

        const resultsPath = path.resolve(process.cwd(), 'scan-results/scan-results.json');
        const diagnoses = await engineer.diagnose(resultsPath);

        if (diagnoses.length > 0) {
            const topIssue = diagnoses[0];
            const fixSuccess = await engineer.applyFix(topIssue);

            if (fixSuccess) {
                // --- THE DIPLOMAT ---
                console.log("\n🕊️  AGENT: THE DIPLOMAT | Opening Pull Request...");
                const { DiplomatAgent } = await import('./agents/diplomat');
                const diplomat = new DiplomatAgent();

                const pkgName = topIssue.description.match(/in ([a-z0-9-]+)@/)?.[1] || 'unknown';
                const branchName = `sentinel/fix-${pkgName}`;

                const prUrl = await diplomat.createPullRequest({
                    branch: branchName,
                    title: `[SECURITY] Fix for ${topIssue.vulnerabilityId}`,
                    body: `## 🛡️ Automated Security Fix\n\n${topIssue.description}\n\n**Remediation**: ${topIssue.suggestedFix}\n\n---\n*Verified by The Sentinel Patching Engine* ✅`
                });

                if (prUrl) {
                    console.log(`\n✨ AUTOMATION COMPLETE. PR Lifecycle initiated: ${prUrl}`);
                }
            }
        }
    } else {
        console.log("\n✅ Clean Audit: No high-priority vulnerabilities identified.");
    }
}

async function main() {
    try {
        console.log("\n🛡️  THE SENTINEL | Autonomous Security Orchestrator");
        console.log("=".repeat(60));

        // 1. Core Logic
        const rules = loadRules();
        const specs = loadSpecs();

        if (specs.length === 0) {
            console.warn("⚠️  No active specifications found in /SPEC. Patrol aborted.");
            return;
        }

        // 2. Scan Execution
        console.log("\n🔍 AGENT: THE WATCHMAN | Running Security Scan...");
        const snyk = new SnykScanner();

        try {
            const scanResult = await snyk.test();
            snyk.printSummary(scanResult);

            // 3. Orchestration
            await orchestrateFix(scanResult);
            console.log("\n🏁 Patrol Session Completed Successfully.");

        } catch (e: any) {
            console.error("\n❌ Scanner Execution Failed:", e.message);
            console.log("\n💡 Active Fallback: Running in DEMO MODE with internal datasets...\n");

            const { generateMockScanResult } = await import('./utils/mock-data');
            const scanResult = generateMockScanResult();

            const outputDir = path.resolve(process.cwd(), 'scan-results');
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }
            fs.writeFileSync(
                path.join(outputDir, 'scan-results.json'),
                JSON.stringify(scanResult, null, 2)
            );

            snyk.printSummary(scanResult);
            await orchestrateFix(scanResult);

            console.log("\n🏁 Session Completed (Demonstration Mode).");
        }

    } catch (error) {
        console.error("❌ Critical System Error:", error);
        process.exit(1);
    }
}

main();
