# 🚀 Deployment Checklist

## Pre-Deployment

- [ ] All tests passing (`npm test`)
- [ ] Build successful (`npm run build`)
- [ ] No TypeScript errors
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Version number correct in package.json

## Website Deployment

### Option 1: Automated Script
```bash
./deploy-website.sh
```

### Option 2: Manual Vercel
```bash
cd website
vercel login
vercel
vercel --prod
```

### Checklist
- [ ] Vercel CLI installed
- [ ] Logged in to Vercel
- [ ] Website deployed to preview
- [ ] Website deployed to production
- [ ] Custom domain configured (optional)
- [ ] SSL certificate active

## npm Publishing

### Pre-Publish
```bash
# Test local installation
npm pack
npm install -g ./devdonzo-the-sentinel-1.0.0.tgz
sentinel --version
sentinel --help
```

### Publish
```bash
npm login
npm publish --access public
```

### Post-Publish
```bash
# Verify
npm view @devdonzo/the-sentinel

# Test installation
npm install -g @devdonzo/the-sentinel
sentinel --version
```

### Checklist
- [ ] npm account created
- [ ] Logged in to npm
- [ ] Package name available
- [ ] Local test successful
- [ ] Published to npm
- [ ] Installation test successful
- [ ] README badges updated

## GitHub

### Repository Setup
```bash
git add .
git commit -m "feat: production-ready release v1.0.0"
git push origin main
git tag v1.0.0
git push origin v1.0.0
```

### GitHub Actions
- [ ] Workflows added to `.github/workflows/`
- [ ] `NPM_TOKEN` secret added
- [ ] `SNYK_TOKEN` secret added (optional)
- [ ] Workflows tested

### GitHub Release
- [ ] Create release from tag v1.0.0
- [ ] Add release notes from CHANGELOG.md
- [ ] Attach binaries (if any)
- [ ] Mark as latest release

### Checklist
- [ ] Code pushed to GitHub
- [ ] Tags pushed
- [ ] GitHub Actions configured
- [ ] Secrets added
- [ ] Release created
- [ ] Repository description updated
- [ ] Topics/tags added

## Post-Deployment

### Verification
- [ ] Website live and accessible
- [ ] npm package installable globally
- [ ] CLI commands working
- [ ] GitHub Actions running
- [ ] Badges showing correct info

### Monitoring
- [ ] npm download stats
- [ ] GitHub stars/forks
- [ ] Issue tracker active
- [ ] Discussions enabled (optional)

### Promotion
- [ ] Tweet announcement
- [ ] LinkedIn post
- [ ] Reddit post (r/javascript, r/node, r/devops)
- [ ] Hacker News submission
- [ ] Dev.to article
- [ ] Product Hunt launch (optional)

## Quick Commands

### Deploy Everything
```bash
./setup-all.sh
```

### Deploy Website Only
```bash
./deploy-website.sh
```

### Publish to npm Only
```bash
npm login
npm publish --access public
```

### Create GitHub Release
```bash
gh release create v1.0.0 \
  --title "The Sentinel v1.0.0" \
  --notes-file CHANGELOG.md
```

## Rollback Plan

### Website
```bash
# Vercel
vercel rollback
```

### npm
```bash
# Deprecate version
npm deprecate @devdonzo/the-sentinel@1.0.0 "Use 1.0.1+"

# Publish fix
npm version patch
npm publish
```

### GitHub
```bash
# Revert commit
git revert HEAD
git push origin main
```

## Support Channels

After deployment, monitor:
- GitHub Issues
- npm package page
- Twitter mentions
- Email notifications

## Success Metrics

Track:
- npm downloads per week
- GitHub stars
- Issues opened/closed
- PR contributions
- Website visits

---

## Ready to Deploy?

Run this final check:

```bash
npm run build && npm test && echo "✅ Ready to deploy!"
```

Then:

1. Deploy website: `./deploy-website.sh`
2. Publish to npm: `npm publish --access public`
3. Push to GitHub: `git push && git push --tags`
4. Create GitHub release
5. Announce on social media

---

*Good luck with the launch! 🚀*
