# Changelog

All notable changes to Warden will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-01-29

### ✨ Added

- **Structured Error Types** - New error classes for better debugging:
  - `ScanError` - For scanner-related failures
  - `FixError` - For fix application failures
  - `PRError` - For GitHub PR operation failures
  - `ConfigError` - For configuration issues
  - `ValidationError` - For input validation failures

- **New CLI Commands**:
  - `warden status` - View recent scans and environment status
  - `warden clean` - Remove generated files (scan-results, logs)

- **New CLI Flags**:
  - `--json` - Output results as JSON for CI/CD integration
  - `-q, --quiet` - Suppress non-essential output

- **Centralized Types** - Shared type definitions in `src/types/`

- **GitHub Issue Templates** - Bug report and feature request templates

- **Comprehensive Test Suite** - 60 tests covering:
  - Diplomat Agent (PR generation)
  - Engineer Agent (fix detection)
  - Watchman Agent (npm-audit parsing)
  - Error types (all classes)

### 🔧 Changed

- **Improved Code Organization**:
  - Extracted shared types to `types/` directory
  - Created `errors/` directory for error classes
  - Refactored npm-audit.ts with public helper methods

### 📦 Removed

- `website/` folder (should be separate repo)
- `QUICK_REFERENCE.md` (redundant with README)
- `vercel.json` (not needed)

---

## [1.1.0] - 2026-01-29

### 🔧 Code Quality & Consistency

This release focuses on production readiness with major refactoring for code consistency and improved documentation.

### ✨ Added

- **Comprehensive README** with:
  - npm audit comparison table showing Warden advantages
  - Complete CLI usage examples
  - Environment variables reference
  - Exit codes documentation
  
### 🔧 Changed

- **Unified Logging System** - Replaced all `console.log/warn/error` calls with centralized logger utility across all agents:
  - Diplomat Agent - consistent logging with agent prefixes
  - Engineer Agent - structured logging for fix operations
  - Watchman Agent - uniform scan progress reporting
  - Snyk Scanner - proper error and warning handling
  - Git Manager - debug-level logging for git operations
  - Spec Loader - integrated with logger system
  - HTML Report Generator - success logging for report generation

### 🐛 Bug Fixes

- **Fixed test failures**:
  - Removed unused `fs` import from validator.test.ts
  - Fixed `getConfig()` to return deep copy preventing external mutation
- **Fixed TypeScript build errors**:
  - Removed unused `oldVersion` variable in Engineer agent
  - Fixed unused `rules` variable in orchestrator
  - Removed unused `envExamplePath` in setup
  - Fixed unused `payload` parameter in notifications
  - Removed unused `id` parameter in progress forEach callback
- **Refactored deprecated code**:
  - Use `Object.hasOwn()` instead of deprecated `hasOwnProperty` in npm-audit scanner

### 📦 Dependencies

- Updated package-lock.json

---

## [1.0.0] - 2026-01-18

### 🎉 Initial Production Release

This is the first production-ready release of Warden with comprehensive improvements for real-world usage.

### ✨ Added

#### CLI & User Experience
- **Professional CLI Interface** using Commander.js
  - `warden scan` - Main scanning command with multiple options
  - `warden validate` - Pre-flight validation checks
  - `warden setup` - Interactive setup wizard
  - `warden init` - Initialize Warden in a repository
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
- **Repository Initialization** command to set up Warden in any project
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

The Warden now follows a clean architecture with:
- **CLI Layer** - User interface and command handling
- **Orchestration Layer** - Main workflow coordination
- **Agent Layer** - Specialized agents (Watchman, Engineer, Diplomat)
- **Utility Layer** - Shared utilities (logger, validator)
- **Core Layer** - Configuration and rules

### 📋 Commands

```bash
warden scan [repository] [options]  # Scan for vulnerabilities
warden validate                     # Validate environment
warden setup                        # Interactive setup
warden init                         # Initialize in repo
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

[1.1.0]: https://github.com/DevDonzo/warden/releases/tag/v1.1.0
[1.0.0]: https://github.com/DevDonzo/warden/releases/tag/v1.0.0
[0.1.0]: https://github.com/DevDonzo/warden/releases/tag/v0.1.0
