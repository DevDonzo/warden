# The Sentinel Website

Beautiful, minimal landing page for The Sentinel security automation tool.

## 🎨 Design

Inspired by modern, clean aesthetics with:
- Dark mode gradient background
- Smooth animations
- Interactive elements
- Responsive design
- Particle effects

## 🚀 Quick Start

### Local Development

Simply open `index.html` in your browser:

```bash
open index.html
```

Or use a local server:

```bash
# Python
python -m http.server 8000

# Node.js
npx serve .

# PHP
php -S localhost:8000
```

Then visit `http://localhost:8000`

## 📦 Deployment

### Vercel (Recommended)

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Deploy:
```bash
vercel
```

3. Follow the prompts

### Netlify

1. Install Netlify CLI:
```bash
npm install -g netlify-cli
```

2. Deploy:
```bash
netlify deploy
```

### GitHub Pages

1. Push to GitHub
2. Go to Settings → Pages
3. Select branch and `/website` folder
4. Save

### Manual Deployment

Upload these files to any static hosting:
- `index.html`
- `styles.css`
- `script.js`

## 🎨 Customization

### Colors

Edit `styles.css` variables:

```css
:root {
    --bg-primary: #0a0a0a;
    --bg-secondary: #111111;
    --text-primary: #ffffff;
    --text-secondary: #a0a0a0;
    --accent-blue: #3b82f6;
    --accent-purple: #8b5cf6;
    --border-color: #2a2a2a;
}
```

### Content

Edit `index.html` to update:
- Hero text
- Features
- Installation commands
- Links

### Animations

Modify `script.js` for:
- Particle effects
- Scroll animations
- Interaction effects

## 📱 Responsive

The site is fully responsive and works on:
- Desktop (1920px+)
- Laptop (1024px+)
- Tablet (768px+)
- Mobile (320px+)

## 🌐 Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers

## 📄 License

ISC License - Same as The Sentinel project

## 🙏 Credits

Design inspired by [Tempo](https://claudetempo.vercel.app)
