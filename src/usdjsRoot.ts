import fs from 'node:fs';
import path from 'node:path';

export function resolveUsdjsRoot(opts: { usdjsRootArg: string | null }): string {
  const candidates = [
    opts.usdjsRootArg,
    process.env.USDJS_ROOT,
    // Common layouts:
    path.resolve(process.cwd(), 'packages/usdjs'),
    path.resolve(process.cwd(), '../cinevva-usdjs'),
    path.resolve(process.cwd(), '../usdjs'),
  ].filter((x): x is string => typeof x === 'string' && x.length > 0);

  for (const abs of candidates) {
    try {
      if (!fs.existsSync(abs)) continue;
      if (!fs.existsSync(path.join(abs, 'package.json'))) continue;
      if (!fs.existsSync(path.join(abs, 'test', 'corpus'))) continue;
      return abs;
    } catch {
      // ignore
    }
  }

  const hint =
    'Could not locate the @cinevva/usdjs repo root (needed for corpus-based scripts).\n' +
    'Provide one of:\n' +
    '- --usdjs-root /abs/path/to/cinevva-usdjs\n' +
    '- USDJS_ROOT=/abs/path/to/cinevva-usdjs\n' +
    'Searched common defaults relative to process.cwd().';
  throw new Error(hint);
}

