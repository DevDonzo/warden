# Warden

**Autonomous SRE & Security Orchestration Agent**

> *"Who watches the code?"*

Warden is a production-grade, self-healing security agent designed to live within your GitHub ecosystem. Functioning as the head of a **Council of Agents**, Warden autonomously patrols your repositories, identifies vulnerabilities using enterprise tools, generates verified patches, and submits professional Pull Requests—all without human intervention.

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg?style=for-the-badge)](https://opensource.org/licenses/ISC)

---

## 🚀 Quick Start

```bash
# Install globally
npm install -g @devdonzo/warden

# Set up your environment (interactive wizard)
warden setup

# Scan your repository for vulnerabilities
warden scan

# Or scan with dry-run to preview without making changes
warden scan --dry-run
```

---

## Warden vs npm audit

| Feature | npm audit | Warden |
|---------|-----------|--------|
| **Vulnerability Detection** | ✅ Basic | ✅ Snyk + npm audit fallback |
| **Automatic Fix Creation** | ❌ Manual | ✅ Automated branch & patch |
| **Test Verification** | ❌ None | ✅ Runs test suite before PR |
| **Pull Request Creation** | ❌ None | ✅ Automatic with labels/assignees |
| **Severity Prioritization** | ⚠️ Basic | ✅ CVSS-based intelligent sorting |
| **HTML Reports** | ❌ None | ✅ Visual security dashboard |
| **Remote Repository Scan** | ❌ None | ✅ Clone & scan any repo |
| **Configurable** | ❌ Limited | ✅ Full `.wardenrc.json` support |
| **CI/CD Ready** | ⚠️ Basic | ✅ Exit codes for automation |

**Why choose Warden?**
- `npm audit` tells you what's wrong. **Warden fixes it.**
- `npm audit fix` can break your app. **Warden verifies fixes pass tests first.**
- `npm audit` requires manual PR creation. **Warden creates professional PRs automatically.**

---

## The Council of Agents

Warden is not just a script; it is an orchestrated system of specialized agents working in unison:

### 👁️ **The Watchman** (Scanner)
 The vigilant observer. The Watchman integrates with tools like **Snyk** and **npm audit** to continuously scan your dependencies and containers. It doesn't just find bugs; it understands them.

### 👷 **The Engineer** (Fixer)
The builder. When a vulnerability is detected, The Engineer spins up an isolated environment, creates a fix branch, and intelligently patches your `package.json`. It runs your test suite to ensure the fix is safe before it ever leaves the local environment.

### 🤝 **The Diplomat** (Reporter)
The communicator. Once a fix is verified, The Diplomat crafts a professional, semantic Pull Request. It explains *what* went wrong, *how* it was fixed, and *why* it matters, assigning the right reviewers and applying the correct security labels.

---

## Key Features

- **Deep Scanning**: Integrated with Snyk for dependency and container analysis, with a robust fallback to npm audit
- **Autonomous Diagnosis**: Intelligent prioritization of Critical and High-severity vulnerabilities
- **Self-Healing**: Automatically creates fix branches and patches package.json with secure versions
- **Verification Pipeline**: Every fix is verified via `npm install` and `npm test` before a PR is proposed
- **Safeguarded Operations**: Operates under a strict "Rules of Engagement" constitution preventing unauthorized merges
- **Remote Patrol**: Supports patrolling any public or private GitHub repository

## Prerequisites

Warden relies on a few external tools to perform its duties effectively:

- **[Node.js](https://nodejs.org/)** (v18+): Required runtime environment
- **[Git](https://git-scm.com/)**: Required for creating fix branches and managing repositories
- **[GitHub Token](https://github.com/settings/tokens)**: Required for creating pull requests (set as `GITHUB_TOKEN` env var)
- **[Snyk CLI](https://snyk.io/docs/cli/)**: (Optional) For enhanced scanning. Warden falls back to `npm audit` if unavailable

---

## Installation

```bash
npm install -g @devdonzo/warden
```

## Usage

### Setup (First Time)
Run the interactive setup wizard to configure your tokens and preferences:
```bash
warden setup
```

### Validate Environment
Check that all prerequisites are met:
```bash
warden validate
```

### Scan for Vulnerabilities
Scan the current repository:
```bash
warden scan
```

Scan with options:
```bash
# Preview changes without creating branches or PRs
warden scan --dry-run

# Use specific scanner
warden scan --scanner npm-audit

# Set minimum severity threshold
warden scan --severity critical

# Limit number of fixes
warden scan --max-fixes 3

# Enable verbose logging
warden scan --verbose

# Scan a remote repository
warden scan https://github.com/owner/repo
```

### Configuration Management
```bash
# Create default config file
warden config --create

# Show current configuration
warden config --show

# Validate configuration
warden config --validate
```

---

## Configuration

Warden can be configured via a `.wardenrc.json` file in your project root or home directory.

```bash
warden config --create
```

Example configuration:
```json
{
  "scanner": {
    "primary": "snyk",
    "fallback": true,
    "timeout": 300000,
    "retries": 3
  },
  "fixes": {
    "maxPerRun": 5,
    "minSeverity": "high",
    "autoMerge": false,
    "branchPrefix": "warden/fix"
  },
  "github": {
    "labels": ["security", "automated"],
    "autoAssign": true
  },
  "logging": {
    "level": "info",
    "file": true,
    "console": true
  }
}
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GITHUB_TOKEN` | Yes | GitHub Personal Access Token for PR creation |
| `SNYK_TOKEN` | No | Snyk API token for enhanced scanning |
| `GITHUB_OWNER` | No | Repository owner (auto-detected from git remote) |
| `GITHUB_REPO` | No | Repository name (auto-detected from git remote) |
| `GITHUB_ASSIGNEE` | No | Default PR assignee |

---

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success, no high-priority vulnerabilities |
| 1 | Success, but high-priority vulnerabilities found |
| 2 | Scan failed |

---

## Rules of Engagement

Warden operates under a strict set of rules to ensure safety:
1.  **Do No Harm**: Warden will never force push or delete remote branches.
2.  **Verify First**: No PR is submitted without a passing test suite.
3.  **Human in the Loop**: Warden proposes fixes but requires human approval (merge) by default.

---

## License

ISC © [DevDonzo](https://github.com/DevDonzo)
