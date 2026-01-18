# Publishing The Sentinel to npm

## 📦 Pre-Publishing Checklist

Before publishing to npm, ensure:

- [ ] All tests pass (`npm test`)
- [ ] Build succeeds (`npm run build`)
- [ ] Version number updated in `package.json`
- [ ] CHANGELOG.md updated
- [ ] README.md is complete
- [ ] LICENSE file present
- [ ] .npmignore configured
- [ ] Repository pushed to GitHub

## 🚀 Publishing Steps

### 1. Test Local Installation

Test the package locally before publishing:

```bash
# Build the package
npm run build

# Create a tarball
npm pack

# This creates: devdonzo-the-sentinel-1.0.0.tgz

# Test installation in another directory
cd /tmp
npm install /path/to/the-sentinel/devdonzo-the-sentinel-1.0.0.tgz

# Test the CLI
sentinel --help
sentinel validate

# Clean up
npm uninstall @devdonzo/the-sentinel
```

### 2. Login to npm

```bash
npm login
```

Enter your:
- Username
- Password
- Email
- 2FA code (if enabled)

### 3. Publish to npm

#### First Time (Public Package)

```bash
# Publish with public access
npm publish --access public
```

#### Subsequent Updates

```bash
# Update version first
npm version patch  # 1.0.0 -> 1.0.1
# or
npm version minor  # 1.0.0 -> 1.1.0
# or
npm version major  # 1.0.0 -> 2.0.0

# Publish
npm publish
```

### 4. Verify Publication

```bash
# Check on npm
npm view @devdonzo/the-sentinel

# Install globally to test
npm install -g @devdonzo/the-sentinel

# Test
sentinel --version
sentinel --help
```

## 📋 Version Management

### Semantic Versioning

- **MAJOR** (1.0.0 -> 2.0.0): Breaking changes
- **MINOR** (1.0.0 -> 1.1.0): New features, backward compatible
- **PATCH** (1.0.0 -> 1.0.1): Bug fixes

### Update Version

```bash
# Patch release (bug fixes)
npm version patch

# Minor release (new features)
npm version minor

# Major release (breaking changes)
npm version major

# Custom version
npm version 1.2.3
```

## 🏷️ npm Tags

### Latest (Default)

```bash
npm publish
```

### Beta Release

```bash
npm publish --tag beta
```

### Next Release

```bash
npm publish --tag next
```

### Install Specific Tag

```bash
npm install @devdonzo/the-sentinel@beta
```

## 📊 Post-Publishing

### 1. Update README Badges

Add npm badges to README.md:

```markdown
[![npm version](https://badge.fury.io/js/%40devdonzo%2Fthe-sentinel.svg)](https://www.npmjs.com/package/@devdonzo/the-sentinel)
[![npm downloads](https://img.shields.io/npm/dm/@devdonzo/the-sentinel.svg)](https://www.npmjs.com/package/@devdonzo/the-sentinel)
```

### 2. Create GitHub Release

```bash
# Tag the release
git tag v1.0.0
git push origin v1.0.0
```

Then create a release on GitHub with:
- Release notes from CHANGELOG.md
- Binary downloads (optional)
- Migration guide (if breaking changes)

### 3. Announce

- Tweet about the release
- Post on Reddit (r/javascript, r/node)
- Share on LinkedIn
- Update personal website

## 🔄 Continuous Publishing

### GitHub Actions Workflow

Create `.github/workflows/publish.yml`:

```yaml
name: Publish to npm

on:
  release:
    types: [created]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci
      - run: npm test
      - run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## 🛡️ Security

### npm 2FA

Enable 2FA for publishing:

```bash
npm profile enable-2fa auth-and-writes
```

### Access Tokens

Create automation tokens:

1. Go to npmjs.com
2. Access Tokens → Generate New Token
3. Select "Automation"
4. Copy token
5. Add to GitHub Secrets as `NPM_TOKEN`

## 📝 Package Maintenance

### Deprecate a Version

```bash
npm deprecate @devdonzo/the-sentinel@1.0.0 "Critical bug, use 1.0.1+"
```

### Unpublish (Within 72 hours)

```bash
npm unpublish @devdonzo/the-sentinel@1.0.0
```

⚠️ **Warning**: Unpublishing is permanent and can break dependents!

### Transfer Ownership

```bash
npm owner add <username> @devdonzo/the-sentinel
npm owner rm <username> @devdonzo/the-sentinel
```

## 🎯 Best Practices

1. **Always test locally** before publishing
2. **Update CHANGELOG.md** for every release
3. **Use semantic versioning** consistently
4. **Tag releases** in git
5. **Keep README updated** with latest features
6. **Respond to issues** promptly
7. **Monitor downloads** and feedback
8. **Keep dependencies updated**

## 📈 Monitoring

### npm Stats

```bash
npm view @devdonzo/the-sentinel
```

### Download Stats

- [npm-stat.com](https://npm-stat.com/charts.html?package=@devdonzo/the-sentinel)
- [npmcharts.com](https://npmcharts.com/compare/@devdonzo/the-sentinel)

## 🐛 Troubleshooting

### "Package name already exists"

- Choose a different name
- Use scoped package: `@username/package-name`

### "You must verify your email"

```bash
npm profile get
# Verify email on npmjs.com
```

### "403 Forbidden"

- Check you're logged in: `npm whoami`
- Check package access
- Enable 2FA if required

## ✅ Ready to Publish?

Run this final check:

```bash
# 1. Clean install
rm -rf node_modules package-lock.json
npm install

# 2. Run tests
npm test

# 3. Build
npm run build

# 4. Pack and inspect
npm pack
tar -tzf devdonzo-the-sentinel-*.tgz

# 5. Publish!
npm publish --access public
```

---

*Your package will be available at: https://www.npmjs.com/package/@devdonzo/the-sentinel* 📦
