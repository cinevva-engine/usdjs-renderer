## `@cinevva/usdjs-renderer`

This package renders USD scenes to PNG by running the **same** `@cinevva/usdjs-viewer` code in **headless Chromium (Playwright)** and screenshotting the canvas.

The key advantage is **pixel parity** with the browser viewer (same Three.js shaders, same material interpretation, same camera defaults).

### Status (brutally honest)

- This is a **harness**, not a general USD renderer.
- It assumes the viewer can load/render the scene. If the viewer doesn’t support a schema/material feature, the renderer won’t either.
- It is not designed for high-throughput batch farms (yet). It’s meant for regression tests and parity checks.

### Install

```bash
npm i -D @cinevva/usdjs-renderer playwright
npx playwright install chromium
```

### Usage

Render an entry USDA file under a root directory (textures/sublayers referenced from the USDA must exist under the same root):

```bash
usdjs-render-png --root /ABS/PATH/TO/ASSET_ROOT --entry scene.usda --out /ABS/PATH/out.png --width 1024 --height 1024
```

If you have a local checkout of the viewer, point to its built `dist`:

```bash
usdjs-render-png --viewer-dist /ABS/PATH/TO/usdjs-viewer/dist --root /ABS/PATH/TO/ASSET_ROOT --entry scene.usda --out out.png
```

### Notes / limitations

- **Camera/render settings** can be taken from USDA `customLayerData.cameraSettings` / `customLayerData.renderSettings` when present (matching viewer behavior).
- Binary USD (`.usdc/.usdz`) support depends on `@cinevva/usdjs` capabilities and viewer pipeline.

### License

MIT (see `LICENSE`).

