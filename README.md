# Australian Tax Estimate Calculator

Static site (no build step) that estimates Australian individual income tax using published ATO rates.

## Run locally

Use a local server. Opening `index.html` directly (`file://`) can block scripts in some browsers.

```bash
npx --yes serve .
```

Then open the URL shown (e.g. http://localhost:3000).

## Deploy to GitHub Pages

### 1. Confirm your site URL

For a **project site** (repo name `tax-estimate-calculator`):

```text
https://lachlanallison.github.io/tax-estimate-calculator/
```

For a **user/org site** (repo name `lachlanallison.github.io`, contents at repo root):

```text
https://lachlanallison.github.io/
```

**Before the first deploy**, confirm canonical, Open Graph, and Twitter URLs in `index.html` match your GitHub Pages URL (currently set for `lachlanallison.github.io/tax-estimate-calculator`).

### 2. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit: Australian tax estimate calculator"
git branch -M main
git remote add origin https://github.com/lachlanallison/tax-estimate-calculator.git
git push -u origin main
```

### 3. Enable GitHub Pages

1. GitHub repo → **Settings** → **Pages**
2. **Build and deployment** → Source: **Deploy from a branch**
3. Branch: `main`, folder: **`/ (root)`**
4. Save. The site will be live at your URL within a few minutes.

### 4. Verify after deploy

- [ ] Home page loads and calculates
- [ ] Favicon appears in the browser tab
- [ ] [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) or [opengraph.xyz](https://www.opengraph.xyz/) shows `og-image.png`
- [ ] Profiles and Prorata side panels work

## Files for publishing

| File | Purpose |
|------|---------|
| `.nojekyll` | Disables Jekyll processing on GitHub Pages |
| `404.html` | Redirects unknown paths back to the calculator |
| `favicon.svg` | Browser tab icon (original vector) |
| `og-image.png` / `og-image.svg` | Social preview image |
| `site.webmanifest` | PWA-style app metadata |
| `icons/icon-192.svg`, `icons/icon-512.svg` | Manifest / home-screen icons |

## Supported income years

- 2022–23, 2023–24, 2024–25, 2025–26 (resident and foreign resident brackets, Medicare levy, MLS, HELP)

## Scope & assumptions

See the disclaimer on the page. Notable simplifications:

- Taxable income = gross income minus deductions (no prior-year loss offsets).
- MLS and study loan repayment income use taxable income only (no RFB/RESC/net investment loss adjustments).
- Single taxpayer Medicare levy reduction only (no family levy worksheet).
- Franking credits applied as a refundable tax offset.

Rates are maintained in `js/rates.js` — verify against the ATO when updating.

## Disclaimer

This calculator is an estimate only. It is not tax advice. Confirm figures with the ATO or a registered tax agent before lodging.
