# Changelog

All notable changes to The Sentinel will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-01-18

### 🎉 Initial Production Release

This is the first production-ready release of The Sentinel with comprehensive improvements for real-world usage.

### ✨ Added

#### CLI & User Experience
- **Professional CLI Interface** using Commander.js
  - `sentinel scan` - Main scanning command with multiple options
  - `sentinel validate` - Pre-flight validation checks
  - `sentinel setup` - Interactive setup wizard
  - `sentinel init` - Initialize Sentinel in a repository
- **Comprehensive Logging System**
  - Color-coded console output using Chalk
  - File-based logging with Winston (error.log and combined.log)
  - Verbose mode for debugging (`--verbose` flag)
  - Agent-specific loggers (Watchman, Engineer, Diplomat)
- **Progress Indicators** using Ora for long-running operations
- **Dry Run Mode** to preview changes without applying them (`--dry-run`)

#### Validation & Error Handling
- **Pre-flight Validation System**
  - Environment variable validation
  - System dependency checks (git, node, npm, snyk)
  - Git repository validation
  - package.json validation
- **Comprehensive Error Messages** with actionable suggestions
- **Graceful Degradation** when optional tools are unavailable

#### Configuration & Setup
- **Interactive Setup Wizard** for first-time configuration
- **Repository Initialization** command to set up Sentinel in any project
- **Flexible Configuration Options**
  - CLI flags override defaults
  - Support for multiple severity levels
  - Configurable scanner selection
  - Max fixes limit

#### Documentation
- **Enhanced README** with:
  - Installation instructions (global and local)
  - Comprehensive usage examples
  - Troubleshooting guide
  - Configuration reference
  - CLI command reference
- **CONTRIBUTING.md** with development guidelines
- **Quick Start Script** for automated setup
- **CHANGELOG.md** for version tracking

#### Testing
- **Unit Tests** for core utilities
  - Validator tests
  - Logger tests
- **Jest Configuration** for TypeScript
- **Test Coverage** reporting

#### Developer Experience
- **Improved Project Structure**
  - Separated CLI from orchestration logic
  - Dedicated utilities directory
  - Better code organization
- **TypeScript Strict Mode** enabled
- **Better Error Handling** throughout the codebase
- **Logging to Files** for debugging

### 🔧 Changed

- **Refactored Main Entry Point** - Simplified index.ts to just load CLI
- **Improved Orchestration** - Moved main logic to dedicated orchestrator module
- **Better Package.json** - Added bin field, keywords, and metadata for npm publishing
- **Enhanced .gitignore** - Added logs directory and log files

### 📦 Dependencies

#### Added
- `commander` - CLI framework
- `chalk` - Terminal string styling
- `ora` - Progress indicators
- `winston` - Logging framework

### 🏗️ Architecture

The Sentinel now follows a clean architecture with:
- **CLI Layer** - User interface and command handling
- **Orchestration Layer** - Main workflow coordination
- **Agent Layer** - Specialized agents (Watchman, Engineer, Diplomat)
- **Utility Layer** - Shared utilities (logger, validator)
- **Core Layer** - Configuration and rules

### 📋 Commands

```bash
sentinel scan [repository] [options]  # Scan for vulnerabilities
sentinel validate                     # Validate environment
sentinel setup                        # Interactive setup
sentinel init                         # Initialize in repo
```

### 🎯 Options

- `-v, --verbose` - Enable verbose logging
- `--dry-run` - Preview changes without applying
- `--skip-validation` - Skip pre-flight checks
- `--scanner <type>` - Choose scanner (snyk, npm-audit, all)
- `--severity <level>` - Minimum severity (low, medium, high, critical)
- `--max-fixes <number>` - Maximum fixes to apply

### 🐛 Bug Fixes

- Fixed module import issues with ESM packages (chalk, ora)
- Improved error handling in git operations
- Better handling of missing environment variables

### 🔒 Security

- Added validation for GitHub token permissions
- Improved secrets handling
- Better error messages that don't leak sensitive data

---

## [0.1.0] - 2026-01-16

### Initial Development Release

- Basic agent architecture (Watchman, Engineer, Diplomat)
- Snyk integration for vulnerability scanning
- npm audit fallback
- Automated fix generation
- GitHub PR creation
- Basic CLI support

---

[1.0.0]: https://github.com/DevDonzo/the-sentinel/releases/tag/v1.0.0
[0.1.0]: https://github.com/DevDonzo/the-sentinel/releases/tag/v0.1.0
