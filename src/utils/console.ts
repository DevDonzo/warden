import * as fs from 'fs';
import * as http from 'http';
import * as path from 'path';
import { spawn } from 'child_process';
import { AddressInfo } from 'net';
import {
    BaselineComparison,
    MemoryHotspot,
    RemediationPlan,
    RunHistoryEntry,
    ScanResult,
    Severity,
    WardenBaseline,
    Vulnerability,
} from '../types';
import {
    SCAN_RESULTS_DIR,
    SCAN_RESULTS_FILE,
    SECURITY_ADVISORY_FILE,
    SEVERITY_PRIORITY,
    WARDEN_BASELINE_FILE,
} from '../constants';
import { buildRemediationPlan } from './advisor';
import { compareBaseline } from './baseline';

const DEFAULT_CONSOLE_PORT = 8787;
const MAX_PORT_ATTEMPTS = 20;

export interface WardenConsoleOptions {
    host?: string;
    port?: number;
    open?: boolean;
    rootDir?: string;
}

export interface WardenConsoleHandle {
    url: string;
    port: number;
    server: http.Server;
    close: () => Promise<void>;
}

export interface WardenConsoleState {
    generatedAt: string;
    projectRoot: string;
    scan?: {
        timestamp: string;
        scanner?: string;
        mode?: string;
        summary: ScanResult['summary'];
        riskScore: number;
        posture: RemediationPlan['posture'];
        autoFixableCount: number;
        manualCount: number;
        exploitCount: number;
        topFindings: Vulnerability[];
    };
    baseline?: {
        exists: boolean;
        generatedAt?: string;
        riskScore?: number;
        comparison?: BaselineComparison;
    };
    history: {
        entries: RunHistoryEntry[];
        trend: 'improving' | 'worsening' | 'unchanged' | 'first-run' | 'unknown';
    };
    memory: {
        runCount: number;
        topHotspots: MemoryHotspot[];
    };
    artifacts: {
        scanResults: ArtifactStatus;
        markdownReport: ArtifactStatus;
        htmlReport: ArtifactStatus;
        approvalRequest: ArtifactStatus;
        advisory: ArtifactStatus;
        agentRunRecord: ArtifactStatus;
        baseline: ArtifactStatus;
    };
}

interface ArtifactStatus {
    path: string;
    exists: boolean;
}

interface MemoryStore {
    [repoKey: string]: {
        runCount: number;
        packages: Record<string, { occurrences: number; lastSeverity: Severity }>;
    };
}

export async function startWardenConsole(
    options: WardenConsoleOptions = {}
): Promise<WardenConsoleHandle> {
    const host = options.host || '127.0.0.1';
    const requestedPort = options.port ?? DEFAULT_CONSOLE_PORT;
    const rootDir = path.resolve(options.rootDir || process.cwd());
    const { server, port } = await listenOnAvailablePort(
        (request, response) => handleConsoleRequest(request, response, rootDir),
        host,
        requestedPort
    );
    const url = `http://${host}:${port}`;

    if (options.open !== false) {
        openBrowser(url);
    }

    return {
        url,
        port,
        server,
        close: () =>
            new Promise((resolve, reject) => {
                server.close((error) => (error ? reject(error) : resolve()));
            }),
    };
}

export function buildConsoleState(rootDir: string = process.cwd()): WardenConsoleState {
    const resolvedRoot = path.resolve(rootDir);
    const scanResultsPath = path.join(resolvedRoot, SCAN_RESULTS_DIR, SCAN_RESULTS_FILE);
    const historyPath = path.join(resolvedRoot, SCAN_RESULTS_DIR, 'history.json');
    const memoryPath = path.join(resolvedRoot, SCAN_RESULTS_DIR, 'memory.json');
    const markdownReportPath = path.join(resolvedRoot, SCAN_RESULTS_DIR, 'warden-report.md');
    const htmlReportPath = path.join(resolvedRoot, SCAN_RESULTS_DIR, 'scan-results.html');
    const approvalRequestPath = path.join(
        resolvedRoot,
        SCAN_RESULTS_DIR,
        'warden-approval-request.json'
    );
    const agentRunRecordPath = path.join(resolvedRoot, SCAN_RESULTS_DIR, 'agent-run-record.json');
    const advisoryPath = path.join(resolvedRoot, SECURITY_ADVISORY_FILE);
    const baselinePath = path.join(resolvedRoot, WARDEN_BASELINE_FILE);
    const scanResult = readJsonFile<ScanResult>(scanResultsPath);
    const baseline = readJsonFile<WardenBaseline>(baselinePath);
    const history = readHistory(historyPath);
    const memory = readMemory(memoryPath, resolvedRoot);

    return {
        generatedAt: new Date().toISOString(),
        projectRoot: resolvedRoot,
        scan: scanResult ? summarizeScan(scanResult) : undefined,
        baseline: buildBaselineState(scanResult, baseline),
        history: {
            entries: history.slice(-12).reverse(),
            trend: computeTrend(history),
        },
        memory,
        artifacts: {
            scanResults: artifact(scanResultsPath),
            markdownReport: artifact(markdownReportPath),
            htmlReport: artifact(htmlReportPath),
            approvalRequest: artifact(approvalRequestPath),
            agentRunRecord: artifact(agentRunRecordPath),
            advisory: artifact(advisoryPath),
            baseline: artifact(baselinePath),
        },
    };
}

function handleConsoleRequest(
    request: http.IncomingMessage,
    response: http.ServerResponse,
    rootDir: string
): void {
    const requestUrl = new URL(request.url || '/', 'http://warden.local');

    try {
        if (requestUrl.pathname === '/') {
            send(response, 200, renderConsoleHtml(), 'text/html; charset=utf-8');
            return;
        }

        if (requestUrl.pathname === '/api/state') {
            sendJson(response, buildConsoleState(rootDir));
            return;
        }

        if (requestUrl.pathname === '/assets/warden-mark.svg') {
            send(response, 200, readWardenMark(), 'image/svg+xml; charset=utf-8');
            return;
        }

        sendJson(response, { error: 'Not found' }, 404);
    } catch (error: any) {
        sendJson(response, { error: error.message || 'Console request failed' }, 500);
    }
}

function summarizeScan(scanResult: ScanResult): WardenConsoleState['scan'] {
    const plan = buildRemediationPlan(scanResult, {
        appliedFixes: 0,
        attemptedFixes: 0,
        warnings: [],
    });

    return {
        timestamp: scanResult.timestamp,
        scanner: scanResult.scanner,
        mode: scanResult.scanMode,
        summary: scanResult.summary,
        riskScore: plan.riskScore,
        posture: plan.posture,
        autoFixableCount: plan.autoFixableCount,
        manualCount: plan.manualCount,
        exploitCount: plan.exploitCount,
        topFindings: [...scanResult.vulnerabilities]
            .sort((left, right) => {
                const severityDelta =
                    SEVERITY_PRIORITY[right.severity] - SEVERITY_PRIORITY[left.severity];

                if (severityDelta !== 0) {
                    return severityDelta;
                }

                return (right.cvssScore || 0) - (left.cvssScore || 0);
            })
            .slice(0, 8),
    };
}

function buildBaselineState(
    scanResult: ScanResult | undefined,
    baseline: WardenBaseline | undefined
): WardenConsoleState['baseline'] {
    if (!baseline) {
        return { exists: false };
    }

    return {
        exists: true,
        generatedAt: baseline.generatedAt,
        riskScore: baseline.riskScore,
        comparison: scanResult ? compareBaseline(scanResult, baseline) : undefined,
    };
}

function readHistory(historyPath: string): RunHistoryEntry[] {
    const parsed = readJsonFile<RunHistoryEntry[]>(historyPath);
    return Array.isArray(parsed) ? parsed : [];
}

function readMemory(memoryPath: string, repoKey: string): WardenConsoleState['memory'] {
    const store = readJsonFile<MemoryStore>(memoryPath);
    const repoMemory = store?.[repoKey] || (store ? Object.values(store)[0] : undefined);

    if (!repoMemory) {
        return {
            runCount: 0,
            topHotspots: [],
        };
    }

    return {
        runCount: repoMemory.runCount,
        topHotspots: Object.entries(repoMemory.packages)
            .map(([packageName, value]) => ({
                packageName,
                occurrences: value.occurrences,
                lastSeverity: value.lastSeverity,
            }))
            .sort((left, right) => {
                if (right.occurrences !== left.occurrences) {
                    return right.occurrences - left.occurrences;
                }

                return SEVERITY_PRIORITY[right.lastSeverity] - SEVERITY_PRIORITY[left.lastSeverity];
            })
            .slice(0, 6),
    };
}

function computeTrend(history: RunHistoryEntry[]): WardenConsoleState['history']['trend'] {
    if (history.length === 0) {
        return 'unknown';
    }

    if (history.length === 1) {
        return 'first-run';
    }

    const previous = history[history.length - 2];
    const latest = history[history.length - 1];

    if (
        latest.riskScore < previous.riskScore ||
        latest.totalVulnerabilities < previous.totalVulnerabilities
    ) {
        return 'improving';
    }

    if (
        latest.riskScore > previous.riskScore ||
        latest.totalVulnerabilities > previous.totalVulnerabilities
    ) {
        return 'worsening';
    }

    return 'unchanged';
}

function readJsonFile<T>(filePath: string): T | undefined {
    if (!fs.existsSync(filePath)) {
        return undefined;
    }

    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
    } catch {
        return undefined;
    }
}

function artifact(filePath: string): ArtifactStatus {
    return {
        path: filePath,
        exists: fs.existsSync(filePath),
    };
}

function sendJson(response: http.ServerResponse, payload: unknown, statusCode = 200): void {
    send(response, statusCode, JSON.stringify(payload, null, 2), 'application/json; charset=utf-8');
}

function send(
    response: http.ServerResponse,
    statusCode: number,
    body: string,
    contentType: string
): void {
    response.writeHead(statusCode, {
        'Content-Type': contentType,
        'Cache-Control': 'no-store',
    });
    response.end(body);
}

async function listenOnAvailablePort(
    handler: http.RequestListener,
    host: string,
    requestedPort: number
): Promise<{ server: http.Server; port: number }> {
    const ports =
        requestedPort === 0
            ? [0]
            : Array.from({ length: MAX_PORT_ATTEMPTS }, (_, index) => requestedPort + index);

    for (const port of ports) {
        const server = http.createServer(handler);

        try {
            const resolvedPort = await listen(server, host, port);
            return { server, port: resolvedPort };
        } catch (error: any) {
            server.close();

            if (error.code !== 'EADDRINUSE' || port === ports[ports.length - 1]) {
                throw error;
            }
        }
    }

    throw new Error('No available port found for Warden console.');
}

function listen(server: http.Server, host: string, port: number): Promise<number> {
    return new Promise((resolve, reject) => {
        const onError = (error: Error) => {
            server.off('listening', onListening);
            reject(error);
        };
        const onListening = () => {
            server.off('error', onError);
            const address = server.address() as AddressInfo;
            resolve(address.port);
        };

        server.once('error', onError);
        server.once('listening', onListening);
        server.listen(port, host);
    });
}

function openBrowser(url: string): void {
    const command =
        process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open';
    const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
    const child = spawn(command, args, {
        detached: true,
        stdio: 'ignore',
    });

    child.on('error', () => undefined);
    child.unref();
}

function readWardenMark(): string {
    const assetPath = path.resolve(__dirname, '../../assets/warden-mark.svg');

    if (fs.existsSync(assetPath)) {
        return fs.readFileSync(assetPath, 'utf-8');
    }

    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#020617"/><path d="M32 8l18 7v14c0 12-7 22-18 27-11-5-18-15-18-27V15l18-7z" fill="#0f766e" stroke="#5eead4" stroke-width="2"/></svg>';
}

function renderConsoleHtml(): string {
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Warden Console</title>
<style>
:root {
    color-scheme: dark;
    --ink: #e5f7f6;
    --muted: #91a5a4;
    --faint: #596967;
    --panel: rgba(11, 18, 18, 0.84);
    --panel-strong: rgba(6, 10, 11, 0.94);
    --line: rgba(143, 255, 232, 0.18);
    --mint: #5eead4;
    --cyan: #38bdf8;
    --amber: #fbbf24;
    --red: #fb7185;
    --green: #34d399;
    --violet: #a78bfa;
}
* { box-sizing: border-box; }
html, body { min-height: 100%; }
body {
    margin: 0;
    background:
        radial-gradient(circle at 9% 6%, rgba(94, 234, 212, 0.16), transparent 24rem),
        radial-gradient(circle at 86% 14%, rgba(251, 191, 36, 0.12), transparent 22rem),
        linear-gradient(135deg, #050606 0%, #0d1110 48%, #18130b 100%);
    color: var(--ink);
    font-family: "Avenir Next", "DIN Alternate", "Segoe UI", sans-serif;
    overflow-x: hidden;
}
body:before {
    content: "";
    position: fixed;
    inset: 0;
    pointer-events: none;
    background-image:
        linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
    background-size: 36px 36px;
    mask-image: linear-gradient(to bottom, black, transparent 88%);
}
.shell {
    position: relative;
    display: grid;
    grid-template-columns: 280px minmax(0, 1fr);
    min-height: 100vh;
}
.rail {
    border-right: 1px solid var(--line);
    background: rgba(3, 7, 7, 0.72);
    padding: 28px 22px;
}
.brand {
    display: grid;
    grid-template-columns: 54px 1fr;
    gap: 14px;
    align-items: center;
}
.brand img {
    width: 54px;
    height: 54px;
    filter: drop-shadow(0 0 22px rgba(94, 234, 212, 0.28));
}
.brand h1 {
    margin: 0;
    font-size: 23px;
    line-height: 1;
    letter-spacing: 0;
}
.brand p {
    margin: 5px 0 0;
    color: var(--muted);
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 11px;
    text-transform: uppercase;
}
.nav {
    display: grid;
    gap: 9px;
    margin-top: 34px;
}
.nav span,
.artifact {
    border: 1px solid var(--line);
    border-radius: 7px;
    padding: 10px 11px;
    color: var(--muted);
    background: rgba(255,255,255,0.025);
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 12px;
}
.artifact[data-exists="true"] { color: var(--mint); }
.rail-title {
    margin: 28px 0 10px;
    color: var(--faint);
    font-size: 11px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    text-transform: uppercase;
}
main {
    padding: 28px;
}
.topbar {
    display: flex;
    justify-content: space-between;
    gap: 18px;
    align-items: flex-start;
    margin-bottom: 24px;
}
.kicker {
    margin: 0 0 8px;
    color: var(--amber);
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 12px;
    text-transform: uppercase;
}
.headline {
    margin: 0;
    max-width: 820px;
    font-size: clamp(38px, 7vw, 82px);
    line-height: 0.88;
    letter-spacing: 0;
}
.clock {
    min-width: 210px;
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 13px;
    background: var(--panel);
    color: var(--muted);
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 12px;
}
.grid {
    display: grid;
    grid-template-columns: repeat(12, minmax(0, 1fr));
    gap: 14px;
}
.panel {
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--panel);
    box-shadow: 0 18px 60px rgba(0, 0, 0, 0.28);
    overflow: hidden;
}
.panel h2 {
    margin: 0;
    padding: 15px 16px;
    border-bottom: 1px solid var(--line);
    color: var(--ink);
    font-size: 13px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    text-transform: uppercase;
}
.panel-body { padding: 16px; }
.span-3 { grid-column: span 3; }
.span-4 { grid-column: span 4; }
.span-5 { grid-column: span 5; }
.span-7 { grid-column: span 7; }
.span-8 { grid-column: span 8; }
.span-12 { grid-column: span 12; }
.metric {
    display: grid;
    gap: 8px;
    min-height: 142px;
}
.metric-value {
    font-size: 48px;
    line-height: 1;
    font-weight: 800;
}
.metric-label {
    color: var(--muted);
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 12px;
    text-transform: uppercase;
}
.posture {
    display: inline-flex;
    width: fit-content;
    align-items: center;
    border-radius: 999px;
    border: 1px solid currentColor;
    padding: 5px 9px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 12px;
    text-transform: uppercase;
}
.critical, .high, .worsening { color: var(--red); }
.elevated, .medium, .first-run { color: var(--amber); }
.stable, .low, .improving { color: var(--green); }
.guarded, .unchanged, .unknown { color: var(--cyan); }
.table {
    display: grid;
    gap: 8px;
}
.row {
    display: grid;
    grid-template-columns: 92px minmax(0, 1fr) 90px;
    gap: 12px;
    align-items: center;
    padding: 11px 0;
    border-bottom: 1px solid rgba(143, 255, 232, 0.10);
}
.row:last-child { border-bottom: 0; }
.row strong {
    color: var(--ink);
    font-size: 14px;
}
.row small {
    display: block;
    margin-top: 3px;
    color: var(--faint);
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 11px;
    overflow-wrap: anywhere;
}
.pill {
    width: fit-content;
    border: 1px solid currentColor;
    border-radius: 999px;
    padding: 4px 8px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 11px;
    text-transform: uppercase;
}
.timeline {
    display: grid;
    gap: 9px;
}
.tick {
    display: grid;
    grid-template-columns: 110px 1fr 64px;
    gap: 12px;
    align-items: center;
    color: var(--muted);
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 12px;
}
.bar {
    height: 8px;
    border-radius: 999px;
    background: rgba(255,255,255,0.08);
    overflow: hidden;
}
.bar i {
    display: block;
    height: 100%;
    width: var(--value);
    background: linear-gradient(90deg, var(--mint), var(--amber), var(--red));
}
.empty {
    color: var(--muted);
    padding: 22px;
    border: 1px dashed var(--line);
    border-radius: 8px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
@media (max-width: 980px) {
    .shell { grid-template-columns: 1fr; }
    .rail { border-right: 0; border-bottom: 1px solid var(--line); }
    .topbar { display: grid; }
    .span-3, .span-4, .span-5, .span-7, .span-8 { grid-column: span 12; }
}
</style>
</head>
<body>
<div class="shell">
    <aside class="rail">
        <div class="brand">
            <img src="/assets/warden-mark.svg" alt="">
            <div>
                <h1>Warden</h1>
                <p>local console</p>
            </div>
        </div>
        <div class="nav">
            <span id="root">loading</span>
            <span id="scanner">scanner pending</span>
            <span id="mode">mode pending</span>
        </div>
        <p class="rail-title">Artifacts</p>
        <div id="artifacts" class="nav"></div>
    </aside>
    <main>
        <div class="topbar">
            <div>
                <p class="kicker">Autonomous security command center</p>
                <h2 class="headline" id="headline">Watching the repo.</h2>
            </div>
            <div class="clock" id="clock">syncing</div>
        </div>
        <section class="grid" id="content"></section>
    </main>
</div>
<script>
const severityClass = { critical: 'critical', high: 'high', medium: 'medium', low: 'low' };

function node(tag, attrs, children) {
    const element = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([key, value]) => {
        if (key === 'class') element.className = value;
        else if (key === 'text') element.textContent = value;
        else element.setAttribute(key, value);
    });
    (children || []).forEach((child) => {
        if (child) element.appendChild(child);
    });
    return element;
}

function metric(label, value, tone, note) {
    return node('article', { class: 'panel span-3' }, [
        node('h2', { text: label }),
        node('div', { class: 'panel-body metric' }, [
            node('div', { class: 'metric-value ' + (tone || ''), text: String(value) }),
            node('div', { class: 'metric-label', text: note || 'current scan' })
        ])
    ]);
}

function panel(title, span, body) {
    return node('article', { class: 'panel ' + span }, [
        node('h2', { text: title }),
        node('div', { class: 'panel-body' }, [body])
    ]);
}

function findingRows(findings) {
    if (!findings || findings.length === 0) {
        return node('div', { class: 'empty', text: 'No findings loaded yet.' });
    }
    return node('div', { class: 'table' }, findings.map((finding) =>
        node('div', { class: 'row' }, [
            node('span', { class: 'pill ' + severityClass[finding.severity], text: finding.severity }),
            node('div', {}, [
                node('strong', { text: finding.packageName || finding.service || finding.id }),
                node('small', { text: finding.title + ' / ' + finding.id })
            ]),
            node('small', { text: finding.version || 'n/a' })
        ])
    ));
}

function historyRows(entries) {
    if (!entries || entries.length === 0) {
        return node('div', { class: 'empty', text: 'No run history yet.' });
    }
    return node('div', { class: 'timeline' }, entries.slice(0, 8).map((entry) => {
        const width = Math.max(4, Math.min(100, entry.riskScore));
        return node('div', { class: 'tick' }, [
            node('span', { text: new Date(entry.timestamp).toLocaleDateString() }),
            node('span', { class: 'bar' }, [node('i', { style: '--value:' + width + '%' })]),
            node('span', { text: entry.riskScore + '/100' })
        ]);
    }));
}

function hotspotRows(hotspots) {
    if (!hotspots || hotspots.length === 0) {
        return node('div', { class: 'empty', text: 'No recurring hotspots yet.' });
    }
    return node('div', { class: 'table' }, hotspots.map((hotspot) =>
        node('div', { class: 'row' }, [
            node('span', { class: 'pill ' + hotspot.lastSeverity, text: hotspot.lastSeverity }),
            node('div', {}, [
                node('strong', { text: hotspot.packageName }),
                node('small', { text: hotspot.occurrences + ' occurrence(s)' })
            ]),
            node('small', { text: 'memory' })
        ])
    ));
}

function baselineRows(baseline) {
    if (!baseline || !baseline.exists) {
        return node('div', { class: 'empty', text: 'No baseline committed yet.' });
    }
    const comparison = baseline.comparison;
    if (!comparison) {
        return node('div', { class: 'empty', text: 'Baseline exists; run a scan to compare it.' });
    }
    return node('div', { class: 'table' }, [
        row('New', comparison.summary.new, 'high'),
        row('Worsened', comparison.summary.worsened, 'critical'),
        row('Resolved', comparison.summary.resolved, 'stable'),
        row('Risk delta', comparison.riskScoreDelta > 0 ? '+' + comparison.riskScoreDelta : comparison.riskScoreDelta, comparison.riskScoreDelta > 0 ? 'high' : 'stable')
    ]);
}

function row(label, value, tone) {
    return node('div', { class: 'row' }, [
        node('span', { class: 'pill ' + tone, text: label }),
        node('div', {}, [node('strong', { text: String(value) })]),
        node('small', { text: 'baseline' })
    ]);
}

function artifactName(key) {
    return key.replace(/([A-Z])/g, ' $1').toLowerCase();
}

function render(state) {
    document.getElementById('root').textContent = state.projectRoot;
    document.getElementById('scanner').textContent = state.scan && state.scan.scanner ? state.scan.scanner : 'scanner pending';
    document.getElementById('mode').textContent = state.scan && state.scan.mode ? state.scan.mode : 'mode pending';
    document.getElementById('clock').textContent = 'last sync ' + new Date(state.generatedAt).toLocaleTimeString();

    const artifacts = document.getElementById('artifacts');
    artifacts.replaceChildren(...Object.entries(state.artifacts).map(([key, artifact]) =>
        node('span', { class: 'artifact', 'data-exists': String(artifact.exists), text: artifactName(key) + (artifact.exists ? ' ready' : ' missing') })
    ));

    const content = document.getElementById('content');
    if (!state.scan) {
        document.getElementById('headline').textContent = 'Awaiting first scan.';
        content.replaceChildren(
            panel('Standing By', 'span-12', node('div', { class: 'empty', text: 'Run warden scan to populate the console.' }))
        );
        return;
    }

    document.getElementById('headline').textContent = state.scan.posture + ' posture, ' + state.scan.summary.total + ' finding(s).';
    content.replaceChildren(
        metric('Risk', state.scan.riskScore + '/100', state.scan.posture, 'posture ' + state.scan.posture),
        metric('Findings', state.scan.summary.total, 'guarded', 'current inventory'),
        metric('Fixable', state.scan.autoFixableCount, 'stable', 'automated path'),
        metric('Manual', state.scan.manualCount, 'elevated', 'review queue'),
        panel('Top Findings', 'span-7', findingRows(state.scan.topFindings)),
        panel('Baseline Delta', 'span-5', baselineRows(state.baseline)),
        panel('Run History', 'span-7', historyRows(state.history.entries)),
        panel('Memory Hotspots', 'span-5', hotspotRows(state.memory.topHotspots))
    );
}

async function load() {
    const response = await fetch('/api/state', { cache: 'no-store' });
    render(await response.json());
}

load();
setInterval(load, 6000);
</script>
</body>
</html>`;
}
