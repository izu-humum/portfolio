# Deploy your portfolio to the web

Your site is static (HTML, CSS, JS), so you can host it for free in a few minutes.

---

## Option 1: GitHub Pages (recommended — you already have the repo)

1. **Push your latest code to GitHub** (if you haven’t already):
   ```bash
   cd /Users/izu/portfolio
   git add .
   git commit -m "Ready for deploy"
   git push origin main
   ```

2. **Turn on GitHub Pages:**
   - Open: **https://github.com/izu-humum/portfolio**
   - Click **Settings** → **Pages** (left sidebar).
   - Under **Source**, choose **Deploy from a branch**.
   - Branch: **main**.
   - Folder: **/ (root)**.
   - Click **Save**.

3. **Wait 1–2 minutes**, then open:
   - **https://izu-humum.github.io/portfolio/**

You can share that link so people can see your portfolio.

---

## Option 2: Netlify (custom domain or drag-and-drop)

1. Go to **https://app.netlify.com** and sign up / log in (free).
2. Either:
   - **Drag and drop:** Drag your **portfolio** folder onto the Netlify “Deploy” area, or  
   - **Connect GitHub:** “Add new site” → “Import from Git” → choose **izu-humum/portfolio**, then deploy.
3. Netlify will give you a URL like `something.netlify.app`. You can add a custom domain in Site settings.

---

## After deploy

- **GitHub Pages:** Every `git push origin main` will update the site automatically.
- **Netlify (Git connected):** Same — push to main and the site updates.

If you want a custom domain (e.g. `humamahmed.com`), you can set it in GitHub Pages or Netlify settings and point your domain’s DNS to the host’s instructions.
