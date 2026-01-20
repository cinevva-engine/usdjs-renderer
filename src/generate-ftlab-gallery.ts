import fs from 'node:fs';
import path from 'node:path';
import { resolveUsdjsRoot } from './usdjsRoot.js';

type Args = {
  usdjsRoot: string | null;
  out: string | null;
  onlyWithCompare: boolean;
};

type Entry = {
  sampleRel: string; // samples/.../<name>.usda
  imagesDirRel: string; // samples/.../images
  refRel: string; // samples/.../images/<name>.jpg|png...
  cinevvaRel: string; // samples/.../images/<name>__cinevva.png
};

function parseArgs(argv: string[]): Args {
  const get = (k: string) => {
    const i = argv.indexOf(k);
    if (i < 0) return null;
    return argv[i + 1] ?? null;
  };
  const has = (k: string) => argv.includes(k);

  const usdjsRoot = get('--usdjs-root');
  const out = get('--out');
  const onlyWithCompare = !has('--include-missing');
  return { usdjsRoot, out, onlyWithCompare };
}

function htmlEscape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fileExists(abs: string): boolean {
  try {
    return fs.existsSync(abs) && fs.statSync(abs).isFile();
  } catch {
    return false;
  }
}

function findEntries(sampleRootAbs: string): Entry[] {
  const entries: Entry[] = [];

  const walk = (dirAbs: string) => {
    for (const ent of fs.readdirSync(dirAbs, { withFileTypes: true })) {
      const abs = path.join(dirAbs, ent.name);
      if (ent.isDirectory()) {
        walk(abs);
        continue;
      }
      if (!ent.isFile()) continue;
      if (!ent.name.endsWith('__cinevva.png')) continue;

      const imagesDirAbs = path.dirname(abs);
      const baseName = ent.name.replace(/__cinevva\.png$/i, '');
      const relFromSampleRoot = path.relative(sampleRootAbs, imagesDirAbs).replaceAll(path.sep, '/');

      const imagesDirRel = relFromSampleRoot; // samples/.../images
      const sampleRel = imagesDirRel.replace(/\/images$/i, '') + `/${baseName}.usda`;
      const cinevvaRel = `${imagesDirRel}/${baseName}__cinevva.png`;

      // Best-effort ref image: prefer same base name with common extensions.
      const candidates = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].map((ext) => `${imagesDirRel}/${baseName}${ext}`);
      const refRel = candidates.find((r) => fileExists(path.join(sampleRootAbs, r.replaceAll('/', path.sep)))) ?? candidates[0]!;

      entries.push({ sampleRel, imagesDirRel, refRel, cinevvaRel });
    }
  };

  walk(path.join(sampleRootAbs, 'samples'));

  // Stable ordering by sample path
  entries.sort((a, b) => a.sampleRel.localeCompare(b.sampleRel));
  return entries;
}

function buildHtml(sampleRootAbs: string, entries: Entry[]): string {
  const rows = entries
    .map((e) => {
      const sampleAbs = path.join(sampleRootAbs, e.sampleRel.replaceAll('/', path.sep));
      const refAbs = path.join(sampleRootAbs, e.refRel.replaceAll('/', path.sep));
      const cinevvaAbs = path.join(sampleRootAbs, e.cinevvaRel.replaceAll('/', path.sep));

      const sampleOk = fileExists(sampleAbs);
      const refOk = fileExists(refAbs);
      const cinevvaOk = fileExists(cinevvaAbs);

      return `
  <article class="card" data-sample="${htmlEscape(e.sampleRel)}" data-status="${cinevvaOk ? 'ok' : 'missing'}">
    <header class="card__header">
      <div class="title">${htmlEscape(e.sampleRel)}</div>
      <div class="meta">
        <a href="${encodeURI(e.sampleRel)}" class="${sampleOk ? '' : 'bad'}" target="_blank" rel="noreferrer">sample</a>
        <a href="${encodeURI(e.refRel)}" class="${refOk ? '' : 'bad'}" target="_blank" rel="noreferrer">ref</a>
        <a href="${encodeURI(e.cinevvaRel)}" class="${cinevvaOk ? '' : 'bad'}" target="_blank" rel="noreferrer">cinevva</a>
      </div>
    </header>
    <div class="grid">
      <figure>
        <figcaption>ref</figcaption>
        ${refOk ? `<img loading="lazy" src="${encodeURI(e.refRel)}" />` : `<div class="placeholder">missing</div>`}
      </figure>
      <figure>
        <figcaption>cinevva</figcaption>
        ${cinevvaOk ? `<img loading="lazy" src="${encodeURI(e.cinevvaRel)}" />` : `<div class="placeholder">missing</div>`}
      </figure>
    </div>
  </article>`;
    })
    .join('\n');

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>cinevva vs ft-lab/sample_usd gallery</title>
  <style>
    :root {
      --bg: #0b0d12;
      --panel: #131826;
      --muted: #9aa3b2;
      --text: #e7ecf5;
      --bad: #ff6b6b;
      --ok: #3ddc97;
      --border: rgba(255,255,255,0.09);
    }
    html, body { height: 100%; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font: 14px/1.4 -apple-system, system-ui, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
    }
    header.top {
      position: sticky;
      top: 0;
      z-index: 10;
      background: rgba(11,13,18,0.92);
      backdrop-filter: blur(10px);
      border-bottom: 1px solid var(--border);
    }
    .wrap { max-width: 1400px; margin: 0 auto; padding: 14px 16px; }
    .titlebar { display:flex; align-items: baseline; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
    .titlebar h1 { margin: 0; font-size: 16px; font-weight: 700; letter-spacing: 0.2px; }
    .hint { color: var(--muted); font-size: 12px; }
    .controls { display:flex; gap: 10px; align-items:center; flex-wrap: wrap; margin-top: 10px; }
    input[type="search"] {
      flex: 1;
      min-width: 260px;
      background: var(--panel);
      color: var(--text);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 10px 12px;
      outline: none;
    }
    label.chk { display:flex; gap: 8px; align-items:center; color: var(--muted); font-size: 12px; }
    .stats { color: var(--muted); font-size: 12px; }
    main { padding: 18px 0 40px; }
    .cards { display:flex; flex-direction:column; gap: 14px; }
    .card {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 14px;
      overflow: hidden;
    }
    .card__header {
      display:flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 12px;
      padding: 12px 14px;
      border-bottom: 1px solid var(--border);
      flex-wrap: wrap;
    }
    .card__header .title { font-weight: 600; font-size: 13px; color: #dbe4f7; }
    .meta { display:flex; gap: 10px; flex-wrap: wrap; }
    .meta a {
      color: #c7d4ff;
      text-decoration: none;
      border-bottom: 1px dotted rgba(199,212,255,0.4);
      font-size: 12px;
    }
    .meta a.bad { color: var(--bad); border-bottom-color: rgba(255,107,107,0.6); }
    .grid {
      display:grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      padding: 12px;
    }
    figure { margin: 0; background: rgba(0,0,0,0.25); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
    figcaption { padding: 8px 10px; font-size: 12px; color: var(--muted); border-bottom: 1px solid var(--border); background: rgba(0,0,0,0.18); }
    img { display:block; width:100%; height:auto; background:#111; }
    .placeholder { padding: 24px 10px; text-align:center; color: var(--bad); }
    .hidden { display: none !important; }
    @media (max-width: 980px) {
      .grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <header class="top">
    <div class="wrap">
      <div class="titlebar">
        <h1>cinevva vs ft-lab/sample_usd — gallery</h1>
        <div class="hint">Open this file from the corpus checkout. Links and images are relative to the local \"sample_usd-main/\" directory.</div>
      </div>
      <div class="controls">
        <input id="q" type="search" placeholder="Filter by path (e.g. light/spot, Material/UsdPreviewSurface, ...)" />
        <label class="chk">
          <input id="onlyOk" type="checkbox" />
          only entries with cinevva render
        </label>
        <div class="stats" id="stats"></div>
      </div>
    </div>
  </header>

  <main>
    <div class="wrap">
      <section class="cards" id="cards">
${rows}
      </section>
    </div>
  </main>

  <script>
    const q = document.getElementById('q');
    const onlyOk = document.getElementById('onlyOk');
    const cards = Array.from(document.querySelectorAll('.card'));
    const stats = document.getElementById('stats');

    function apply() {
      const needle = (q.value || '').toLowerCase().trim();
      const okOnly = !!onlyOk.checked;
      let visible = 0;

      for (const c of cards) {
        const s = (c.getAttribute('data-sample') || '').toLowerCase();
        const status = c.getAttribute('data-status') || '';
        const match = !needle || s.includes(needle);
        const ok = !okOnly || status === 'ok';
        const show = match && ok;
        c.classList.toggle('hidden', !show);
        if (show) visible++;
      }
      stats.textContent = visible + ' / ' + cards.length + ' shown';
    }

    q.addEventListener('input', apply);
    onlyOk.addEventListener('change', apply);
    apply();
  </script>
</body>
</html>`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const usdjsRootAbs = resolveUsdjsRoot({ usdjsRootArg: args.usdjsRoot });
  const sampleRootAbs = path.join(usdjsRootAbs, 'test/corpus/external/ft-lab-sample-usd/sample_usd-main');
  if (!fs.existsSync(sampleRootAbs)) throw new Error(`Missing sample root: ${sampleRootAbs}`);

  const all = findEntries(sampleRootAbs);
  const entries = args.onlyWithCompare ? all : all;
  const html = buildHtml(sampleRootAbs, entries);

  const outAbs = args.out ? path.resolve(args.out) : path.join(sampleRootAbs, 'gallery.html');
  fs.writeFileSync(outAbs, html, 'utf8');
  process.stdout.write(`Wrote: ${outAbs}\n`);
  process.stdout.write(`Entries: ${entries.length}\n`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

