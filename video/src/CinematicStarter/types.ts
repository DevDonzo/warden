export type CinematicPalette = {
  backgroundA: string;
  backgroundB: string;
  accent: string;
  accentSecondary: string;
  textPrimary: string;
  textSecondary: string;
  panelBackground: string;
};

export type AgentCard = {
  name: string;
  role: string;
  detail: string;
};

export type ScanModeCard = {
  mode: string;
  tools: string;
  outcome: string;
};

export type CinematicProps = {
  terminalCommand: string;
  terminalOutput: string[];
  agentCards: AgentCard[];
  scanModes: ScanModeCard[];
  loopSteps: string[];
  ctaTitle: string;
  ctaSubheadline: string;
  palette: CinematicPalette;
};

export const defaultCinematicPalette: CinematicPalette = {
  backgroundA: "#05070c",
  backgroundB: "#131b2b",
  accent: "#2563eb",
  accentSecondary: "#1e3a8a",
  textPrimary: "#f7f9fc",
  textSecondary: "#c5cfdf",
  panelBackground: "rgba(7, 10, 16, 0.76)",
};

export const defaultCinematicProps: CinematicProps = {
  terminalCommand: "npx warden scan https://github.com/acme/payment-service",
  terminalOutput: [
    "🛡️  WARDEN | Autonomous Security Orchestrator",
    "Target: Remote repository https://github.com/acme/payment-service",
    "[Watchman] Scanning dependencies with Snyk (npm audit fallback ready)...",
    "[Watchman] Found 6 vulnerabilities (2 high priority)",
    "[Engineer] Creating branch warden/fix-axios and applying patch...",
    "[Engineer] Running tests... 128 passed, 0 failed",
    "[Diplomat] Opening PR with remediation details and risk context...",
    "PR created: https://github.com/acme/payment-service/pull/184",
    "✅ Workflow complete. Human review required for merge.",
  ],
  agentCards: [
    {
      name: "Watchman",
      role: "Finds the threats",
      detail: "Scans dependencies with Snyk and falls back to npm audit when needed.",
    },
    {
      name: "Engineer",
      role: "Patches with guardrails",
      detail: "Creates a fix branch, applies remediation, and runs tests before anything leaves.",
    },
    {
      name: "Diplomat",
      role: "Ships review-ready context",
      detail: "Opens a clean PR with what broke, how it was fixed, and why it matters.",
    },
  ],
  scanModes: [
    {
      mode: "SAST",
      tools: "Snyk + npm audit",
      outcome: "Dependency vulnerabilities become tested, auto-fix pull requests.",
    },
    {
      mode: "DAST",
      tools: "Nmap + Metasploit",
      outcome: "Infrastructure findings become actionable advisory security reports.",
    },
  ],
  loopSteps: ["Scan", "Prioritize", "Patch", "Verify", "Open PR"],
  ctaTitle: "Warden proposes. Humans approve.",
  ctaSubheadline: "Autonomous security orchestration for modern repos.",
  palette: defaultCinematicPalette,
};
