# Warden

**Autonomous SRE & Security Orchestration Agent**

> *"Who watches the code?"*

Warden is a production-grade, self-healing security agent designed to live within your GitHub ecosystem. Functioning as the head of a **Council of Agents**, Warden autonomously patrols your repositories, identifies vulnerabilities using enterprise tools, generates verified patches, and submits professional Pull Requests—all without human intervention.

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg?style=for-the-badge)](https://opensource.org/licenses/ISC)

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

---

## Installation

```bash
npm install -g @devdonzo/warden
```

## Quick Start

### 1. Setup
Run the interactive setup wizard to configure your tokens (GitHub, Snyk) and preferences.
```bash
warden setup
```

### 2. Scan
Launch Warden to patrol your current repository.
```bash
warden scan
```

### 3. Validate
Ensure your environment is ready for deployment or scanning.
```bash
warden validate
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
  "scanner": "snyk",
  "minSeverity": "high",
  "autoFix": true,
  "maxFixes": 5,
  "notifications": {
    "slack": "https://hooks.slack.com/..."
  }
}
```

---

## Rules of Engagement

Warden operates under a strict set of rules to ensure safety:
1.  **Do No Harm**: Warden will never force push or delete remote branches.
2.  **Verify First**: No PR is submitted without a passing test suite.
3.  **Human in the Loop**: Warden proposes fixes but requires human approval (merge) by default.

---

## License

ISC © [DevDonzo](https://github.com/DevDonzo)
