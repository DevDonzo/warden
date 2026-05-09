# Warden

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![npm version](https://img.shields.io/npm/v/@devdonzo/warden?style=for-the-badge)](https://www.npmjs.com/package/@devdonzo/warden)
[![CI](https://img.shields.io/github/actions/workflow/status/DevDonzo/warden/ci.yml?branch=main&style=for-the-badge&label=CI)](https://github.com/DevDonzo/warden/actions/workflows/ci.yml)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg?style=for-the-badge)](https://opensource.org/licenses/ISC)

> Autonomous security remediation with workflow memory, policy gates, and pull-request automation.

Warden is a security orchestration CLI for Node.js repositories and infrastructure targets. It scans dependencies or network surfaces, prioritizes what matters, attempts safe automated fixes, produces operator-grade reports, remembers recurring hotspots, and can enforce CI policy when risk exceeds your threshold.

## What Warden Does Now

- **SAST and DAST workflows**: Dependency scanning plus infrastructure advisory generation.
- **Agentic remediation planning**: Every run now produces posture, risk score, immediate actions, and follow-up guidance.
- **Safe auto-fix execution**: Fixes respect severity thresholds, fix limits, dirty-repo safeguards, and approval gates.
- **PR automation**: Warden can create and push remediation branches and open GitHub PRs when credentials are configured.
- **CI policy enforcement**: `--ci` mode can fail the pipeline on severity or posture thresholds.
- **Human approval for risky fixes**: High-risk remediation can require explicit approval via `--approval-token approved`.
- **Workflow memory**: Warden tracks recurring vulnerable packages per repository so hotspots become visible over time.
- **Machine-readable and human-readable output**: JSON run results, Markdown reports, HTML reports, approval request artifacts, and local run history.

## Install

```bash
npm install -g @devdonzo/warden
```

Or for local development:

```bash
npm install
npm run build
```

## Quick Start

Validate the environment:

```bash
warden validate
```

Run a local dry-run dependency scan:

```bash
warden scan . --dry-run --scanner npm-audit --severity high --max-fixes 2
```

Run in CI mode with policy gates:

```bash
warden scan . --ci --json --scanner npm-audit --severity high
```

Approve a risky remediation after human review:

```bash
warden scan . --scanner npm-audit --approval-token approved
```

Run an infrastructure advisory scan:

```bash
warden dast https://your-api.example.com --dry-run
```

## Key Commands

```bash
warden scan [repository-or-path]
warden dast <target>
warden validate
warden doctor
warden status
warden bootstrap-ci
warden config --show
warden config --create
```

## Important Flags

```bash
--scanner <snyk|npm-audit|all>
--severity <low|medium|high|critical>
--max-fixes <n>
--dry-run
--json
--ci
--approval-token approved
--skip-validation
--verbose
```

## Output Artifacts

Warden writes durable run artifacts into `scan-results/`:

- `scan-results.json`: latest scanner output
- `warden-report.md`: operator-focused Markdown report
- `scan-results.html`: HTML report
- `history.json`: longitudinal run history
- `memory.json`: recurring vulnerable package memory
- `warden-approval-request.json`: generated when policy blocks risky fixes pending approval

## Example `.wardenrc.json`

```json
{
  "scanner": {
    "primary": "snyk",
    "fallback": true,
    "timeout": 300000,
    "retries": 3
  },
  "fixes": {
    "maxPerRun": 2,
    "minSeverity": "high",
    "autoMerge": false,
    "branchPrefix": "warden/fix"
  },
  "policy": {
    "failOnSeverity": "critical",
    "failOnPosture": "critical",
    "requireApprovalAboveSeverity": "high"
  },
  "github": {
    "assignees": [],
    "labels": ["security", "automated"],
    "reviewers": [],
    "autoAssign": true
  },
  "notifications": {
    "enabled": false
  },
  "logging": {
    "level": "info",
    "file": true,
    "console": true
  }
}
```

## Environment Variables

```bash
GITHUB_TOKEN=...     # required for PR creation and branch automation
SNYK_TOKEN=...       # recommended when using the Snyk scanner
GITHUB_ASSIGNEE=...  # optional default assignee for PRs
GITHUB_OWNER=...     # optional fallback owner
GITHUB_REPO=...      # optional fallback repo
```

## CI/CD

The repository already includes GitHub Actions workflows:

- `.github/workflows/ci.yml`: build, test, and CLI smoke checks
- `.github/workflows/publish.yml`: npm publish workflow

Recommended CI usage inside your own repositories:

```bash
warden scan . --ci --json --scanner npm-audit --severity high
```

That gives you:

- deterministic non-zero exit codes on policy failure
- JSON output for downstream automation
- approval artifacts when risky auto-remediation is blocked

To generate a starter workflow in another repository:

```bash
warden bootstrap-ci --create-config --scanner npm-audit --severity high
```

## Architecture

| Component | Responsibility |
|---|---|
| `Watchman` | Scanner execution and findings normalization |
| `Engineer` | Safe remediation planning and fix application |
| `Diplomat` | Branch push and pull-request orchestration |
| `SastWorkflow` | End-to-end dependency remediation flow |
| `DastWorkflow` | Infrastructure findings and advisory PR flow |
| `advisor` | Risk scoring, posture analysis, and immediate action planning |
| `policy` | CI gates and approval enforcement |
| `history` | Longitudinal run trend tracking |
| `memory` | Recurring package hotspot tracking |

## Testing

```bash
npm run build
npm test
npm run test:coverage
```

The suite now covers:

- scanner parsing
- remediation selection logic
- policy decisions
- fixture-backed SAST workflow integration
- run history
- recurring memory hotspots

## Release Status

Current package version: `1.4.0`

This version introduces:

- agentic run assessment and report generation
- CI policy gates and approval requirements
- fixture-backed workflow integration tests
- recurring vulnerability hotspot memory
- safer npm remediation and PR flow hardening

## Roadmap

- multi-ecosystem remediation for Python, Rust, Go, Ruby, and PHP
- GitHub Actions bootstrap generation for downstream repos
- stronger human review UX than approval tokens alone
- end-to-end git fixture repos for real remediation execution
- shared remote memory and team dashboards

## Contributing

See [.github/CONTRIBUTING.md](./.github/CONTRIBUTING.md) for contribution guidance.

## License

ISC © [DevDonzo](https://github.com/DevDonzo)
