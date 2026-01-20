---
layout: home

hero:
  name: "@cinevva/usdjs-renderer"
  text: Headless USD Renderer
  tagline: Render USD scenes to PNG using Playwright and the same viewer code.
  actions:
    - theme: brand
      text: CLI Usage
      link: /cli
    - theme: alt
      text: View on GitHub
      link: https://github.com/cinevva-engine/usdjs-renderer

features:
  - icon: 📸
    title: Pixel Parity
    details: Renders using the exact same Three.js shaders as the browser viewer.
  - icon: 🤖
    title: Headless
    details: Runs in headless Chromium via Playwright—no GUI required.
  - icon: 🧪
    title: Regression Testing
    details: Perfect for CI/CD visual regression tests and parity checks.
---

## What It Does

Renders USD scenes to PNG by:

1. Loading `@cinevva/usdjs-viewer` in headless Chromium
2. Serving USD assets via a local server
3. Screenshotting the WebGL canvas

The key advantage is **pixel parity** with the browser viewer.

## Honest Assessment

| What It Is | What It Isn't |
|------------|---------------|
| ✅ Testing harness | ❌ Production renderer |
| ✅ Regression tool | ❌ High-throughput batch system |
| ✅ Parity checker | ❌ Full USD render engine |

## Installation

```bash
npm install @cinevva/usdjs-renderer playwright
npx playwright install chromium
```

## Related

- **[@cinevva/usdjs](https://cinevva-engine.github.io/usdjs/)** — Core parsing and composition
- **[@cinevva/usdjs-viewer](https://cinevva-engine.github.io/usdjs-viewer/)** — Browser-based viewer
