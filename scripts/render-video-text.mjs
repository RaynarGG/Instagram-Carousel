#!/usr/bin/env node
// Text-Bild fuers Video (1080x1920): Hook gross, darunter der Fliesstext, oben Platz fuers Video.
// Der Nutzer legt sein Video in der App dahinter/darueber und schneidet selbst.
//
//   node scripts/render-video-text.mjs --spec videos/<post>/text.json [--out videos/<post>]
//
// Spec: { "de": { "hook": "...", "body": "..." }, "en": { ... } }
//   Syntax wie bei den Headlines: [Klammern] = Akzentfarbe, jede Zeile = ein Umbruch,
//   eine leere Zeile im body = Absatz. [Klammern] duerfen nicht ueber einen Umbruch gehen.
//   Zeilenlaenge steuert die Schriftgroesse (Breite): hook ~35-40 Zeichen, body ~52-57.
//   Optional pro Sprache: "hookSize" (Default 56), "bodySize" (Default 43), "leading" (Default 1.12).
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import { render } from './typo/render-headline.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const specPath = arg('--spec');
if (!specPath) { console.error('Aufruf: node scripts/render-video-text.mjs --spec videos/<post>/text.json [--out dir]'); process.exit(1); }
const outDir = arg('--out', path.dirname(specPath));
const spec = JSON.parse(await fs.readFile(specPath, 'utf8'));
const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'video-text-'));

const base = { preset: 'wsd-orange', mode: 'text', kicker: '', width: 1080, padding: 0.045, align: 'left', gapEm: 0.6 };
const langs = Object.keys(spec).filter(k => spec[k]?.hook);
const jobs = langs.flatMap(l => [
  { ...base, headline: spec[l].hook, maxFontSize: spec[l].hookSize ?? 56, leading: 1.08, out: `hook-${l}.png` },
  { ...base, headline: spec[l].body, maxFontSize: spec[l].bodySize ?? 43, leading: spec[l].leading ?? 1.12, out: `body-${l}.png` },
]);
await render(jobs, tmp);

const CHROME = process.env.CHROME_PATH;
const browser = await chromium.launch(CHROME ? { executablePath: CHROME } : {});
await fs.mkdir(outDir, { recursive: true });
for (const l of langs) {
  const p = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  const h = (await fs.readFile(path.join(tmp, `hook-${l}.png`))).toString('base64');
  const b = (await fs.readFile(path.join(tmp, `body-${l}.png`))).toString('base64');
  await p.setContent(`<body style="margin:0;background:#1F1D1B;width:1080px;height:1920px;overflow:hidden;position:relative">
    <img id=h src="data:image/png;base64,${h}" style="position:absolute;left:0;width:1080px">
    <img id=t src="data:image/png;base64,${b}" style="position:absolute;left:0;width:1080px"></body>`);
  const r = await p.evaluate(async () => {
    const H = document.getElementById('h'), T = document.getElementById('t');
    await Promise.all([H.decode(), T.decode()]);
    const top = Math.round(1920 * 0.362);           // Text beginnt bei ~38 %, darueber Platz fuers Video
    H.style.top = top + 'px'; T.style.top = (top + H.naturalHeight + 4) + 'px';
    return (top + H.naturalHeight + 4 + T.naturalHeight) / 1920;
  });
  const out = path.join(outDir, `text-${l}.png`);
  await p.screenshot({ path: out });
  console.log(`${out}  ·  Textende bei ${(r * 100).toFixed(0)} % der Hoehe${r > 0.86 ? '  ⚠ zu tief, Text kuerzen' : ''}`);
}
await browser.close();
await fs.rm(tmp, { recursive: true, force: true });
