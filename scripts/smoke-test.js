#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const distRoot = path.join(repoRoot, 'dist');

function requireDist(modulePath) {
  const resolved = path.join(distRoot, modulePath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Missing built module: ${resolved}. Run "npm run build" before smoke testing.`);
  }

  return require(resolved);
}

function assertFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Expected smoke artifact was not written: ${filePath}`);
  }
}

function assertJsonObject(filePath) {
  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  if (!parsed || typeof parsed !== 'object') {
    throw new Error(`Expected JSON object at ${filePath}`);
  }

  return parsed;
}

async function main() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'warden-smoke-'));
  const originalCwd = process.cwd();

  try {
    process.chdir(tempDir);

    const { MockScanner } = requireDist('scanners/mock-scanner.js');
    const { buildRemediationPlan, createHistoryEntry } = requireDist('utils/advisor.js');
    const { RunHistoryService } = requireDist('utils/history.js');
    const { MemoryService } = requireDist('utils/memory.js');
    const { evaluatePolicy, writeApprovalRequest } = requireDist('utils/policy.js');
    const { writeAgentRunRecord, writeHtmlReport, writeMarkdownReport } =
      requireDist('utils/reports.js');

    const scanner = new MockScanner();
    const scanResult = await scanner.scan();
    scanResult.projectPath = tempDir;
    scanResult.scanMode = 'sast';

    const runResult = {
      mode: 'sast',
      targetPath: tempDir,
      repository: 'smoke/local-fixture',
      dryRun: true,
      scanResult,
      selectedVulnerabilityIds: scanResult.vulnerabilities.slice(0, 2).map((finding) => finding.id),
      attemptedFixes: 2,
      appliedFixes: 0,
      branches: [],
      pullRequestUrls: [],
      warnings: ['Smoke test runs in dry-run mode.'],
    };

    const remediationPlan = buildRemediationPlan(scanResult, runResult);
    runResult.remediationPlan = remediationPlan;

    const policyDecision = evaluatePolicy(
      scanResult,
      remediationPlan,
      { ci: true },
      {
        policy: {
          failOnSeverity: 'critical',
          failOnPosture: 'critical',
          requireApprovalAboveSeverity: 'critical',
        },
      }
    );

    fs.mkdirSync('scan-results', { recursive: true });
    fs.writeFileSync(
      path.join('scan-results', 'scan-results.json'),
      JSON.stringify(scanResult, null, 2),
      'utf-8'
    );

    writeMarkdownReport(scanResult, runResult, remediationPlan);
    writeHtmlReport(scanResult);
    writeAgentRunRecord(scanResult, runResult, remediationPlan, policyDecision);
    writeApprovalRequest(scanResult, remediationPlan, policyDecision);

    const historyService = new RunHistoryService();
    historyService.append(createHistoryEntry(scanResult, runResult));

    const memoryService = new MemoryService();
    memoryService.update(runResult.repository, scanResult);

    const expectedArtifacts = [
      'scan-results/scan-results.json',
      'scan-results/warden-report.md',
      'scan-results/scan-results.html',
      'scan-results/agent-run-record.json',
      'scan-results/warden-approval-request.json',
      'scan-results/history.json',
      'scan-results/memory.json',
    ];

    expectedArtifacts.forEach((artifactPath) => assertFile(path.resolve(artifactPath)));

    const agentRunRecord = assertJsonObject(path.resolve('scan-results/agent-run-record.json'));
    if (!Array.isArray(agentRunRecord.whyMatters) || agentRunRecord.whyMatters.length === 0) {
      throw new Error('Agent run record is missing whyMatters context.');
    }

    if (!agentRunRecord.policyDecision || agentRunRecord.policyDecision.approvalRequired !== true) {
      throw new Error('Agent run record is missing approval policy context.');
    }

    const scanResults = assertJsonObject(path.resolve('scan-results/scan-results.json'));
    if (scanResults.summary.total < 1) {
      throw new Error('Smoke scan did not produce vulnerabilities.');
    }

    console.log(`Warden smoke test passed in ${tempDir}`);
  } finally {
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
