### USD (USDA) backend renderer (pixel-parity with our `usdjs-viewer`)

This renderer uses **headless Chromium** to run the **same** Three.js + `@cinevva/usdjs` viewer code and then saves a PNG from the canvas. This is the most reliable way to match our browser viewer output.

### Prereqs (macOS)

- **Build the viewer bundle** (so the script can load `packages/usdjs-viewer/dist`):

```bash
npm run usdjs:viewer:build
```

- **Install Playwright + Chromium** (one-time):

```bash
npm i -D playwright
npx playwright install chromium
```

### Usage

Render an entry USDA file under a root directory (textures/sublayers referenced from the USDA must exist under the same root):

```bash
npm run usdjs:render:png -- --root /ABS/PATH/TO/ASSET_ROOT --entry scene.usda --out /ABS/PATH/out.png --width 1024 --height 1024
```

- **Camera**: taken from USDA `customLayerData.cameraSettings` when present (same as the viewer), otherwise defaults to viewer defaults.
- **Render settings**: taken from USDA `customLayerData.renderSettings` when present (same as the viewer), otherwise defaults to viewer defaults.

### Notes / limitations

- The viewer’s USD text composition is supported via `@cinevva/usdjs` (USDA and composed sublayers/references/payloads as implemented there).
- Binary USD (`.usdc/.usdz`) support depends on `@cinevva/usdjs` capabilities; the renderer currently treats them as “text” for serving but they may not parse.











