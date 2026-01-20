# CLI Usage

## Basic Command

```bash
usdjs-render-png \
    --root /path/to/asset/directory \
    --entry scene.usda \
    --out output.png \
    --width 1024 \
    --height 1024
```

## Options

| Option | Required | Description |
|--------|----------|-------------|
| `--root` | Yes | Directory containing USD files and assets |
| `--entry` | Yes | Entry USD file (relative to root) |
| `--out` | Yes | Output PNG path |
| `--width` | No | Image width (default: 1024) |
| `--height` | No | Image height (default: 1024) |
| `--viewer-dist` | No | Path to built viewer dist |

## With Custom Viewer

```bash
usdjs-render-png \
    --viewer-dist /path/to/usdjs-viewer/dist \
    --root /path/to/assets \
    --entry model.usdz \
    --out render.png
```

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

If no camera settings are present, the renderer uses auto-framing.

## Batch Scripts

### Generate Gallery

```bash
npx ts-node src/generate-ftlab-gallery.ts
```

### Compare Samples

```bash
npx ts-node src/compare-ftlab-samples.ts
```
