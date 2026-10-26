#!/usr/bin/env node
// WSD Typo-Engine — Headline-Grafiken im @technology-Look
//
//   node render.mjs job.json                 # eine oder mehrere Grafiken aus einer Spec-Datei
//   node render.mjs --demo                   # Beispiele in ./out
//
// Alles Sichtbare wird von presets.json gesteuert. Diese Datei enthaelt keine Farbwerte.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PRESETS = JSON.parse(await fs.readFile(path.join(HERE, 'presets.json'), 'utf8'));

/* ---------------------------------------------------------------- Fonts */

async function fontFace(family, file, weight = 400, style = 'normal') {
  const b64 = (await fs.readFile(path.join(HERE, 'fonts', file))).toString('base64');
  return `@font-face{font-family:"${family}";font-style:${style};font-weight:${weight};` +
         `src:url(data:font/woff2;base64,${b64}) format("woff2");font-display:block}`;
}

const FONTS = (await Promise.all([
  fontFace('Anton', 'anton-latin-400-normal.woff2', 400),
  fontFace('Figtree', 'figtree-latin-400-normal.woff2', 400),
  fontFace('Figtree', 'figtree-latin-700-normal.woff2', 700),
  fontFace('Figtree', 'figtree-latin-800-normal.woff2', 800),
  fontFace('Figtree', 'figtree-latin-400-italic.woff2', 400, 'italic'),
])).join('\n');

/* -------------------------------------------------------------- Textur */
// Zwei uebereinanderliegende Rauschebenen, per background-clip:text in die
// Buchstaben gestanzt:
//   streak  = feine helle Schlieren (stark anisotrop -> horizontale Fasern)
//   cloud   = weiche Helligkeitswolken, damit die Flaeche nicht flach wirkt
// Darunter der Farbverlauf der Akzentfarbe. Das ist der ganze Trick.

function noiseSVG({ size, fx, fy, octaves, seed, gain, bias, opacity = 1 }) {
  gain *= opacity; bias *= opacity;
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'>` +
    `<filter id='n' x='0' y='0' width='100%' height='100%' color-interpolation-filters='sRGB'>` +
    `<feTurbulence type='fractalNoise' baseFrequency='${fx} ${fy}' numOctaves='${octaves}' seed='${seed}' stitchTiles='stitch' result='t'/>` +
    `<feColorMatrix in='t' type='matrix' values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  ${gain} 0 0 0 ${bias}'/>` +
    `</filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`;
  return `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}")`;
}

function accentFill(p) {
  const t = p.texture;
  const streak = noiseSVG({ size: t.streakScale, fx: t.streakFreqX, fy: t.streakFreqY, octaves: t.streakOctaves,
                            seed: t.streakSeed, gain: t.streakGain, bias: t.streakBias, opacity: t.streakOpacity });
  const cloud = noiseSVG({ size: t.cloudScale, fx: t.cloudFreq, fy: t.cloudFreq, octaves: t.cloudOctaves,
                           seed: t.cloudSeed, gain: t.cloudGain, bias: t.cloudBias, opacity: t.cloudOpacity });
  return {
    images: [streak, cloud,
      `linear-gradient(180deg, rgba(255,255,255,${t.sheen}) 0%, rgba(255,255,255,0) 38%)`,
      `linear-gradient(180deg, ${p.accentLight} -55%, ${p.accent} 18%, ${p.accent} 74%, ${p.accentDeep} 150%)`,
    ].join(','),
    sizes: [`${t.streakScale}px ${t.streakScale}px`, `${t.cloudScale}px ${t.cloudScale}px`, '100% 100%', '100% 100%'].join(','),
    // Kein background-blend-mode: Chromium mischt transparente Bereiche dabei gegen
    // Schwarz und die Schrift saeuft ab. Normales Alpha-Compositing ist korrekt.
    blends: 'normal,normal,normal,normal',
  };
}

/* -------------------------------------------------------------- Markup */
// Headline-Syntax:  [WORT] = Akzentfarbe (mit Textur), alles andere = plain.
// Zeilenumbruch:    \n

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function markup(text) {
  return String(text).split('\n').map(line => {
    const html = esc(line).replace(/\[([^\]]*)\]/g, '<i class="a">$1</i>');
    // Zeilen mit Unterlaengen (Komma, Klammer, Q) brauchen etwas Luft, sonst
    // stoesst das Zeichen bei diesem engen Zeilenabstand in die naechste Zeile.
    const desc = /[,;()Q]/.test(line.replace(/[\[\]]/g, '')) ? ' desc' : '';
    return `<div class="ln${desc}">${html}</div>`;
  }).join('');
}

/* ---------------------------------------------------------------- HTML */

const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };

async function embedImage(job, baseDir) {
  if (!job.image || /^(data:|https?:)/.test(job.image)) return job.image || '';
  const abs = path.isAbsolute(job.image) ? job.image : path.resolve(baseDir, job.image);
  const b64 = (await fs.readFile(abs)).toString('base64');
  return `data:${MIME[path.extname(abs).toLowerCase()] || 'image/jpeg'};base64,${b64}`;
}

function buildHTML(job) {
  const p = PRESETS[job.preset];
  if (!p) throw new Error(`Unbekanntes Preset "${job.preset}". Verfuegbar: ${Object.keys(PRESETS).filter(k => k[0] !== '_').join(', ')}`);

  const mode = job.mode || 'slide';
  const W = job.width || 1080;
  const H = job.height || 1350;
  const pad = Math.round(W * (job.padding ?? 0.045));   // ~4% Seitenabstand wie im Original
  const f = accentFill(p);

  const kicker = job.kicker === undefined ? 'TECHNOLOGY' : job.kicker;
  const sub = job.subline || '';
  const micro = job.micro || '';
  const img = job.image ? `<div class="photo"></div>` : '';

  const bg = mode === 'text' ? 'transparent' : p.bg;

  return `<!doctype html><html><head><meta charset="utf-8"><style>
${FONTS}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${W}px;background:${bg};-webkit-font-smoothing:antialiased}
body{${mode === 'text' ? '' : `height:${H}px;`}position:relative;overflow:hidden;font-family:"Figtree",sans-serif}

/* --- Foto oben, nach unten in den Grund verlaufend --- */
.photo{position:absolute;inset:0 0 auto 0;height:${Math.round(H * (job.photoHeight ?? 0.80))}px;
  background:url("${job.image || ''}") center/cover no-repeat;}
/* Das Foto laeuft weich in den Grund aus, damit die Typo IM Bild sitzt statt darauf zu kleben. */
.photo::after{content:"";position:absolute;inset:0;
  background:linear-gradient(180deg, rgba(0,0,0,0) 34%, ${p.bg}CC 74%, ${p.bg} 93%),
             linear-gradient(180deg, rgba(0,0,0,.3) 0%, rgba(0,0,0,0) 20%)}

.stage{position:relative;z-index:2;width:${W}px;${mode === 'text' ? 'padding:' + Math.round(pad * 0.5) + 'px ' + pad + 'px;' : `height:${H}px;padding:0 ${pad}px ${Math.round(H * 0.045)}px;`}
  display:flex;flex-direction:column;justify-content:${mode === 'text' ? 'flex-start' : 'flex-end'};align-items:center;gap:${Math.round(W * 0.022)}px}

/* --- Rubrik mit den beiden duennen Linien --- */
.kick{display:flex;align-items:center;gap:${Math.round(W * 0.018)}px;width:100%;
  margin-bottom:${Math.round(W * 0.006)}px}
.kick span{font-family:"Anton",sans-serif;color:${p.kicker};font-size:${Math.round(W * 0.0235)}px;
  letter-spacing:.22em;line-height:1;white-space:nowrap;text-shadow:0 2px 8px rgba(0,0,0,.6)}
.kick i{flex:1;height:2px;background:${p.rule};display:block}

/* --- Headline --- */
.head{width:100%;font-family:"Anton",sans-serif;text-align:${job.align || 'center'};
  line-height:${job.leading ?? '.95'};letter-spacing:${job.tracking ?? '.004em'};color:${p.plain};
  text-transform:uppercase;font-size:100px;
  /* Schatten als drop-shadow, NICHT als text-shadow: bei background-clip:text
     wuerde der Textschatten ueber der Fuellung liegen und die Schrift absaufen lassen. */
  filter:${p.shadow}}
.ln{white-space:nowrap;display:block}
.ln:empty{height:${job.gapEm ?? 0.5}em}
.ln.desc{padding-bottom:.07em}
.head i.a{font-style:normal;
  background-image:${f.images};
  background-size:${f.sizes};
  background-blend-mode:${f.blends};
  background-position:0 0,0 0,0 0,0 0;
  background-attachment:fixed,fixed,scroll,scroll;
  -webkit-background-clip:text;background-clip:text;
  -webkit-text-fill-color:transparent;color:transparent}

/* --- Subline / Mikrozeile --- */
.sub{width:100%;text-align:center;font-family:"Anton",sans-serif;color:${p.sub};
  text-transform:uppercase;letter-spacing:.03em;line-height:1.1;
  font-size:${Math.round(W * 0.0345)}px;text-shadow:0 2px 10px rgba(0,0,0,.65)}
.micro{width:100%;text-align:center;font-family:"Figtree",sans-serif;font-weight:700;
  color:${p.micro};text-transform:uppercase;letter-spacing:.16em;
  font-size:${Math.round(W * 0.0175)}px;margin-top:${Math.round(W * 0.012)}px}
</style></head><body>
${mode === 'text' ? '' : img}
<div class="stage">
  ${kicker ? `<div class="kick"><i></i><span>${esc(kicker)}</span><i></i></div>` : ''}
  <div class="head" id="head">${markup(job.headline)}</div>
  ${sub ? `<div class="sub">${esc(sub)}</div>` : ''}
  ${micro ? `<div class="micro">${esc(micro)}</div>` : ''}
</div>
</body></html>`;
}

/* ------------------------------------------------------- Auto-Groesse */
// Eine Schriftgroesse fuer alle Zeilen, bestimmt durch die laengste Zeile.
// Genau wie im Original: randnah, aber nie ueber den Rand.

const FIT = ([maxW, maxH, minPx, maxPx]) => {
  const el = document.getElementById('head');
  const lines = [...el.querySelectorAll('.ln')];
  const fits = (px) => {
    el.style.fontSize = px + 'px';
    const wide = Math.max(...lines.map(l => l.scrollWidth));
    return wide <= maxW && (maxH <= 0 || el.scrollHeight <= maxH);
  };
  let lo = minPx, hi = maxPx;
  for (let i = 0; i < 26; i++) {
    const mid = (lo + hi) / 2;
    if (fits(mid)) lo = mid; else hi = mid;
  }
  el.style.fontSize = lo.toFixed(2) + 'px';
  return lo;
};

/* --------------------------------------------------------------- Render */

export async function render(jobs, outDir, baseDir = process.cwd()) {
  await fs.mkdir(outDir, { recursive: true });
  const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
  const results = [];

  for (const job of jobs) {
    const W = job.width || 1080;
    const H = job.height || 1350;
    const mode = job.mode || 'slide';
    const page = await browser.newPage({
      viewport: { width: W, height: mode === 'text' ? 400 : H },
      deviceScaleFactor: job.scale || 1,
    });
    const withImg = { ...job, image: await embedImage(job, baseDir) };
    await page.setContent(buildHTML(withImg), { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);

    const pad = Math.round(W * (job.padding ?? 0.045));
    const maxW = W - 2 * pad;
    const maxH = mode === 'text' ? 0 : Math.round(H * (job.headlineMaxHeight ?? 0.42));
    const size = await page.evaluate(FIT, [maxW, maxH, 20, job.maxFontSize || 240]);

    if (mode === 'text') {
      const h = await page.evaluate(() => document.querySelector('.stage').scrollHeight);
      await page.setViewportSize({ width: W, height: Math.ceil(h) });
    }

    const out = path.join(outDir, job.out || `${job.name || 'headline'}.png`);
    await page.screenshot({ path: out, omitBackground: mode === 'text' });
    await page.close();
    results.push({ out, fontSize: Math.round(size) });
    console.log(`  ${path.basename(out)}  ·  ${job.preset}  ·  ${mode}  ·  ${Math.round(size)}px`);
  }

  await browser.close();
  return results;
}

/* ------------------------------------------------------------------ CLI */

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = process.argv[2];
  if (!arg) {
    console.error('Aufruf: node render.mjs <spec.json>   |   node render.mjs --demo');
    process.exit(1);
  }
  const specPath = arg === '--demo' ? path.join(HERE, 'examples', 'demo.json') : arg;
  const spec = JSON.parse(await fs.readFile(specPath, 'utf8'));
  const jobs = Array.isArray(spec) ? spec : (spec.jobs || [spec]);
  const outDir = path.resolve(path.dirname(specPath), (Array.isArray(spec) ? null : spec.outDir) || path.join(HERE, 'out'));
  console.log(`${jobs.length} Grafik(en) -> ${outDir}`);
  await render(jobs, outDir, path.dirname(path.resolve(specPath)));
}
