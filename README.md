# Warden

**https://warden-cli.vercel.app**

> *"Who watches the code?"*

**Your autonomous security agent.** Warden hunts vulnerabilities, patches them, verifies the fix passes tests, and opens a PR—while you sleep.

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg?style=for-the-badge)](https://opensource.org/licenses/ISC)

---

## Why Warden?

`npm audit` tells you what's broken. **Warden fixes it.**

| | npm audit | Warden |
|--|-----------|--------|
| Find vulnerabilities | ✅ | ✅ Snyk + npm audit fallback |
| Auto-create fix branch | ❌ | ✅ |
| Run tests before PR | ❌ | ✅ |
| Open PR automatically | ❌ | ✅ |
| CVSS-based prioritization | ❌ | ✅ |
| Scan remote repos | ❌ | ✅ |
| CI/CD ready | ⚠️ | ✅ |

---

## The Council

Warden runs as an orchestrated squad of specialized agents:

**The Watchman** — Scans your deps with Snyk (falls back to npm audit). Finds the threats.

**The Engineer** — Spins up an isolated env, creates a fix branch, patches `package.json`, runs your tests. If tests fail, the fix never leaves.

**The Diplomat** — Crafts a clean PR with context on what broke, how it's fixed, and why it matters. Assigns reviewers, applies labels.

---

## Commands

### Core Commands

| Command | Description |
|---|---|
| `warden scan [repo]` | Scans a local or remote repository for vulnerabilities (SAST). |
| `warden dast <target>` | Runs a Dynamic Application Security Test (DAST) against a configured target. |
| `warden setup` | Runs an interactive setup wizard for first-time configuration. |
| `warden init` | Initializes Warden in the current repository, creating a default config file. |

### Utility Commands

| Command | Description |
|---|---|
| `warden config` | Manages the `.wardenrc.json` configuration file. Use `--show`, `--create`, `--validate`. |
| `warden validate` | Validates that the local environment and dependencies are set up correctly. |
| `warden doctor` | Diagnoses common issues with your environment and suggests fixes. |
| `warden status` | Shows a summary of recent scan history. |
| `warden clean` | Removes all generated files (scan-results, logs, etc.). Use `--all` to also remove config. |

---

## DAST - Dynamic Application Security Testing

Warden now supports **infrastructure scanning** with Nmap and Metasploit alongside traditional dependency scanning. See the [DAST Guide](./docs/DAST-GUIDE.md) for complete documentation.

### SAST vs DAST

| Mode | Target | Tools | Remediation |
|------|--------|-------|-------------|
| **SAST** | Dependencies | Snyk, npm audit | Auto-fix PRs |
| **DAST** | Infrastructure | Nmap, Metasploit | Advisory PRs |

### ⚠️ Legal Notice

**Only scan systems you own or have written authorization to test.** Unauthorized scanning may violate laws including the Computer Fraud and Abuse Act (USA).

---

## Configuration

Warden is configured using a `.wardenrc.json` file in your project root. You can create one automatically by running `warden config --create`.

### Example `.wardenrc.json`

```json
{
  "dast": {
    "enabled": true,
    "targets": [
      {
        "url": "https://staging.myapp.com",
        "authorized": true,
        "description": "Staging Environment"
      }
    ],
    "nmap": {
      "enabled": true,
      "scanType": "standard",
      "portRange": "1-1000"
    },
    "metasploit": {
      "enabled": false,
      "mode": "scan-only"
    },
    "safety": {
      "requireConfirmation": true,
      "authorizedTargetsOnly": true,
      "disableExploits": true
    }
  }
}
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GITHUB_TOKEN` | Yes | For PR creation. Can be classic or fine-grained. |
| `SNYK_TOKEN` | No | For enhanced SAST scanning with Snyk. |

---

## Rules of Engagement

1. **No force pushes.** Ever.
2. **No PR without passing tests.**
3. **Human merges.** Warden proposes, you approve.

---

## License

ISC © [DevDonzo](https://github.com/DevDonzo)