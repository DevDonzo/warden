# The Sentinel - Deployment Guide

## 🚀 Quick Deploy to Vercel

### Option 1: Vercel CLI (Recommended)

1. **Install Vercel CLI:**
```bash
npm install -g vercel
```

2. **Login to Vercel:**
```bash
vercel login
```

3. **Deploy from project root:**
```bash
vercel
```

4. **Follow the prompts:**
   - Set up and deploy? **Y**
   - Which scope? Select your account
   - Link to existing project? **N**
   - What's your project's name? **the-sentinel**
   - In which directory is your code located? **./website**
   - Want to override the settings? **N**

5. **Deploy to production:**
```bash
vercel --prod
```

### Option 2: Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repository
4. Configure:
   - **Root Directory:** `website`
   - **Framework Preset:** Other
   - **Build Command:** (leave empty)
   - **Output Directory:** (leave empty)
5. Click "Deploy"

### Option 3: Deploy Button

Click this button to deploy:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/DevDonzo/the-sentinel&project-name=the-sentinel&repository-name=the-sentinel)

---

## 🌐 Alternative Deployments

### Netlify

1. **Install Netlify CLI:**
```bash
npm install -g netlify-cli
```

2. **Login:**
```bash
netlify login
```

3. **Deploy:**
```bash
cd website
netlify deploy
```

4. **Deploy to production:**
```bash
netlify deploy --prod
```

### GitHub Pages

1. **Create `gh-pages` branch:**
```bash
git checkout -b gh-pages
```

2. **Copy website files to root:**
```bash
cp -r website/* .
git add .
git commit -m "Deploy to GitHub Pages"
git push origin gh-pages
```

3. **Enable GitHub Pages:**
   - Go to repository Settings
   - Navigate to Pages
   - Select `gh-pages` branch
   - Save

### Cloudflare Pages

1. Go to [Cloudflare Pages](https://pages.cloudflare.com)
2. Connect your GitHub repository
3. Configure:
   - **Build directory:** `website`
   - **Build command:** (none)
4. Deploy

---

## 🔧 Custom Domain

### Vercel

1. Go to your project dashboard
2. Click "Settings" → "Domains"
3. Add your custom domain
4. Update DNS records as instructed

### Netlify

1. Go to "Domain settings"
2. Click "Add custom domain"
3. Follow DNS configuration steps

---

## 📊 Post-Deployment

After deployment, your site will be available at:
- **Vercel:** `https://the-sentinel.vercel.app`
- **Netlify:** `https://the-sentinel.netlify.app`
- **GitHub Pages:** `https://yourusername.github.io/the-sentinel`

---

## 🎯 Recommended: Vercel

**Why Vercel?**
- ✅ Instant deployments
- ✅ Automatic HTTPS
- ✅ Global CDN
- ✅ Zero configuration
- ✅ Free for personal projects
- ✅ Perfect for static sites

---

## 🔄 Continuous Deployment

Once connected to GitHub:
1. Push to `main` branch
2. Vercel/Netlify automatically deploys
3. Preview deployments for PRs
4. Instant rollbacks if needed

---

## 📝 Environment Variables (if needed)

If you add dynamic features later:

**Vercel:**
```bash
vercel env add VARIABLE_NAME
```

**Netlify:**
```bash
netlify env:set VARIABLE_NAME value
```

---

## ✅ Deployment Checklist

- [ ] Website files in `/website` directory
- [ ] `vercel.json` configured (if using Vercel)
- [ ] GitHub repository pushed
- [ ] Vercel/Netlify account created
- [ ] CLI installed and logged in
- [ ] Deployment command executed
- [ ] Custom domain configured (optional)
- [ ] SSL certificate verified
- [ ] Test all links and features

---

*Your website will be live in seconds!* 🚀
