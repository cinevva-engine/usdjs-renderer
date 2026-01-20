import fs from 'node:fs';
import path from 'node:path';

export function resolveViewerDistDir(opts: { viewerDistArg: string | null }): string {
  const candidates = [
    opts.viewerDistArg,
    process.env.USDJS_VIEWER_DIST,
    // Common layouts:
    path.resolve(process.cwd(), 'packages/usdjs-viewer/dist'),
    path.resolve(process.cwd(), '../cinevva-usdjs-viewer/dist'),
    path.resolve(process.cwd(), '../usdjs-viewer/dist'),
  ].filter((x): x is string => typeof x === 'string' && x.length > 0);

  for (const distDir of candidates) {
    const indexAbs = path.join(distDir, 'index.html');
    if (fs.existsSync(indexAbs) && fs.statSync(indexAbs).isFile()) {
      return distDir;
    }
  }

  const hint =
    'Could not locate usdjs-viewer dist.\n' +
    'Provide one of:\n' +
    '- --viewer-dist /abs/path/to/usdjs-viewer/dist\n' +
    '- USDJS_VIEWER_DIST=/abs/path/to/usdjs-viewer/dist\n' +
    'Searched common defaults relative to process.cwd().';
  throw new Error(hint);
}

