# Warden vs Raw Coding Agents

Codex and Claude Code can inspect a repository, explain vulnerabilities, and make patches. Warden is
useful only where it adds operational guarantees around that capability.

## Product Thesis

Warden is a governed security remediation agent. The value is not that an agent can fix a vulnerable
dependency. The value is that every run is policy-aware, repeatable, auditable, and understandable by
the next human or agent.

## What Warden Adds

- Continuous execution: CI, nightly scans, pre-deploy gates, and release checks.
- Policy enforcement: severity gates, posture gates, approval requirements, and deterministic exit
  codes.
- Durable context: `agent-run-record.json` records what broke, what changed, why it matters, and what
  was blocked.
- Regression tracking: baselines separate accepted risk from new or worsened risk.
- Memory: recurring vulnerable packages are tracked across runs.
- PR hygiene: generated fixes carry reviewer context instead of anonymous code churn.
- Machine-readable contracts: schemas let downstream agents consume artifacts safely.

## Positioning

Weak positioning:

```text
Warden uses agents to fix vulnerabilities.
```

Strong positioning:

```text
Warden makes agentic security remediation auditable and repeatable. It records why changes happened,
applies policy before acting, tracks regressions against a baseline, and leaves enough context for the
next reviewer or agent to trust the PR.
```

## Practical Buyer Reason

Teams do not need another chat window. They need a security loop that can run the same way every time:

```text
scan -> triage -> policy check -> fix safe issues -> open PR -> record rationale -> fail/pass CI
```

That loop is where Warden can be a product instead of a prompt.
