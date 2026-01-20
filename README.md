# @cinevva/usdjs-renderer

Headless PNG renderer for USD scenes using **Playwright** and **@cinevva/usdjs-viewer**.

---

## What It Does

Renders USD scenes to PNG by:
1. Loading the same `@cinevva/usdjs-viewer` in headless Chromium
2. Serving USD assets via a local server
3. Screenshotting the WebGL canvas

The key advantage is **pixel parity** with the browser viewer—same shaders, same materials, same camera defaults.

---

## Status (Honest Assessment)

- ✅ Works for regression testing and visual parity checks
- ✅ Supports USDA, USDC, and USDZ files
- ❌ Not designed for high-throughput batch rendering
- ❌ Inherits all limitations of `@cinevva/usdjs-viewer`

This is a **testing harness**, not a production renderer.

---

## Installation

```bash
npm install @cinevva/usdjs-renderer playwright
npx playwright install chromium
```

---

## Usage

### Command Line

```bash
# Basic usage
usdjs-render-png \
    --root /path/to/asset/directory \
    --entry scene.usda \
    --out output.png \
    --width 1024 \
    --height 1024

# With custom viewer dist
usdjs-render-png \
    --viewer-dist /path/to/usdjs-viewer/dist \
    --root /path/to/assets \
    --entry model.usdz \
    --out render.png
```

### CLI Options

| Option | Required | Description |
|--------|----------|-------------|
| `--root` | Yes | Directory containing USD files and assets |
| `--entry` | Yes | Entry USD file (relative to root) |
| `--out` | Yes | Output PNG path |
| `--width` | No | Image width (default: 1024) |
| `--height` | No | Image height (default: 1024) |
| `--viewer-dist` | No | Path to built viewer dist |

### Programmatic API

```typescript
import { renderUsdToPng } from '@cinevva/usdjs-renderer';

const pngBuffer = await renderUsdToPng({
    root: '/path/to/assets',
    entry: 'scene.usda',
    width: 1024,
    height: 1024,
});

fs.writeFileSync('output.png', pngBuffer);
```

---

## Camera Control

The renderer reads camera settings from the USD layer's `customLayerData`:

```usda
#usda 1.0
(
    customLayerData = {
        dictionary cameraSettings = {
            float3 target = (0, 0, 0)
            float distance = 5.0
            float2 angles = (30, 45)  # pitch, yaw in degrees
        }
        dictionary renderSettings = {
            int width = 1920
            int height = 1080
        }
    }
)
```

If no camera settings are present, the renderer uses auto-framing based on scene bounds.

---

## Batch Rendering

### Generate Gallery

The included `generate-ftlab-gallery.ts` script renders multiple samples and creates an HTML gallery:

```bash
npx ts-node src/generate-ftlab-gallery.ts
```

### Compare Samples

For regression testing, use `compare-ftlab-samples.ts`:

```bash
npx ts-node src/compare-ftlab-samples.ts
```

---

## How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                        Node.js Process                       │
├─────────────────────────────────────────────────────────────┤
│  1. Start local HTTP server                                  │
│     - Serves USD assets from --root                          │
│     - Serves viewer from --viewer-dist                       │
│                                                              │
│  2. Launch headless Chromium via Playwright                  │
│     - Navigate to viewer URL                                 │
│     - Wait for scene to load                                 │
│                                                              │
│  3. Screenshot WebGL canvas                                  │
│     - Uses Playwright's screenshot API                       │
│     - Returns PNG buffer                                     │
│                                                              │
│  4. Cleanup                                                  │
│     - Close browser                                          │
│     - Stop server                                            │
└─────────────────────────────────────────────────────────────┘
```

---

## Configuration

### Environment Variables

| Variable | Purpose |
|----------|---------|
| `VIEWER_DIST` | Default path to viewer dist |
| `USDJS_ROOT` | Path to core repo (for corpus tests) |

### Viewer Requirements

The renderer needs a built copy of `@cinevva/usdjs-viewer`:

```bash
cd ../cinevva-usdjs-viewer
npm run build
```

Then either:
- Pass `--viewer-dist ../cinevva-usdjs-viewer/dist`
- Or set `VIEWER_DIST` environment variable

---

## Troubleshooting

### "Cannot find viewer dist"

Build the viewer first:

```bash
cd /path/to/cinevva-usdjs-viewer
npm install
npm run build
```

### Blank or black images

1. Check that the USD file loads in the browser viewer
2. Verify asset paths are relative and exist under `--root`
3. Add `--debug` flag to keep the browser open for inspection

### Timeout errors

Large scenes may need longer timeouts:

```typescript
await renderUsdToPng({
    // ...
    timeout: 60000, // 60 seconds
});
```

---

## Project Structure

```
src/
├── render-usda-to-png.ts      # Main render script
├── compare-ftlab-samples.ts   # Regression comparison
├── generate-ftlab-gallery.ts  # Gallery generator
├── viewerDist.ts              # Viewer path resolution
└── usdjsRoot.ts               # Core repo path resolution
```

---

## Related Packages

| Package | Purpose |
|---------|---------|
| **@cinevva/usdjs** | Core parsing and composition |
| **@cinevva/usdjs-viewer** | Browser-based viewer (what we render) |

---

## License

MIT. See [LICENSE](./LICENSE).
