# Warden

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![npm version](https://img.shields.io/npm/v/@devdonzo/warden?style=for-the-badge)](https://www.npmjs.com/package/@devdonzo/warden)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg?style=for-the-badge)](https://opensource.org/licenses/ISC)

> **Who watches the code?**

Warden is an autonomous SRE & security orchestration agent that hunts vulnerabilities, patches them, verifies fixes pass tests, and opens PRs—all without human intervention.

🔗 **Website:** https://warden-cli.vercel.app

---

## ✨ Key Features

- **Automated Vulnerability Scanning** - Detects security issues via SAST and DAST workflows
- **Intelligent Auto-Fix** - Automatically patches vulnerabilities and verifies with tests
- **PR Generation** - Opens pull requests with detailed security reports and fixes
- **Plugin Architecture** - Extensible scanner system supporting Snyk, npm-audit, and custom scanners
- **Multi-Package Manager Support** - npm, with roadmap for pip, cargo, and more
- **Offline Demo Mode** - Test end-to-end flows without external dependencies

---

## 🚀 Quick Start

### Installation

```bash
npm install -g @devdonzo/warden
```

### Setup

```bash
warden setup
```

### Run a Scan

```bash
warden scan <repository-url>
```

### DAST Scan (Infrastructure)

```bash
warden dast <target>
```

---

## 📋 Requirements

- **Node.js:** 18.0.0 or higher
- **Git:** For repository cloning and PR creation
- **GitHub Token:** Required for PR operations (set `GITHUB_TOKEN` environment variable)

---

## 🏗️ Architecture

Warden uses a **workflow-based orchestration model** with pluggable components:

### Core Components

| Component | Purpose |
|-----------|---------|
| **Watchman** | SAST scanner registry with adapter-based plugin system |
| **Engineer** | Auto-fix engine with pluggable fixer implementations |
| **Diplomat** | GitHub PR generation and reporting |
| **SastWorkflow** | End-to-end SAST pipeline (clone → scan → diagnose → fix) |
| **DastWorkflow** | Infrastructure scanning (Nmap + Metasploit integration) |

### Key Abstractions

- **IScanner** - Interface for scanner adapters (Snyk, npm-audit, MockScanner)
- **IFixer** - Interface for package manager fixers (npm, pip, cargo roadmap)
- **ShellService** - Centralized command execution with error handling
- **ProgressReporter** - UI abstraction for consistent logging

---

## 🔌 Scanner Plugins

Warden supports multiple vulnerability scanners via a registry:

- **Snyk Adapter** - Professional vulnerability intelligence
- **npm Audit Adapter** - Built-in npm package auditing
- **Mock Scanner** - For demos and offline testing

### Adding a Custom Scanner

1. Implement the `IScanner` interface
2. Create an adapter conforming to the registry contract
3. Register with `ScannerRegistry`

---

## 🛠️ Configuration

Create a `.warden` config file in your project root:

```yaml
scanners:
  - snyk
  - npm-audit

fixers:
  npm: true

github:
  token: ${GITHUB_TOKEN}
  owner: your-org
  repo: your-repo

dast:
  targets:
    - https://your-api.example.com
```

---

## 📊 Workflows

### SAST Workflow

```
Clone Repository → Prepare Workspace → Scan Dependencies 
  → Diagnose Issues → Generate Patches → Run Tests 
  → Create PR with Fixes
```

### DAST Workflow

```
Infrastructure Scan (Nmap + Metasploit) → Merge Results 
  → Generate Advisory PR
```

---

## 🧪 Testing

Run the test suite:

```bash
npm test              # Run all tests
npm run test:watch   # Watch mode
npm run test:coverage # With coverage report
```

---

## 🛠️ Development

### Build

```bash
npm run build
```

### Development Server

```bash
npm run dev
```

### Format Code

```bash
npm run format
npm run format:check
```

---

## 📦 Project Structure

```
src/
├── agents/          # Watchman, Engineer, Diplomat
├── workflows/       # SAST and DAST orchestration
├── scanners/        # Scanner adapters and registry
├── services/        # Shell execution, progress reporting
├── types/           # TypeScript interfaces
├── utils/           # Mock data, constants
└── cli.ts          # CLI entry point
```

---

## 🗺️ Roadmap

- [ ] Support for additional package managers (Python, Rust, Go)
- [ ] Enhanced reporting and metrics dashboards
- [ ] Custom remediation rules
- [ ] Kubernetes security scanning
- [ ] Supply chain dependency verification

---

## 🤝 Contributing

We welcome contributions! To add a new scanner or fixer:

1. Implement the appropriate interface (`IScanner` or `IFixer`)
2. Create an adapter in the relevant directory
3. Add tests following the existing test structure
4. Update documentation with usage examples

---

## 📄 License

ISC © [DevDonzo](https://github.com/DevDonzo)

---

## 🐛 Issues & Support

Found a bug or have a feature request? Open an issue on [GitHub](https://github.com/DevDonzo/warden/issues).
