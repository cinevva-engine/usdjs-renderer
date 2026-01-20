import fs from 'node:fs';
import path from 'node:path';
import { resolveViewerDistDir } from './viewerDist.js';

type Args = {
  rootDir: string;
  entryPath: string;
  outPng: string;
  width: number;
  height: number;
  compose: boolean;
  viewerDist: string | null;
};

function parseArgs(argv: string[]): Args {
  const get = (k: string) => {
    const i = argv.indexOf(k);
    if (i < 0) return null;
    return argv[i + 1] ?? null;
  };
  const has = (k: string) => argv.includes(k);

  const rootDir = get('--root') ?? process.cwd();
  const entryPath = get('--entry') ?? 'scene.usda';
  const outPng = get('--out') ?? 'out.png';
  const width = Number(get('--width') ?? 1024);
  const height = Number(get('--height') ?? 1024);
  const compose = has('--no-compose') ? false : true;
  const viewerDist = get('--viewer-dist');

  if (!Number.isFinite(width) || width <= 0) throw new Error(`Invalid --width ${width}`);
  if (!Number.isFinite(height) || height <= 0) throw new Error(`Invalid --height ${height}`);

  return { rootDir, entryPath, outPng, width, height, compose, viewerDist };
}

function safeResolveUnderRoot(rootAbs: string, rel: string): string | null {
  // Normalize `rel` as URL-like path (USD uses forward slashes), but still prevent traversal.
  const relFs = rel.replaceAll('\\', '/');
  const abs = path.resolve(rootAbs, relFs);
  const normRoot = path.normalize(rootAbs + path.sep);
  const normAbs = path.normalize(abs);
  if (!normAbs.startsWith(normRoot)) return null;
  return abs;
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
  // USD/text
  if (e === '.usda' || e === '.usd' || e === '.usdc' || e === '.usdz' || e === '.txt') return 'text/plain; charset=utf-8';
  return 'application/octet-stream';
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
      // Note: the headless entrypoint supports providing textFiles for USDA composition.
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
  const rootAbs = path.resolve(args.rootDir);

  const entryAbs = safeResolveUnderRoot(rootAbs, args.entryPath);
  if (!entryAbs) throw new Error(`Entry path escapes root: entry=${args.entryPath} root=${rootAbs}`);
  if (!fs.existsSync(entryAbs) || !fs.statSync(entryAbs).isFile()) throw new Error(`Entry not found: ${entryAbs}`);

  // Dynamic import so repo can work without Playwright installed unless user needs rendering.
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
  const indexHtml = fs.readFileSync(viewerIndexAbs, 'utf8');

  const textFiles = readAllTextUsdFiles(rootAbs);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: args.width, height: args.height } });
  const page = await context.newPage();

  const base = 'http://usdjs.local';

  await page.route('**/*', async (route: any, request: any) => {
    try {
      const url = new URL(request.url());
      if (url.origin !== base) return route.fallback();

      const pathname = url.pathname;

      // Viewer app (built)
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

      // USD assets for this render job (textures / sublayers / etc.)
      if (pathname === '/__usdjs_corpus') {
        const rel = url.searchParams.get('file');
        if (!rel) return route.fulfill({ status: 400, body: 'missing ?file=' });

        const abs = safeResolveUnderRoot(rootAbs, rel);
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

  await page.goto(`${base}/index.html?headless=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof (window as any).__usdjsRender === 'function');

  await page.evaluate(
    async ({ entryPath, textFiles, compose }: { entryPath: string; textFiles: Array<{ path: string; text: string }>; compose: boolean }) => {
      await (window as any).__usdjsRender({ entryPath, textFiles, compose });
    },
    { entryPath: args.entryPath, textFiles, compose: args.compose },
  );

  // Give async texture loads a chance; in many cases this becomes idle quickly.
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(100);

  const canvas = page.locator('[data-testid="usdjs-canvas"]');
  await canvas.waitFor({ state: 'visible', timeout: 10_000 });
  await canvas.screenshot({ path: path.resolve(args.outPng), type: 'png' });

  await context.close();
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

