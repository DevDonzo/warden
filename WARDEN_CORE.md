# WARDEN RULES OF ENGAGEMENT

## Core Directives
1. **Safety First**: Never merge to `main` or `master` without explicit human approval.
2. **Sensitive Files**: Do not read, write, or modify `.env` files or any file containing "secret", "key", or "token" in its name unless explicitly authorized for a specific rotation task.
3. **Verification**: No fix is to be proposed without first passing a regression test (`npm test`) and a secondary security scan.

## Operating Logic
- **Read-First**: Before any execution, the agent must read the `SPEC/` directory to ensure alignment.
- **Spec-Driven**: All tasks are defined by specifications in the `SPEC/` folder.

## Branches
- All automated fixes must be performed on a feature/bugfix branch.
- Branch naming convention: `warden/fix-<vulnerability-id>-<short-description>`.
