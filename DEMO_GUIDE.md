# The Sentinel - Demo Guide

## 🎬 Quick Demo (5 minutes)

### What You'll See:
The Sentinel will scan this repository, find vulnerabilities, and show you what it would fix.

### Steps:

1. **Build the project:**
   ```bash
   npm run build
   ```

2. **Run in demo mode:**
   ```bash
   node dist/index.js scan --dry-run --verbose
   ```

   This will:
   - ✅ Scan for vulnerabilities (using mock data if Snyk not configured)
   - ✅ Show what fixes it would apply
   - ✅ NOT actually make any changes (--dry-run)

3. **See the results:**
   - Check `scan-results/scan-results.json` for detailed findings
   - Check `logs/sentinel-combined.log` for full logs

### Example Output:

```
🛡️  THE SENTINEL | Autonomous Security Orchestrator
════════════════════════════════════════════════════════════

📋 Loading Configuration
✓ Loaded 2 specification(s)

🔍 WATCHMAN AGENT | Security Scan
⠋ Running security scan...
✓ Security scan completed

📊 Scan Summary:
  Total Vulnerabilities: 5
  🔴 Critical: 1
  🟠 High: 2
  🟡 Medium: 2
  🟢 Low: 0

🔧 ENGINEER AGENT | Diagnosing & Patching
[DRY RUN] Would apply the following fix:
  Vulnerability: SNYK-JS-LODASH-590103
  Description: Prototype Pollution in lodash@4.17.15 (CRITICAL)
  Fix: Update lodash from 4.17.15 to 4.17.21
  Files: package.json

✅ Patrol Session Completed Successfully
```

## 🔧 Full Demo (with actual fixes)

**⚠️ Warning:** This will create actual branches and PRs!

1. **Setup (one-time):**
   ```bash
   node dist/index.js setup
   ```
   - Enter your GitHub token
   - Enter your Snyk token (or skip for npm audit)

2. **Scan and fix:**
   ```bash
   node dist/index.js scan --verbose
   ```

3. **Check GitHub:**
   - A new branch will be created: `sentinel/fix-lodash`
   - A PR will be opened with the fix
   - You can review and merge it

## 📊 Understanding the Output

### Scan Results (`scan-results/scan-results.json`):
```json
{
  "timestamp": "2026-01-18T12:00:00.000Z",
  "vulnerabilities": [
    {
      "id": "SNYK-JS-LODASH-590103",
      "title": "Prototype Pollution",
      "severity": "critical",
      "packageName": "lodash",
      "version": "4.17.15",
      "fixedIn": ["4.17.21"]
    }
  ],
  "summary": {
    "total": 5,
    "critical": 1,
    "high": 2,
    "medium": 2,
    "low": 0
  }
}
```

### Logs (`logs/sentinel-combined.log`):
- Detailed execution logs
- Error messages (if any)
- Timing information
- API calls made

## 🎯 Try Different Modes

### Dry Run (safe, no changes):
```bash
node dist/index.js scan --dry-run
```

### Verbose (see everything):
```bash
node dist/index.js scan --verbose
```

### Critical only:
```bash
node dist/index.js scan --severity critical
```

### Fix multiple issues:
```bash
node dist/index.js scan --max-fixes 3
```

### Scan remote repo:
```bash
node dist/index.js scan https://github.com/user/repo.git
```

## 🔍 What to Look For

### Good Signs:
- ✅ "All validations passed"
- ✅ "Security scan completed"
- ✅ "Fix applied successfully"
- ✅ "Pull Request created"

### Common Issues:
- ❌ "GITHUB_TOKEN is required" → Run `node dist/index.js setup`
- ❌ "Snyk CLI not found" → Install with `npm install -g snyk` or use `--scanner npm-audit`
- ❌ "Not a git repository" → Run from inside a git repo

## 🎨 Visual Demo

Want to see it in action? Run:

```bash
# Full demo with all features
node dist/index.js scan --verbose --dry-run
```

Watch for:
1. 🔍 Scanning animation
2. 📊 Progress bars
3. ✅ Success indicators
4. 📝 Detailed logs

## 🚀 Next Steps

After the demo:
1. Review the scan results
2. Check the logs
3. Try scanning a real project
4. Configure notifications (Slack/Discord)
5. Set up GitHub Actions for automation

---

*The Sentinel works best when you let it run automatically!* 🛡️
