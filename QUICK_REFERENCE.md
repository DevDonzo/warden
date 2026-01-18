# Warden - Quick Reference

## 🚀 Installation

```bash
# Global (recommended)
npm install -g the-warden

# Local
git clone https://github.com/DevDonzo/the-warden.git
cd the-warden
npm install && npm run build
```

## ⚙️ Setup

```bash
# Interactive setup
warden setup

# Or create .env manually
GITHUB_TOKEN=your_token_here
SNYK_TOKEN=your_snyk_token
GITHUB_ASSIGNEE=your_username
```

## 🔍 Commands

### Scan
```bash
warden scan                           # Scan current directory
warden scan --verbose                 # With detailed logs
warden scan --dry-run                 # Preview only
warden scan https://github.com/...    # Scan remote repo
warden scan --severity critical       # Critical only
warden scan --max-fixes 3             # Fix up to 3 issues
```

### Validate
```bash
warden validate                       # Check environment
warden validate --verbose             # Detailed validation
```

### Setup & Init
```bash
warden setup                          # Interactive setup
warden init                           # Initialize in repo
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
warden setup  # Run setup wizard
```

### "Snyk CLI not found"
```bash
npm install -g snyk
# OR
warden scan --scanner npm-audit
```

### "Not a git repository"
```bash
git init
git remote add origin <url>
```

### Debug Mode
```bash
warden scan --verbose
# Check logs/warden-combined.log
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
warden --help         # General help
warden scan --help    # Command help
```

## 🎯 Quick Examples

**Scan and fix critical vulnerabilities:**
```bash
warden scan --severity critical --verbose
```

**Preview fixes without applying:**
```bash
warden scan --dry-run --max-fixes 5
```

**Scan remote repository:**
```bash
warden scan https://github.com/user/repo.git
```

**Full validation check:**
```bash
warden validate --verbose
```

---

*For detailed documentation, see README.md*
