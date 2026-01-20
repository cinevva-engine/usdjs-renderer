# Programmatic API

## Basic Usage

```typescript
import { renderUsdToPng } from '@cinevva/usdjs-renderer';
import { writeFileSync } from 'node:fs';

const pngBuffer = await renderUsdToPng({
    root: '/path/to/assets',
    entry: 'scene.usda',
    width: 1024,
    height: 1024,
});

writeFileSync('output.png', pngBuffer);
```

## Options

```typescript
interface RenderOptions {
    /** Directory containing USD files and assets */
    root: string;
    
    /** Entry USD file (relative to root) */
    entry: string;
    
    /** Image width (default: 1024) */
    width?: number;
    
    /** Image height (default: 1024) */
    height?: number;
    
    /** Path to built viewer dist */
    viewerDist?: string;
    
    /** Timeout in milliseconds (default: 30000) */
    timeout?: number;
}
```

## With Timeout

```typescript
const pngBuffer = await renderUsdToPng({
    root: '/path/to/assets',
    entry: 'large-scene.usda',
    timeout: 60000, // 60 seconds for large scenes
});
```

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

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `VIEWER_DIST` | Default path to viewer dist |
| `USDJS_ROOT` | Path to core repo (for corpus tests) |
