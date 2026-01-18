# The Sentinel

**Autonomous SRE & Security Orchestration Agent**

The Sentinel is a production-grade, self-healing security agent designed to live within your GitHub ecosystem. It autonomously identifies vulnerabilities using enterprise tools, generates verified patches, and submits professional Pull Requests—all without human intervention.

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![npm version](https://img.shields.io/npm/v/@devdonzo/the-sentinel?style=for-the-badge&logo=npm)](https://www.npmjs.com/package/@devdonzo/the-sentinel)
[![npm downloads](https://img.shields.io/npm/dm/@devdonzo/the-sentinel?style=for-the-badge&logo=npm)](https://www.npmjs.com/package/@devdonzo/the-sentinel)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg?style=for-the-badge)](https://opensource.org/licenses/ISC)
[![Security: Snyk](https://img.shields.io/badge/Security-Snyk-7001FF?style=for-the-badge&logo=snyk&logoColor=white)](https://snyk.io/)

---

## ✨ Key Features

- **🔍 Deep Scanning**: Integrated with Snyk for dependency and container analysis, with a robust fallback to npm audit
- **🤖 Autonomous Diagnosis**: Intelligent prioritization of Critical and High-severity vulnerabilities
- **🔧 Self-Healing**: Automatically creates fix branches and patches package.json with secure versions
- **✅ Verification Pipeline**: Every fix is validated via npm install and npm test before a PR is proposed
- **📝 Professional Pull Requests**: Generates semantic Pull Requests with security labels, vulnerability details, and auto-assigned reviewers
- **🛡️ Safeguarded Operations**: Operates under a strict "Rules of Engagement" constitution preventing unauthorized merges or access to secrets
- **🌐 Remote Patrol**: Supports patrolling any public or private GitHub repository
- **📊 Comprehensive Logging**: Detailed logs with color-coded output and file-based logging for debugging

---

## 🏗️ Architecture

The Sentinel operates as a coordinated "Council of Agents," ensuring separation of concerns and high reliability.

### The Agent Council
1. **🔍 The Watchman (Scanner)**: Monitors the environment for threats. Implements retry logic and atomic reporting.
2. **🔧 The Engineer (Fixer)**: Analyzes threats and applies precision code patches on isolated feature branches.
3. **🤝 The Diplomat (Liaison)**: Manages the downstream communication and PR lifecycle on GitHub.

---

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** (required)
- **Git** (required)
- **Snyk CLI** (recommended): `npm install -g snyk`
- **GitHub Personal Access Token** with `repo` scope

### Installation

#### Option 1: Global Installation (Recommended)
```bash
npm install -g the-sentinel
```

#### Option 2: Local Installation
```bash
git clone https://github.com/DevDonzo/the-sentinel.git
cd the-sentinel
npm install
npm run build
```

### Initial Setup

Run the interactive setup wizard:
```bash
sentinel setup
```

Or manually create a `.env` file:
```bash
GITHUB_TOKEN=your_github_personal_access_token
SNYK_TOKEN=your_snyk_api_token
GITHUB_ASSIGNEE=your_github_username
```

### Validate Your Setup

```bash
sentinel validate
```

This will check:
- ✅ Environment variables are configured
- ✅ Required dependencies (git, node, npm) are installed
- ✅ Optional tools (snyk, gh) are available
- ✅ Current directory is a valid git repository
- ✅ package.json exists and is valid

---

## 📖 Usage

### Basic Commands

#### Scan Current Repository
```bash
sentinel scan
```

#### Scan with Verbose Output
```bash
sentinel scan --verbose
```

#### Dry Run (Preview Changes)
```bash
sentinel scan --dry-run
```

#### Scan Remote Repository
```bash
sentinel scan https://github.com/username/repo.git
```

#### Scan Local Path
```bash
sentinel scan /path/to/project
```

### Advanced Options

```bash
sentinel scan [repository] [options]

Options:
  -v, --verbose              Enable verbose logging
  --dry-run                  Preview changes without creating branches or PRs
  --skip-validation          Skip pre-flight validation checks
  --scanner <type>           Scanner to use: snyk, npm-audit, or all (default: "snyk")
  --severity <level>         Minimum severity to fix: low, medium, high, critical (default: "high")
  --max-fixes <number>       Maximum number of fixes to apply (default: "1")
  -h, --help                 Display help for command
```

### Examples

**Scan and fix critical vulnerabilities only:**
```bash
sentinel scan --severity critical
```

**Scan with npm audit instead of Snyk:**
```bash
sentinel scan --scanner npm-audit
```

**Apply up to 3 fixes:**
```bash
sentinel scan --max-fixes 3
```

**Preview what would be fixed:**
```bash
sentinel scan --dry-run --verbose
```

---

## 🔧 Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GITHUB_TOKEN` | ✅ Yes | GitHub Personal Access Token with `repo` scope |
| `SNYK_TOKEN` | ⚠️ Recommended | Snyk API token for enhanced scanning |
| `GITHUB_OWNER` | ❌ Optional | GitHub username or organization (auto-detected) |
| `GITHUB_REPO` | ❌ Optional | Repository name (auto-detected) |
| `GITHUB_ASSIGNEE` | ❌ Optional | Username to assign PRs to |

### Project Structure

```
the-sentinel/
├── SENTINEL_CORE.md      # Security constitution (Rules of Engagement)
├── SPEC/                 # Task specifications for the agent council
├── src/                  # Source code
│   ├── agents/          # The three agents (Watchman, Engineer, Diplomat)
│   ├── core/            # Core configuration loaders
│   ├── utils/           # Utilities (logger, validator)
│   ├── cli.ts           # CLI interface
│   └── orchestrator.ts  # Main orchestration logic
├── scan-results/        # Centralized audit logs (gitignored)
├── workspaces/          # Temporary area for remote repos (gitignored)
└── logs/                # Application logs (gitignored)
```

---

## 🛡️ Rules of Engagement

The Sentinel is governed by `SENTINEL_CORE.md`. Key safety directives:

1. **Safety First**: Never merge to `main` or `master` without explicit human approval
2. **Sensitive Files**: Do not read, write, or modify `.env` files or files containing secrets
3. **Verification**: No fix is proposed without passing tests and secondary security scans
4. **Branch Naming**: All fixes use `sentinel/fix-<package-name>` convention

⚠️ **Important**: Review `SENTINEL_CORE.md` before deploying in production.

---

## 🧪 Testing

Run the test suite:
```bash
npm test
```

Run tests with coverage:
```bash
npm test -- --coverage
```

---

## 🐛 Troubleshooting

### "GITHUB_TOKEN is required"
- Ensure you've set `GITHUB_TOKEN` in your `.env` file or environment
- Run `sentinel setup` to configure interactively

### "Snyk CLI not found"
- Install Snyk globally: `npm install -g snyk`
- Or use npm audit fallback: `sentinel scan --scanner npm-audit`

### "Not a git repository"
- Ensure you're in a git repository: `git init`
- Check that `.git` directory exists

### "package.json not found"
- The Sentinel requires a Node.js project with `package.json`
- Ensure you're in the correct directory

### Verbose Logging
For detailed debugging information:
```bash
sentinel scan --verbose
```

Check logs in the `logs/` directory:
- `sentinel-error.log` - Error logs only
- `sentinel-combined.log` - All logs

---

## 📝 License

Distributed under the ISC License. See `LICENSE` for more information.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 🙏 Acknowledgments

- Built with [Snyk](https://snyk.io/) for security scanning
- Powered by [Octokit](https://github.com/octokit/rest.js) for GitHub integration
- Uses [Commander.js](https://github.com/tj/commander.js) for CLI

---

*Built for high-velocity teams who prioritize security without compromising on speed.* 🚀
