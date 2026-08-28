// Baut aus posts/<post>.json + den generierten Bildern die fertigen Slides.
// 1080 x 1440 (3:4), Headline in Anton, alles andere in Figtree, WSD-Farben.
//
//   node scripts/render-slides.mjs --post 01-just-think
//   node scripts/render-slides.mjs --post 01-just-think --image-variant b
//
// Sternchen im Text = Akzentwort:  "*PEOPLE CHOSE* ELECTRIC"
// Doppelsternchen in Bullets = fett: "**University of Virginia**"

import fs from 'node:fs/promises';
import path from 'node:path';
import { exists } from './lib.mjs';

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const POST    = opt('post', '01-just-think');
const OUTROOT = opt('out', 'out');
const VARIANT = opt('image-variant', '');   // "b" -> nimmt überall die B-Variante, wenn vorhanden

const W = 1080, H = 1440;
const INK = '#1F1D1B', CREAM = '#FDF7F1', ACC = '#EE9A54';
const MUTED = 'rgba(253,247,241,.58)', HAIR = 'rgba(253,247,241,.14)';

const cfg = JSON.parse(await fs.readFile(path.join('posts', `${POST}.json`), 'utf8'));
const imgDir = path.join(OUTROOT, cfg.post);
const outDir = path.join(OUTROOT, cfg.post, 'slides');
await fs.mkdir(outDir, { recursive: true });

// ---- Schriften als data: URI einbetten, damit kein Netz gebraucht wird ----
async function fontCss() {
  const faces = [
    ['Anton', 400, 'normal', '@fontsource/anton/files/anton-latin-400-normal.woff2'],
    ['Figtree', 500, 'normal', '@fontsource/figtree/files/figtree-latin-500-normal.woff2'],
    ['Figtree', 700, 'normal', '@fontsource/figtree/files/figtree-latin-700-normal.woff2'],
    ['Figtree', 800, 'normal', '@fontsource/figtree/files/figtree-latin-800-normal.woff2'],
  ];
  const out = [];
  for (const [fam, wt, st, rel] of faces) {
    const p = path.join('node_modules', rel);
    if (!await exists(p)) throw new Error(`Schrift fehlt: ${p} — npm install @fontsource/anton @fontsource/figtree`);
    const b64 = (await fs.readFile(p)).toString('base64');
    out.push(`@font-face{font-family:'${fam}';src:url(data:font/woff2;base64,${b64}) format('woff2');font-weight:${wt};font-style:${st};font-display:block}`);
  }
  return out.join('\n');
}

// ---- Bild finden -------------------------------------------------------
async function findImage(id) {
  const wanted = VARIANT ? id.replace(/[ab]$/, VARIANT) : id;
  for (const dir of [path.join(imgDir, '1080'), imgDir]) {
    if (!await exists(dir)) continue;
    for (const f of await fs.readdir(dir)) {
      if (f.startsWith(`${wanted}-`) && f.endsWith('.png')) return path.join(dir, f);
    }
  }
  return null;
}
async function dataUri(file) {
  const b64 = (await fs.readFile(file)).toString('base64');
  return `data:image/png;base64,${b64}`;
}

// ---- Text-Markup ------------------------------------------------------
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const acc = s => esc(s).replace(/\*([^*]+)\*/g, '<span class="a">$1</span>');
const bold = s => esc(s).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/\*([^*]+)\*/g, '<span class="a">$1</span>');

// ---- Layout je Typ ----------------------------------------------------
const LAYOUT = {
  cover:    { img: '70%', fade: 62, kicker: 68.5, head: 71.3, size: 91 },
  facts:    { img: '54%', fade: 60, head: 56.0, size: 84 },
  stat:     { img: '70%', fade: 62, head: 70.5, size: 106 },
  evidence: { img: '100%', fade: null },
  cta:      { img: '100%', fade: null, kicker: 69.5, head: 72.5, size: 100 },
};

function fadeCss(from) {
  if (from === null) return `linear-gradient(180deg,rgba(31,29,27,.22) 0%,rgba(31,29,27,.10) 40%,rgba(31,29,27,.66) 64%,rgba(31,29,27,.96) 88%,${INK} 100%)`;
  return `linear-gradient(180deg,rgba(31,29,27,.18) 0%,rgba(31,29,27,0) 26%,rgba(31,29,27,.42) ${from}%,rgba(31,29,27,.94) ${from + 22}%,${INK} 100%)`;
}

function headlineHtml(lines, top, size) {
  return `<h1 style="top:${top}%" data-size="${size}">` +
    lines.map(l => `<div class="ln"><span class="tx">${acc(l)}</span></div>`).join('') + `</h1>`;
}

async function slideHtml(s) {
  const L = { ...LAYOUT[s.type], ...(s.layout ?? {}) };
  const file = s.image ? await findImage(s.image) : null;
  const bg = file
    ? `background-image:url('${await dataUri(file)}');background-size:cover;background-position:center top`
    : `background:radial-gradient(120% 95% at 30% 15%,#3a2b1d 0%,#221a14 55%,${INK} 100%)`;
  const missing = s.image && !file
    ? `<div class="miss">BILD FEHLT · ${esc(s.image)} — erst \`gen-images\` laufen lassen</div>` : '';

  let inner = '';
  if (s.type === 'cover' || s.type === 'cta') {
    inner += `<div class="kick" style="top:${L.kicker}%"><i></i><span>${esc(cfg.kicker ?? '')}</span><i></i></div>`;
    inner += headlineHtml(s.headline, L.head, L.size);
    if (s.sub)   inner += `<div class="sub" style="left:60px;right:60px;bottom:72px">${esc(s.sub)}</div>`;
    if (s.tag)   inner += `<div class="tag">${esc(s.tag)}</div>`;
  } else if (s.type === 'facts') {
    inner += headlineHtml(s.headline, L.head, L.size);
    inner += `<ul style="left:0;right:0;top:69.5%">` +
      s.bullets.map(b => `<li><span>${bold(b)}</span></li>`).join('') + `</ul>`;
  } else if (s.type === 'stat') {
    inner += headlineHtml(s.headline, L.head, L.size);
    if (s.body) inner += `<div class="body" style="left:52px;right:52px;bottom:64px">${bold(s.body)}</div>`;
  } else if (s.type === 'evidence') {
    inner += `<div class="cite"><div class="l1">${esc(s.cite.eyebrow)}</div>` +
      `<div class="l2">${esc(s.cite.title)}</div>` +
      `<div class="l3">${esc(s.cite.authors)}</div></div>`;
  }
  if (s.footer && s.type !== 'cta') inner += `<div class="swipe">${esc(s.footer)}</div>`;

  return `<div class="slide" id="s${s.n}">
    <div class="ph" style="height:${L.img};${bg}"><div class="fade" style="background:${fadeCss(L.fade ?? null)}"></div>${missing}</div>
    <div class="wm">${esc(cfg.brand ?? '')}</div>
    ${inner}
  </div>`;
}

const css = `
*{margin:0;padding:0;box-sizing:border-box;-webkit-font-smoothing:antialiased}
body{background:#000;margin:0}
.slide{width:${W}px;height:${H}px;background:${INK};position:relative;overflow:hidden;font-family:'Figtree',sans-serif;color:${CREAM}}
.ph{position:absolute;left:0;top:0;right:0}
.ph .fade{position:absolute;inset:0}
.miss{position:absolute;left:0;right:0;top:40%;text-align:center;font-weight:700;font-size:22px;letter-spacing:.1em;color:rgba(253,247,241,.35);padding:0 60px;line-height:1.6}
.wm{position:absolute;top:30px;right:36px;font-weight:800;font-size:25px;letter-spacing:.13em;z-index:5;text-shadow:0 2px 8px rgba(0,0,0,.7)}
.kick{position:absolute;left:36px;right:36px;display:flex;align-items:center;justify-content:center;gap:22px;z-index:5}
.kick span{font-weight:700;font-size:22px;letter-spacing:.14em;white-space:nowrap;text-shadow:0 2px 8px rgba(0,0,0,.8)}
.kick i{height:1.5px;flex:1;background:${CREAM};opacity:.85}
h1{position:absolute;left:26px;right:26px;z-index:5}
.ln{font-family:'Anton';text-transform:uppercase;text-align:center;white-space:nowrap;line-height:.90;letter-spacing:-.004em;text-shadow:0 6px 16px rgba(0,0,0,.75)}
.ln .tx{display:inline-block;white-space:nowrap}
.a{color:${ACC}}
.sub{position:absolute;text-align:center;font-weight:700;font-size:31px;text-transform:uppercase;z-index:5;text-shadow:0 3px 10px rgba(0,0,0,.8)}
.body{position:absolute;text-align:center;font-weight:600;font-size:33px;line-height:1.34;z-index:5;text-shadow:0 3px 10px rgba(0,0,0,.8)}
.body .a,.body b{font-weight:800}
.swipe{position:absolute;bottom:30px;left:0;right:0;text-align:center;font-weight:700;font-size:19px;letter-spacing:.16em;color:${MUTED};z-index:5}
ul{position:absolute;list-style:none;z-index:5;padding:0 54px}
li{font-weight:500;font-size:31px;line-height:1.32;margin-bottom:19px;display:flex;gap:16px;text-shadow:0 3px 10px rgba(0,0,0,.85)}
li:before{content:"";flex:0 0 9px;height:9px;background:${ACC};margin-top:15px;border-radius:50%}
li b{font-weight:800}
.cite{position:absolute;left:60px;right:60px;bottom:60px;z-index:5;border-top:1.5px solid ${HAIR};padding-top:22px;text-align:center}
.cite .l1{font-weight:700;font-size:20px;letter-spacing:.16em;color:${ACC}}
.cite .l2{font-family:'Anton';text-transform:uppercase;font-size:44px;line-height:.96;margin-top:14px}
.cite .l3{font-weight:500;font-size:21px;color:${MUTED};margin-top:14px}
.tag{position:absolute;bottom:30px;left:0;right:0;text-align:center;font-weight:700;font-size:20px;letter-spacing:.14em;color:${ACC};z-index:5}
`;

const fit = `function fitLines(){document.querySelectorAll('h1').forEach(h=>{const w=h.clientWidth;const base=parseFloat(h.dataset.size||'95');h.querySelectorAll('.ln').forEach(l=>{l.style.fontSize=base+'px';const tx=l.querySelector('.tx');if(tx.offsetWidth>w){l.style.fontSize=(base*w/tx.offsetWidth).toFixed(2)+'px';}});});}
document.fonts.ready.then(()=>{fitLines();window.__fit=1;});`;

const slides = [];
for (const s of cfg.slides) slides.push(await slideHtml(s));

const html = `<!doctype html><html><head><meta charset="utf-8"><style>${await fontCss()}${css}</style></head><body>${slides.join('\n')}<script>${fit}</script></body></html>`;
const tmp = path.join(outDir, '_render.html');
await fs.writeFile(tmp, html);

const { chromium } = await import('playwright');
// CHROME_PATH nur für lokale Umgebungen mit vorinstalliertem Chromium; in CI leer lassen.
const browser = await chromium.launch({ args: ['--no-sandbox'], ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
const page = await browser.newPage({ viewport: { width: W, height: H } });
await page.goto('file://' + path.resolve(tmp));
await page.waitForFunction('window.__fit===1', { timeout: 30000 });
await page.waitForTimeout(400);

const files = [];
for (const s of cfg.slides) {
  const out = path.join(outDir, `slide-${String(s.n).padStart(2, '0')}.png`);
  await (await page.$(`#s${s.n}`)).screenshot({ path: out });
  files.push(out);
  console.log(`· Slide ${s.n} -> ${out}`);
}
await browser.close();
await fs.unlink(tmp);

console.log(`\n${files.length} Slides gerendert (${W}x${H}) in ${outDir}`);
