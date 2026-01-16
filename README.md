# The Sentinel 🛡️

**Autonomous SRE & Security Orchestration Agent**

The Sentinel is a production-grade, self-healing security agent designed to live within your GitHub ecosystem. It autonomously identifies vulnerabilities using enterprise tools, generates verified patches, and submits professional Pull Requests—all without human intervention.

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg?style=for-the-badge)](https://opensource.org/licenses/ISC)
[![Security: Snyk](https://img.shields.io/badge/Security-Snyk-7001FF?style=for-the-badge&logo=snyk&logoColor=white)](https://snyk.io/)

---

## 🚀 Key Features

- 🔍 **Deep Scanning**: Integrated with **Snyk** for dependency and container analysis, with a robust fallback to **npm audit**.
- 🧠 **Autonomous Diagnosis**: Intelligent prioritization of Critical and High-severity vulnerabilities.
- 🔧 **Self-Healing**: Automatically creates fix branches and patches `package.json` with secure versions.
- ✅ **Verification Pipeline**: Every fix is validated via `npm install` and `npm test` before a PR is ever opened.
- 🕊️ **Professional PRs**: Generates semantic Pull Requests with security labels, vulnerability details, and auto-assigned reviewers.
- 🔒 **Safeguarded Operations**: Operates under a strict "Rules of Engagement" constitution preventing unauthorized merges or access to secrets.

---

## 🏗️ Architecture

The Sentinel operates as a coordinate "Council of Agents," ensuring separation of concerns and high reliability.

### The Agent Council
1.  **🛡️ The Watchman (Scanner)**: Monitors the environment for threats. Implements retry logic and atomic reporting.
2.  **🔧 The Engineer (Fixer)**: Analyzes threats and applies precision code patches on isolated feature branches.
3.  **🕊️ The Diplomat (Liaison)**: Manages the downstream communication and PR lifecycle on GitHub.

### Core Security Principles (`SENTINEL_CORE.md`)
- **Safety First**: Never merge to `main` without human approval.
- **Isolation**: All work is performed on `sentinel/fix-*` branches.
- **Integrity**: No PR is proposed unless it passes the full test suite.
- **Secrecy**: Total isolation from `.env` and sensitive production keys.

---

## 🛠️ Quick Start

### Prerequisites
- Node.js 18+
- Snyk CLI installed (`npm install -g snyk`)
- GitHub CLI authenticated (`gh auth login`)

### Installation

```bash
git clone https://github.com/DevDonzo/the-sentinel.git
cd the-sentinel
npm install
```

### Configuration

Create a `.env` file from the template:

```bash
cp .env.example .env
```

| Variable | Description |
| :--- | :--- |
| `SNYK_TOKEN` | Your Snyk API Token ([get here](https://snyk.io/)) |
| `GITHUB_TOKEN` | GitHub PAT with repo write access |
| `GITHUB_ASSIGNEE` | Username to assign PRs to |

### Running the Agent

```bash
# Build and run the full patrol cycle
npm run build && npm start
```

---

## 📂 Project Structure

```text
the-sentinel/
├── SENTINEL_CORE.md    # The security constitution
├── SPEC/               # Task specifications for SDD
├── src/
│   ├── index.ts        # The Sentinel Orchestrator
│   ├── agents/
│   │   ├── watchman/   # Surveillance & Detection
│   │   ├── engineer/   # Remediation & Testing
│   │   └── diplomat/   # GitHub API & PR Handling
│   └── core/           # System loaders & safe logic
└── scan-results/       # Audit artifacts
```

---

## 📜 Rules of Engagement

The Sentinel is governed by `SENTINEL_CORE.md`. Modifications to this file change the agent's fundamental safety parameters. It is highly recommended to review this file before deploying in a production environment.

---

## 📝 License

Distributed under the ISC License. See `LICENSE` for more information.

---

*Built for high-velocity teams who prioritize security without compromising on speed.* 🛡️
