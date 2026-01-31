# Warden

**https://warden-cli.vercel.app**

> *"Who watches the code?"*

**Your autonomous security agent.** Warden hunts vulnerabilities, patches them, verifies the fix passes tests, and opens a PR—while you sleep.

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg?style=for-the-badge)](https://opensource.org/licenses/ISC)

---

## Quick Start

```bash
npm install -g @devdonzo/warden
warden setup    # interactive config wizard
warden scan     # find & fix vulnerabilities
```

---

## Why Warden?

`npm audit` tells you what's broken. **Warden fixes it.**

| | npm audit | Warden |
|--|-----------|--------|
| Find vulnerabilities | ✅ | ✅ Snyk + npm audit fallback |
| Auto-create fix branch | ❌ | ✅ |
| Run tests before PR | ❌ | ✅ |
| Open PR automatically | ❌ | ✅ |
| CVSS-based prioritization | ❌ | ✅ |
| Scan remote repos | ❌ | ✅ |
| CI/CD ready | ⚠️ | ✅ |

---

## The Council

Warden runs as an orchestrated squad of specialized agents:

**The Watchman** — Scans your deps with Snyk (falls back to npm audit). Finds the threats.

**The Engineer** — Spins up an isolated env, creates a fix branch, patches `package.json`, runs your tests. If tests fail, the fix never leaves.

**The Diplomat** — Crafts a clean PR with context on what broke, how it's fixed, and why it matters. Assigns reviewers, applies labels.

---

## Commands

```bash
warden setup              # first-time config
warden scan               # scan & fix current repo
warden scan --dry-run     # preview without changes
warden scan <github-url>  # scan any remote repo
warden scan --severity critical --max-fixes 3
warden status             # view recent scans
warden doctor             # diagnose environment issues
warden clean              # remove generated files
```

---

## Config

Drop a `.wardenrc.json` in your project root:

```json
{
  "scanner": { "primary": "snyk", "fallback": true },
  "fixes": { "maxPerRun": 5, "minSeverity": "high", "branchPrefix": "warden/fix" },
  "github": { "labels": ["security", "automated"], "autoAssign": true }
}
```

Or run `warden config --create` to generate one.

---

## Environment

| Variable | Required | Description |
|----------|----------|-------------|
| `GITHUB_TOKEN` | Yes | For PR creation |
| `SNYK_TOKEN` | No | Enhanced scanning |

Repo owner/name auto-detected from git remote.

---

## Rules of Engagement

1. **No force pushes.** Ever.
2. **No PR without passing tests.**
3. **Human merges.** Warden proposes, you approve.

---

## Exit Codes

`0` — Clean. `1` — Vulns found. `2` — Scan failed.

---

## License

ISC © [DevDonzo](https://github.com/DevDonzo)
