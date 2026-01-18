# The Sentinel - Quick Reference

## 🚀 Installation

```bash
# Global (recommended)
npm install -g the-sentinel

# Local
git clone https://github.com/DevDonzo/the-sentinel.git
cd the-sentinel
npm install && npm run build
```

## ⚙️ Setup

```bash
# Interactive setup
sentinel setup

# Or create .env manually
GITHUB_TOKEN=your_token_here
SNYK_TOKEN=your_snyk_token
GITHUB_ASSIGNEE=your_username
```

## 🔍 Commands

### Scan
```bash
sentinel scan                           # Scan current directory
sentinel scan --verbose                 # With detailed logs
sentinel scan --dry-run                 # Preview only
sentinel scan https://github.com/...    # Scan remote repo
sentinel scan --severity critical       # Critical only
sentinel scan --max-fixes 3             # Fix up to 3 issues
```

### Validate
```bash
sentinel validate                       # Check environment
sentinel validate --verbose             # Detailed validation
```

### Setup & Init
```bash
sentinel setup                          # Interactive setup
sentinel init                           # Initialize in repo
```

## 📋 Common Options

| Option | Description |
|--------|-------------|
| `-v, --verbose` | Enable verbose logging |
| `--dry-run` | Preview without applying |
| `--skip-validation` | Skip pre-flight checks |
| `--scanner <type>` | snyk, npm-audit, or all |
| `--severity <level>` | low, medium, high, critical |
| `--max-fixes <n>` | Max number of fixes |

## 🐛 Troubleshooting

### "GITHUB_TOKEN is required"
```bash
sentinel setup  # Run setup wizard
```

### "Snyk CLI not found"
```bash
npm install -g snyk
# OR
sentinel scan --scanner npm-audit
```

### "Not a git repository"
```bash
git init
git remote add origin <url>
```

### Debug Mode
```bash
sentinel scan --verbose
# Check logs/sentinel-combined.log
```

## 📁 Project Structure

```
.
├── SENTINEL_CORE.md    # Rules of engagement
├── SPEC/               # Task specifications
├── scan-results/       # Scan outputs
├── logs/               # Application logs
└── workspaces/         # Remote repos
```

## 🔧 Development

```bash
npm install             # Install dependencies
npm run build           # Build project
npm test                # Run tests
npm run dev             # Development mode
```

## 📚 Documentation

- `README.md` - Full documentation
- `CONTRIBUTING.md` - Contribution guide
- `CHANGELOG.md` - Version history
- `PHASE1_SUMMARY.md` - Feature summary

## 🆘 Getting Help

```bash
sentinel --help         # General help
sentinel scan --help    # Command help
```

## 🎯 Quick Examples

**Scan and fix critical vulnerabilities:**
```bash
sentinel scan --severity critical --verbose
```

**Preview fixes without applying:**
```bash
sentinel scan --dry-run --max-fixes 5
```

**Scan remote repository:**
```bash
sentinel scan https://github.com/user/repo.git
```

**Full validation check:**
```bash
sentinel validate --verbose
```

---

*For detailed documentation, see README.md*
