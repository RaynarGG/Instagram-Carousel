// Rendert aus posts/<post>.json + den generierten Bildern die fertigen Slides.
// Typo-Engine identisch zur Skill `wsd-headline`: Anton in Versalien, Akzentwörter
// mit Textur-Füllung (background-clip:text), Farben aus scripts/typo/presets.json.
//
//   node scripts/render-slides.mjs --post 01-just-think
//   node scripts/render-slides.mjs --post 01-just-think --image-variant b
//   node scripts/render-slides.mjs --post 01-just-think --preset tech-blue
//
// Headline-Syntax:  [IN KLAMMERN] = Akzentfarbe mit Textur, alles andere plain.
// In Bullets zusätzlich **fett**.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exists } from './lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TYPO = path.join(HERE, 'typo');
const PRESETS = JSON.parse(await fs.readFile(path.join(TYPO, 'presets.json'), 'utf8'));

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const POST    = opt('post', '01-just-think');
const OUTROOT = opt('out', 'out');
const VARIANT = opt('image-variant', '');
const PRESET_CLI = opt('preset', '');

const cfg = JSON.parse(await fs.readFile(path.join('posts', `${POST}.json`), 'utf8'));
const P = PRESETS[PRESET_CLI || cfg.preset || 'wsd-orange'];
if (!P) throw new Error(`Unbekanntes Preset. Verfügbar: ${Object.keys(PRESETS).filter(k => k[0] !== '_').join(', ')}`);

const W = cfg.width || 1080;
const H = cfg.height || 1440;            // 3:4 — siehe wsd-social-images/SKILL.md §1
const PAD = Math.round(W * (cfg.padding ?? 0.045));

const imgDir = path.join(OUTROOT, cfg.post);
const outDir = path.join(imgDir, 'slides');
await fs.mkdir(outDir, { recursive: true });

/* ------------------------------------------------------------------ Fonts */
async function fontFace(fam, file, weight = 400, style = 'normal') {
  const b64 = (await fs.readFile(path.join(TYPO, 'fonts', file))).toString('base64');
  return `@font-face{font-family:"${fam}";font-style:${style};font-weight:${weight};` +
         `src:url(data:font/woff2;base64,${b64}) format("woff2");font-display:block}`;
}
const FONTS = (await Promise.all([
  fontFace('Anton', 'anton-latin-400-normal.woff2', 400),
  fontFace('Figtree', 'figtree-latin-400-normal.woff2', 400),
  fontFace('Figtree', 'figtree-latin-700-normal.woff2', 700),
  fontFace('Figtree', 'figtree-latin-800-normal.woff2', 800),
  fontFace('Figtree', 'figtree-latin-400-italic.woff2', 400, 'italic'),
])).join('\n');

/* ----------------------------------------------------------------- Textur */
// Wortwörtlich aus wsd-headline. Zwei Rauschebenen + Sheen + Farbverlauf,
// per background-clip:text in die Buchstaben gestanzt.
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
  };
}
const FILL = accentFill(P);

/* ----------------------------------------------------------------- Markup */
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// [Klammern] = Akzent mit Textur
const accentInline = s => esc(s).replace(/\[([^\]]*)\]/g, '<i class="a">$1</i>');
// in Bullets/Body zusätzlich **fett**; [..] wird dort zu flächigem Akzent (kleine Schrift
// verträgt keine Textur — die Fasern verschlucken die Buchstabenform)
const bodyInline = s => esc(s)
  .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
  .replace(/\[([^\]]*)\]/g, '<em class="flat">$1</em>');

function headLines(h) {
  const arr = Array.isArray(h) ? h : String(h).split('\n');
  return arr.map(line => {
    // Zeilen mit Unterlängen brauchen Luft, sonst stoßen sie in die nächste Zeile
    const desc = /[,;()Q]/.test(line.replace(/[\[\]]/g, '')) ? ' desc' : '';
    return `<div class="ln${desc}">${accentInline(line)}</div>`;
  }).join('');
}

/* ----------------------------------------------------------------- Layout */
const LAYOUT = {
  cover:    { photo: 0.72, headMax: 0.30 },
  facts:    { photo: 0.50, headMax: 0.15 },
  stat:     { photo: 0.72, headMax: 0.22 },
  evidence: { photo: 1.00, headMax: 0.20 },
  cta:      { photo: 1.00, headMax: 0.28 },
};

// gen-images.mjs schreibt .jpeg, frueher war es .png — beides akzeptieren,
// sonst rendert die Slide "BILD FEHLT", obwohl das Bild danebenliegt.
const IMG_EXT = /\.(jpe?g|png|webp)$/i;

async function findImage(id) {
  if (!id) return null;
  const wanted = VARIANT ? id.replace(/[ab]$/, VARIANT) : id;
  for (const dir of [path.join(imgDir, '1080'), imgDir]) {
    if (!await exists(dir)) continue;
    for (const f of await fs.readdir(dir)) {
      if (f.startsWith(`${wanted}-`) && IMG_EXT.test(f)) return path.join(dir, f);
    }
  }
  return null;
}

// Fuer die Video-Komposition (compose-video-slides.mjs): hat dieses Bild
// bereits einen generierten Clip aus gen-video.mjs?
async function findVideo(id) {
  if (!id) return null;
  const dir = path.join(imgDir, 'videos');
  if (!await exists(dir)) return null;
  for (const f of await fs.readdir(dir)) {
    if (f.startsWith(`${id}-`) && /\.mp4$/i.test(f)) return path.join(dir, f);
  }
  return null;
}
async function dataUri(file) {
  const mime = /\.png$/i.test(file) ? 'image/png'
             : /\.webp$/i.test(file) ? 'image/webp'
             : 'image/jpeg';
  return `data:${mime};base64,${(await fs.readFile(file)).toString('base64')}`;
}

const CSS = `
${FONTS}
*{margin:0;padding:0;box-sizing:border-box}
body{margin:0;background:#000;-webkit-font-smoothing:antialiased}
.slide{width:${W}px;height:${H}px;background:${P.bg};position:relative;overflow:hidden;font-family:"Figtree",sans-serif}

.photo{position:absolute;inset:0 0 auto 0;background-position:center top;background-size:cover;background-repeat:no-repeat}
/* Foto läuft weich in den Grund aus, damit die Typo IM Bild sitzt statt darauf zu kleben */
.photo::after{content:"";position:absolute;inset:0;
  background:linear-gradient(180deg, rgba(0,0,0,0) var(--g0), ${P.bg}CC var(--g1), ${P.bg} 100%),
             linear-gradient(180deg, rgba(0,0,0,.3) 0%, rgba(0,0,0,0) 20%)}
.miss{position:absolute;left:0;right:0;top:34%;text-align:center;font-weight:700;font-size:22px;
  letter-spacing:.1em;color:${P.micro};padding:0 60px;line-height:1.7;z-index:3}

.wm{position:absolute;top:${Math.round(W * 0.028)}px;right:${PAD}px;z-index:6;font-family:"Anton",sans-serif;
  color:${P.kicker};font-size:${Math.round(W * 0.023)}px;letter-spacing:.13em;text-shadow:0 2px 8px rgba(0,0,0,.6)}

.stage{position:relative;z-index:4;width:${W}px;height:${H}px;
  padding:0 ${PAD}px ${Math.round(H * 0.038)}px;
  display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:${Math.round(W * 0.022)}px}

.kick{display:flex;align-items:center;gap:${Math.round(W * 0.018)}px;width:100%;margin-bottom:${Math.round(W * 0.004)}px}
.kick span{font-family:"Anton",sans-serif;color:${P.kicker};font-size:${Math.round(W * 0.0235)}px;
  letter-spacing:.22em;line-height:1;white-space:nowrap;text-shadow:0 2px 8px rgba(0,0,0,.6)}
.kick i{flex:1;height:2px;background:${P.rule};display:block}

.head{width:100%;font-family:"Anton",sans-serif;text-align:center;text-transform:uppercase;
  line-height:${cfg.leading ?? '.95'};letter-spacing:${cfg.tracking ?? '.004em'};
  color:${P.plain};font-size:100px;
  /* drop-shadow, NICHT text-shadow: bei background-clip:text läge der Textschatten
     über der Füllung und die Schrift säuft ab. */
  filter:${P.shadow}}
.ln{white-space:nowrap;display:block}
.ln.desc{padding-bottom:.07em}
.head i.a{font-style:normal;
  background-image:${FILL.images};
  background-size:${FILL.sizes};
  background-blend-mode:normal,normal,normal,normal;
  background-position:0 0,0 0,0 0,0 0;
  background-attachment:fixed,fixed,scroll,scroll;
  -webkit-background-clip:text;background-clip:text;
  -webkit-text-fill-color:transparent;color:transparent}

.sub{width:100%;text-align:center;font-family:"Anton",sans-serif;color:${P.sub};text-transform:uppercase;
  letter-spacing:.03em;line-height:1.12;font-size:${Math.round(W * 0.0345)}px;text-shadow:0 2px 10px rgba(0,0,0,.65)}
.micro{width:100%;text-align:center;font-family:"Figtree",sans-serif;font-weight:700;color:${P.micro};
  text-transform:uppercase;letter-spacing:.16em;font-size:${Math.round(W * 0.0175)}px}
.tag{width:100%;text-align:center;font-family:"Figtree",sans-serif;font-weight:700;color:${P.accent};
  text-transform:uppercase;letter-spacing:.14em;font-size:${Math.round(W * 0.019)}px}

.body{width:100%;text-align:center;font-family:"Figtree",sans-serif;font-weight:600;color:${P.plain};
  font-size:${Math.round(W * 0.0305)}px;line-height:1.34;text-shadow:0 3px 10px rgba(0,0,0,.6)}
ul{width:100%;list-style:none;padding:0}
li{font-family:"Figtree",sans-serif;font-weight:500;color:${P.plain};font-size:${Math.round(W * 0.0285)}px;
  line-height:1.34;margin-bottom:${Math.round(W * 0.016)}px;display:flex;gap:${Math.round(W * 0.015)}px;
  text-align:left;text-shadow:0 3px 10px rgba(0,0,0,.6)}
li:last-child{margin-bottom:0}
li:before{content:"";flex:0 0 ${Math.round(W * 0.0085)}px;height:${Math.round(W * 0.0085)}px;
  background:${P.accent};border-radius:50%;margin-top:${Math.round(W * 0.015)}px}
li b{font-weight:800}
.flat{font-style:normal;color:${P.accent};font-weight:800}

.cite{width:100%;border-top:2px solid ${P.rule};padding-top:${Math.round(W * 0.022)}px;text-align:center}
.cite .l1{font-family:"Figtree",sans-serif;font-weight:700;font-size:${Math.round(W * 0.0185)}px;
  letter-spacing:.16em;color:${P.accent};text-transform:uppercase}
.cite .l2{font-family:"Anton",sans-serif;text-transform:uppercase;color:${P.plain};
  font-size:${Math.round(W * 0.041)}px;line-height:.98;margin-top:${Math.round(W * 0.014)}px}
.cite .l3{font-family:"Figtree",sans-serif;font-weight:400;font-style:italic;color:${P.micro};
  font-size:${Math.round(W * 0.0195)}px;margin-top:${Math.round(W * 0.013)}px;line-height:1.4}
`;

/* --------------------------------------------------------------- Auto-Größe */
// Eine Schriftgröße pro Slide, bestimmt durch die längste Zeile. Binäre Suche.
const FIT = ([sel, maxW, maxH, minPx, maxPx]) => {
  const el = document.querySelector(sel);
  if (!el) return 0;
  const lines = [...el.querySelectorAll('.ln')];
  const fits = px => {
    el.style.fontSize = px + 'px';
    const wide = Math.max(...lines.map(l => l.scrollWidth));
    return wide <= maxW && (maxH <= 0 || el.scrollHeight <= maxH);
  };
  let lo = minPx, hi = maxPx;
  for (let i = 0; i < 26; i++) { const mid = (lo + hi) / 2; if (fits(mid)) lo = mid; else hi = mid; }
  el.style.fontSize = lo.toFixed(2) + 'px';
  return lo;
};

/* -------------------------------------------------------------------- Bau */
async function slideHtml(s, idx) {
  const L = { ...LAYOUT[s.type], ...(s.layout ?? {}) };
  const file = await findImage(s.image);
  const photoPx = Math.round(H * L.photo);
  s._photoPx = photoPx;   // fuer compose-video-slides.mjs — Hoehe der Foto-/Video-Zone
  s._video = await findVideo(s.image);
  const g0 = Math.min(88, Math.round(100 * (H * 0.42) / photoPx));
  const g1 = Math.min(97, Math.round(100 * (H * 0.70) / photoPx));
  const photoStyle = `height:${photoPx}px;--g0:${g0}%;--g1:${g1}%;` +
    (file ? `background-image:url('${await dataUri(file)}')` : `background-image:radial-gradient(120% 95% at 30% 15%, ${P.accentDeep}55 0%, ${P.bg} 62%)`);

  let inner = '';
  if (s.kicker !== '' && (s.type === 'cover' || s.type === 'cta' || s.kicker))
    inner += `<div class="kick"><i></i><span>${esc(s.kicker ?? cfg.kicker ?? '')}</span><i></i></div>`;
  if (s.headline) inner += `<div class="head" id="h${idx}">${headLines(s.headline)}</div>`;
  if (s.bullets)  inner += `<ul>${s.bullets.map(b => `<li><span>${bodyInline(b)}</span></li>`).join('')}</ul>`;
  if (s.body)     inner += `<div class="body">${bodyInline(s.body)}</div>`;
  if (s.cite)     inner += `<div class="cite"><div class="l1">${esc(s.cite.eyebrow)}</div>` +
                            `<div class="l2">${esc(s.cite.title)}</div><div class="l3">${esc(s.cite.authors)}</div></div>`;
  if (s.sub)      inner += `<div class="sub">${esc(s.sub)}</div>`;
  if (s.tag)      inner += `<div class="tag">${esc(s.tag)}</div>`;
  if (s.micro || s.footer) inner += `<div class="micro">${esc(s.micro ?? s.footer)}</div>`;

  const missing = s.image && !file
    ? `<div class="miss">BILD FEHLT · ${esc(s.image)}<br>erst die Bilder generieren lassen</div>` : '';

  return `<div class="slide" id="s${s.n}">
    <div class="photo" style="${photoStyle}"></div>${missing}
    ${cfg.brand ? `<div class="wm">${esc(cfg.brand)}</div>` : ''}
    <div class="stage">${inner}</div>
  </div>`;
}

const parts = [];
for (let i = 0; i < cfg.slides.length; i++) parts.push(await slideHtml(cfg.slides[i], i));

const html = `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>${parts.join('\n')}</body></html>`;
const tmp = path.join(outDir, '_render.html');
await fs.writeFile(tmp, html);

const { chromium } = await import('playwright');
const browser = await chromium.launch({
  args: ['--no-sandbox'],
  ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
});
const page = await browser.newPage({ viewport: { width: W, height: H } });
await page.goto('file://' + path.resolve(tmp));
await page.evaluate(() => document.fonts.ready);

const maxW = W - 2 * PAD;
for (let i = 0; i < cfg.slides.length; i++) {
  const s = cfg.slides[i];
  if (!s.headline) continue;
  const L = { ...LAYOUT[s.type], ...(s.layout ?? {}) };
  const size = await page.evaluate(FIT, [`#h${i}`, maxW, Math.round(H * L.headMax), 20, cfg.maxFontSize || 240]);
  s._size = Math.round(size);
}
await page.waitForTimeout(300);

for (const s of cfg.slides) {
  const out = path.join(outDir, `slide-${String(s.n).padStart(2, '0')}.png`);
  await (await page.$(`#s${s.n}`)).screenshot({ path: out });
  console.log(`· Slide ${s.n}  ${s.type.padEnd(9)} ${s._size ? s._size + 'px' : '—'}  -> ${out}`);
}

// Zweiter Durchgang nur fuer Slides mit einem generierten Video: dieselbe
// Slide, aber ohne das Foto — transparent statt Bild, damit compose-video-
// slides.mjs die Textebene per ffmpeg-overlay ueber den Clip legen kann.
// Das Bild lebt (Video), der Text steht still (siehe wsd-social-images §5).
const withVideo = cfg.slides.filter(s => s._video);
const overlays = [];
if (withVideo.length) {
  // body braucht die Ueberschreibung explizit mit, sonst scheint sein
  // opakes Schwarz (siehe CSS oben) durch die transparent gemachte .slide.
  await page.addStyleTag({ content: 'body,.slide{background:transparent!important} .photo{background-image:none!important}' });
  const overlayDir = path.join(imgDir, 'overlays');
  await fs.mkdir(overlayDir, { recursive: true });
  for (const s of withVideo) {
    const out = path.join(overlayDir, `overlay-${String(s.n).padStart(2, '0')}.png`);
    await (await page.$(`#s${s.n}`)).screenshot({ path: out, omitBackground: true });
    overlays.push({ n: s.n, photoPx: s._photoPx, overlay: out, video: s._video });
    console.log(`· Slide ${s.n}  Overlay (fuer Video) -> ${out}`);
  }
  await fs.writeFile(path.join(imgDir, 'video-manifest.json'), JSON.stringify({ width: W, height: H, slides: overlays }, null, 2));
}

await browser.close();
await fs.unlink(tmp);
console.log(`\n${cfg.slides.length} Slides · ${W}x${H} · Preset ${PRESET_CLI || cfg.preset || 'wsd-orange'}`);
