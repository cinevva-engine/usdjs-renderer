import fs from 'node:fs';
import path from 'node:path';
import { resolveViewerDistDir } from './viewerDist.js';
import { resolveUsdjsRoot } from './usdjsRoot.js';

type Mapping = {
  sampleRel: string; // e.g. samples/light/spot_light.usda
  refImageRel: string; // e.g. samples/light/images/spot_light.jpg
};

type Args = {
  // Root of the @cinevva/usdjs repo (where test/corpus/... lives)
  usdjsRoot: string | null;
  // Relative path under sample root to the entry usd(a) file
  sampleRel: string | null;
  // Render size
  width: number;
  height: number;
  // Whether to compose
  compose: boolean;
  // Built viewer dist (index.html + assets/)
  viewerDist: string | null;
};

function parseArgs(argv: string[]): Args {
  const get = (k: string) => {
    const i = argv.indexOf(k);
    if (i < 0) return null;
    return argv[i + 1] ?? null;
  };
  const has = (k: string) => argv.includes(k);

  const usdjsRoot = get('--usdjs-root');
  const sampleRel = get('--sample') ?? null;
  const width = Number(get('--width') ?? 1024);
  const height = Number(get('--height') ?? 1024);
  const compose = has('--no-compose') ? false : true;
  const viewerDist = get('--viewer-dist');

  if (!Number.isFinite(width) || width <= 0) throw new Error(`Invalid --width ${width}`);
  if (!Number.isFinite(height) || height <= 0) throw new Error(`Invalid --height ${height}`);

  return { usdjsRoot, sampleRel, width, height, compose, viewerDist };
}

function extractMappingsFromReadme(readmeMd: string): Mapping[] {
  const out: Mapping[] = [];
  const lines = readmeMd.split(/\r?\n/g);

  for (const line of lines) {
    // Typical row:
    // |[spot_light.usda](samples/light/spot_light.usda)|-|...![spot_light](samples/light/images/spot_light.jpg)|
    const fileMatch = line.match(/\|\s*\[[^\]]+\]\((samples\/[^)]+?\.(?:usda|usd|usdc|usdz))\)\s*\|/i);
    if (!fileMatch) continue;

    const imgMatch = line.match(/!\[[^\]]*]\((samples\/[^)]+?\.(?:png|jpg|jpeg|webp|gif))\)/i);
    if (!imgMatch) continue;

    out.push({ sampleRel: fileMatch[1]!, refImageRel: imgMatch[1]! });
  }

  // de-dupe
  const seen = new Set<string>();
  return out.filter((m) => {
    const k = `${m.sampleRel}::${m.refImageRel}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function mimeForExt(extOrPath: string): string {
  const e = extOrPath.startsWith('.') ? extOrPath.toLowerCase() : path.extname(extOrPath).toLowerCase();
  if (e === '.html') return 'text/html; charset=utf-8';
  if (e === '.js') return 'text/javascript; charset=utf-8';
  if (e === '.css') return 'text/css; charset=utf-8';
  if (e === '.json') return 'application/json; charset=utf-8';
  if (e === '.png') return 'image/png';
  if (e === '.jpg' || e === '.jpeg') return 'image/jpeg';
  if (e === '.webp') return 'image/webp';
  if (e === '.gif') return 'image/gif';
  if (e === '.svg') return 'image/svg+xml';
  // MaterialX files
  if (e === '.mtlx') return 'application/xml; charset=utf-8';
  if (e === '.usda' || e === '.usd' || e === '.usdc' || e === '.usdz' || e === '.txt') return 'text/plain; charset=utf-8';
  if (e === '.exr' || e === '.hdr') return 'application/octet-stream';
  return 'application/octet-stream';
}

function safeResolveUnderRoot(rootAbs: string, rel: string): string | null {
  const relFs = rel.replaceAll('\\', '/');
  const abs = path.resolve(rootAbs, relFs);
  const normRoot = path.normalize(rootAbs + path.sep);
  const normAbs = path.normalize(abs);
  if (!normAbs.startsWith(normRoot)) return null;
  return abs;
}

function readAllTextUsdFiles(rootAbs: string): Array<{ path: string; text: string }> {
  const out: Array<{ path: string; text: string }> = [];

  const walk = (dirAbs: string, relPrefix: string) => {
    for (const ent of fs.readdirSync(dirAbs, { withFileTypes: true })) {
      const rel = relPrefix ? `${relPrefix}/${ent.name}` : ent.name;
      const abs = path.join(dirAbs, ent.name);
      if (ent.isDirectory()) {
        walk(abs, rel);
        continue;
      }
      const ext = path.extname(ent.name).toLowerCase();
      if (ext === '.usda' || ext === '.usd' || ext === '.txt') {
        out.push({ path: rel, text: fs.readFileSync(abs, 'utf8') });
      }
    }
  };

  walk(rootAbs, '');
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const usdjsRootAbs = resolveUsdjsRoot({ usdjsRootArg: args.usdjsRoot });

  const sampleRootAbs = path.join(usdjsRootAbs, 'test/corpus/external/ft-lab-sample-usd/sample_usd-main');
  const readmeAbs = path.join(sampleRootAbs, 'readme.md');
  if (!fs.existsSync(readmeAbs)) throw new Error(`Missing sample_usd readme: ${readmeAbs}`);

  const readme = fs.readFileSync(readmeAbs, 'utf8');
  const mappings = extractMappingsFromReadme(readme);
  if (!mappings.length) throw new Error('No mappings found in readme.md');

  const filtered = args.sampleRel ? mappings.filter((m) => m.sampleRel === args.sampleRel) : mappings;

  // Dynamic import so users without Playwright can still work on repo.
  let chromium: any;
  try {
    ({ chromium } = await import('playwright'));
  } catch (e) {
    const msg =
      'Playwright is not installed.\n' +
      'Install it (dev) and Chromium:\n' +
      '  npm i -D playwright\n' +
      '  npx playwright install chromium\n' +
      `Original error: ${String((e as any)?.message ?? e)}`;
    throw new Error(msg);
  }

  const viewerDistDir = resolveViewerDistDir({ viewerDistArg: args.viewerDist });
  const viewerIndexAbs = path.join(viewerDistDir, 'index.html');
  if (!fs.existsSync(viewerIndexAbs)) throw new Error(`Missing viewer index: ${viewerIndexAbs}`);
  const indexHtml = fs.readFileSync(viewerIndexAbs, 'utf8');

  // Text layers for the whole sample root (lets us set entryKey to a relative sample path)
  const textFiles = readAllTextUsdFiles(sampleRootAbs);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: args.width, height: args.height } });

  const base = 'http://usdjs.local';

  // Route on the *context* so it applies to every new page (we open a clean tab per sample).
  await context.route('**/*', async (route: any, request: any) => {
    try {
      const url = new URL(request.url());
      if (url.origin !== base) return route.fallback();

      const pathname = url.pathname;
      if (pathname === '/' || pathname === '/index.html') {
        return route.fulfill({
          status: 200,
          headers: { 'content-type': 'text/html; charset=utf-8' },
          body: indexHtml,
        });
      }

      if (pathname.startsWith('/assets/')) {
        const rel = pathname.replace(/^\/assets\//, '');
        const abs = path.join(viewerDistDir, 'assets', rel);
        if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
          return route.fulfill({ status: 404, body: `asset not found: ${pathname}` });
        }
        const buf = fs.readFileSync(abs);
        return route.fulfill({
          status: 200,
          headers: { 'content-type': mimeForExt(abs) },
          body: buf,
        });
      }

      if (pathname === '/__usdjs_corpus') {
        const rel = url.searchParams.get('file');
        if (!rel) return route.fulfill({ status: 400, body: 'missing ?file=' });

        // Map requests to the sample root (not usdjs root) so references like "samples/..." resolve.
        const abs = safeResolveUnderRoot(sampleRootAbs, rel);
        if (!abs) return route.fulfill({ status: 403, body: `forbidden: ${rel}` });
        if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) return route.fulfill({ status: 404, body: `not found: ${rel}` });

        const ext = path.extname(abs).toLowerCase();
        if (ext === '.mtlx') {
          const text = fs.readFileSync(abs, 'utf8');
          return route.fulfill({ status: 200, headers: { 'content-type': 'application/xml; charset=utf-8' }, body: text });
        }
        const isText = ext === '.usda' || ext === '.usd' || ext === '.usdc' || ext === '.usdz' || ext === '.txt' || ext === '.json';
        if (isText) {
          const text = fs.readFileSync(abs, 'utf8');
          return route.fulfill({ status: 200, headers: { 'content-type': 'text/plain; charset=utf-8' }, body: text });
        }

        const buf = fs.readFileSync(abs);
        return route.fulfill({ status: 200, headers: { 'content-type': mimeForExt(abs) }, body: buf });
      }

      return route.fulfill({ status: 404, body: `not found: ${pathname}` });
    } catch (e) {
      return route.fulfill({ status: 500, body: String((e as any)?.message ?? e) });
    }
  });

  let ok = 0;
  let skipped = 0;
  const failures: Array<{ sampleRel: string; error: string }> = [];

  for (const m of filtered) {
    const entryKey = m.sampleRel; // relative to sampleRootAbs (matches loadTextFiles paths)
    const sampleAbs = path.join(sampleRootAbs, m.sampleRel);
    const refAbs = path.join(sampleRootAbs, m.refImageRel);
    if (!fs.existsSync(sampleAbs)) {
      skipped++;
      failures.push({ sampleRel: m.sampleRel, error: `missing sample file: ${sampleAbs}` });
      continue;
    }
    if (!fs.existsSync(refAbs)) {
      skipped++;
      failures.push({ sampleRel: m.sampleRel, error: `missing reference image: ${refAbs}` });
      continue;
    }

    const ext = path.extname(sampleAbs).toLowerCase();
    const isTextLayer = ext === '.usda' || ext === '.usd' || ext === '.txt';
    if (!isTextLayer) {
      skipped++;
      process.stdout.write(`SKIP (unsupported ${ext}): ${m.sampleRel}\n`);
      continue;
    }

    const imagesDirAbs = path.dirname(refAbs);
    const baseName = path.basename(m.sampleRel).replace(/\.(usda|usd|usdc|usdz)$/i, '');
    const cinevvaOutAbs = path.join(imagesDirAbs, `${baseName}__cinevva.png`);

    try {
      const page = await context.newPage();
      await page.goto(`${base}/index.html?headless=1`, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => typeof (globalThis as any).__usdjsRender === 'function');

      await page.evaluate(async ({ textFiles }: { textFiles: Array<{ path: string; text: string }> }) => {
        const core = (globalThis as any).__usdjsViewerCore;
        if (!core) throw new Error('usdjs viewer core not initialized');
        core.loadTextFiles(textFiles);
        return true;
      }, { textFiles });

      const canvas = page.locator('[data-testid="usdjs-canvas"]');
      await canvas.waitFor({ state: 'visible', timeout: 10_000 });

      await page.evaluate(
        async ({ entryPath, compose }: { entryPath: string; compose: boolean }) => {
          await (globalThis as any).__usdjsRender({ entryPath, compose });
          return true;
        },
        { entryPath: entryKey, compose: args.compose },
      );
      await page.waitForLoadState('networkidle').catch(() => {});
      await page.waitForTimeout(100);
      await canvas.screenshot({ path: cinevvaOutAbs, type: 'png' });
      await page.close();

      ok++;
      process.stdout.write(`OK ${ok}/${filtered.length}: ${m.sampleRel}\n`);
    } catch (e) {
      failures.push({ sampleRel: m.sampleRel, error: String((e as any)?.message ?? e) });
    }
  }

  await context.close();
  await browser.close();

  if (skipped) process.stdout.write(`Skipped: ${skipped}\n`);
  if (failures.length) {
    process.stdout.write(`Failures: ${failures.length}\n`);
    for (const f of failures.slice(0, 50)) process.stdout.write(`- ${f.sampleRel}: ${f.error}\n`);
    if (failures.length > 50) process.stdout.write(`...and ${failures.length - 50} more\n`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

