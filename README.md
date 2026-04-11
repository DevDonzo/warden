# Warden

**https://warden-cli.vercel.app**

> *"Who watches the code?"*

**Your autonomous security agent.** Warden hunts vulnerabilities, patches them, verifies the fix passes tests, and opens a PR—while you sleep.

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg?style=for-the-badge)](https://opensource.org/licenses/ISC)

---

## What’s new

This release introduces a robust architectural redesign that enables safer, more extensible security automation:

- Architecture now uses a workflow-based orchestration model.
- A plugin-friendly scanner system (Watchman) with adapters and a mock scanner for demos.
- A dedicated fixer abstraction, decoupled from npm specifics.
- Centralized utilities (shell execution, progress reporting, constants).
- Mock data pathways to demonstrate end-to-end flows without external dependencies.

Read on for the design details and a list of added/updated files.

---

## Architecture at a glance

- The Watchman component still drives SAST scans (dependency scanning) but its internal logic is now decoupled from the orchestrator and can host multiple scanners via a registry.
- The Fixer abstraction lets you plug in different package managers (npm, pip, cargo, etc.) in the future without changing the engineer’s orchestration.
- The orchestrator has been decomposed into workflow strategies:
  - SAST workflow (SastWorkflow) handles clone/prepare, scanning, diagnostics, and patch orchestration.
  - DAST workflow (DastWorkflow) handles infrastructure scanning (Nmap + Metasploit), result merging, and advisory PR generation.
- Central utilities:
  - A cross-cutting shell service for robust command execution.
  - Progress reporting abstraction that decouples UI rendering from business logic.
- Mocks
  - A MockScanner is provided for demo mode to showcase end-to-end flows without external tools.

---

## New and Updated Files

- Architecture, scaffolding, and utilities
  - `Warden/src/services/shell.ts` (new)
  - `Warden/src/scanners/index.ts` (new)
  - `Warden/src/scanners/snyk-adapter.ts` (new)
  - `Warden/src/scanners/npm-audit-adapter.ts` (new)
  - `Warden/src/scanners/mock-scanner.ts` (new)
  - `Warden/src/workflows/index.ts` (new)
  - `Warden/src/workflows/sast-workflow.ts` (new)
  - `Warden/src/workflows/dast-workflow.ts` (new)

- Core abstractions and adapters
  - `Warden/src/agents/engineer/fixer.ts` (new)
  - `Warden/src/agents/engineer/index.ts` (updated to use fixer)
  - `Warden/src/agents/watchman/index.ts` (updated to use ScannerRegistry)

- Core data types and configuration
  - `Warden/src/types/index.ts` (updated)
  - `Warden/src/constants.ts` (updated)
  - `Warden/src/utils/mock-data.ts` (updated)

- Orchestration
  - `Warden/src/orchestrator.ts` (refactored to delegate to workflows)

- Documentation (README)
  - `Warden/README.md` (to be updated with architecture summary)

- Misc
  - `Warden/video/*` (assets prepared for video/demo scaffolding)
  - `Warden/nextsteps.md` (arch notes generated earlier; you can prune if not needed)

Notes
- The adapters bridge existing scanners into a common interface so you can drop-in new scanners without changing orchestration logic.
- The mock data path ensures demo flows can run offline and demonstrate the full pipeline.

---

## How to work with the new architecture

- Workflow orchestration
  - SAST: `SastWorkflow` encapsulates the end-to-end SAST lifecycle (workspace prep, scanning, diagnosing, and patching).
  - DAST: `DastWorkflow` encapsulates the DAST lifecycle (Nmap + Metasploit, merging, and advisory PR generation).

- Scanner plugin system
  - The `ScannerRegistry` coordinates registered scanners.
  - Adapters wrap existing scanners to conform to the `IScanner` contract.
  - `MockScanner` is available for demos and tests.

- Fixer abstraction
  - The `IFixer` interface defines how fix operations are performed.
  - `NpmFixer` implements the npm-based fix flow (branch creation, package.json update, lockfile refresh, test, commit).

- Central utilities
  - `shell.ts` provides a single place for running shell commands with consistent error handling and timeouts.
  - Progress reporting is centralized via `ProgressReporter` to keep CLIs consistent across agents.

- Mocks and testing
  - A dedicated mock scanner helps validate the end-to-end flow without external dependencies.

---

## How to run (recap)

- SAST scan
  - Use the existing CLI: `warden scan [repo]` (or the appropriate invocation your setup uses)
  - The system will drive the workflow-based orchestration and handle fixes and PRs.

- DAST scan
  - `warden dast <target>` (target must be configured in the DAST section of your config)

- Demo mode
  - When scanners fail in a local environment, Warden can fall back to `MockScanner` data to demonstrate the end-to-end path (scan → diagnose → fix/advisory).

- Auto-fix flow
  - If a fix is applicable, the Engineer uses the NpmFixer to update dependencies and run verifications.
  - The Diplomat then opens a PR with a descriptive body and labels.

---

## Design notes

- The architecture favors extension: adding a new scanner plugin or a new fixer is a matter of implementing a couple of interfaces and two new adapters, then registering them.
- The centralization of utility behavior (shell, progress, constants) reduces duplication and standardizes behavior across all agents.
- The MockScanner pathway ensures you can demonstrate the entire lifecycle without an active Snyk/NPM environment or external services.

---

## Next steps (optional)

- Flesh out additional Fixers (e.g., for Python (Pip), Rust (Cargo)) as new adapters implementing `IFixer`.
- Extend the docs with a dedicated “Contributing” section describing how to add a new scanner plugin.
- Add a minimal end-to-end test that runs the MockScanner path through the entire pipeline, asserting PR generation behavior.

---

If you want me to push this README change to the remote repository as well, I can prepare a commit for you to push from your side. Let me know if you want me to tailor the README further (for example, adding a quick-start guide or a diagram).