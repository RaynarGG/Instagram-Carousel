// Exportiert posts/<post>.json als statisches HTML, das Canva per
// "import-design-from-url" in ein editierbares Design umwandelt: jede Slide
// wird eine Canva-Seite, jede Headline-Zeile und jeder Body ein eigenes
// Textfeld. So lassen sich Texte, Farben und Positionen direkt in Canva
// nachziehen, ohne dass der Renderer neu laufen muss.
//
// Canva-Regeln fuer den Import (laut Tool-Doku): jedes Seitenelement traegt
// data-document-role="page", Seiten werden nicht verschachtelt.
//
//   node scripts/export-canva-html.mjs --post 07-because-copier
//   node scripts/export-canva-html.mjs --post 07-because-copier --image-base https://raw.githubusercontent.com/<repo>/<sha>/out

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 && args[i + 1] ? args[i + 1] : d; };

const POST = opt('post');
const OUT_DIR = opt('out', 'canva');
// Optional: oeffentliche Basis-URL der generierten Bilder. Ohne sie bleibt
// die Bildzone leer und wird in Canva von Hand befuellt.
const IMAGE_BASE = opt('image-base', '');
const IMAGE_MAP = opt('images', ''); // "s1a=datei.jpeg,s2a=..." relativ zu IMAGE_BASE

if (!POST) { console.error('--post <name> ist Pflicht.'); process.exit(1); }

const cfg = JSON.parse(await fs.readFile(path.join('posts', `${POST}.json`), 'utf8'));
const P = JSON.parse(await fs.readFile(path.join(HERE, 'typo', 'presets.json'), 'utf8'))[cfg.preset || 'wsd-orange'];
const W = cfg.width || 1080;
const H = cfg.height || 1350;
const images = Object.fromEntries(IMAGE_MAP.split(',').filter(Boolean).map(p => p.split('=')));

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// [Klammern] -> Akzent-Span. Gleiche Syntax wie im Renderer.
const accent = s => esc(s).replace(/\[([^\]]+)\]/g, `<span style="color:${P.accent}">$1</span>`);

// Anton ist schmal: rund 0,42 em pro Versal — Canva setzt es etwas breiter, deshalb mit Reserve (0,44 em, 86 % Breite). Die laengste Zeile bestimmt die
// Groesse, damit keine Zeile in Canva umbricht.
function headSize(lines, max = 120) {
  const longest = Math.max(...lines.map(l => l.replace(/[\[\]]/g, '').length));
  return Math.min(max, Math.floor((W * 0.86) / (longest * 0.44)));
}

const PAD = Math.round(W * 0.045);

function page(s) {
  const img = s.image && IMAGE_BASE && images[s.image]
    ? `<img src="${esc(`${IMAGE_BASE}/${images[s.image]}`)}" alt="${esc(s.alt || '')}" style="position:absolute;left:0;top:0;width:${W}px;height:${Math.round(W * 4 / 3)}px;object-fit:cover">`
    : '';
  // Wie im Renderer: das Bild faellt unten ins Schwarze, damit die Headline
  // nicht auf Bilddetail sitzt. Nur wenn ein Bild da ist.
  const fade = img
    ? `<div style="position:absolute;left:0;right:0;bottom:0;height:${Math.round(H * 0.5)}px;background:linear-gradient(to bottom, rgba(31,29,27,0) 0%, ${P.bg} 55%, ${P.bg} 100%)"></div>`
    : '';
  const brand = `<p style="position:absolute;top:${PAD}px;right:${PAD}px;margin:0;font-family:Anton;font-size:30px;letter-spacing:1px;color:${P.plain}">${esc(cfg.brand || '')}</p>`;

  let block = '';
  if (s.type === 'evidence' && s.cite) {
    block = `
      <p style="margin:0 0 14px;font-family:Figtree;font-weight:700;font-size:22px;letter-spacing:3px;text-align:center;color:${P.accent}">${esc(s.cite.eyebrow)}</p>
      <p style="margin:0 0 12px;font-family:Anton;font-size:56px;line-height:1;text-align:center;color:${P.plain};text-transform:uppercase">${esc(s.cite.title)}</p>
      <p style="margin:0;font-family:Figtree;font-style:italic;font-size:24px;line-height:1.35;text-align:center;color:${P.micro}">${esc(s.cite.authors)}</p>`;
  } else {
    const lines = s.headline || [];
    const fs_ = headSize(lines, s.type === 'cta' ? 114 : 120);
    if (s.type === 'cover') {
      block += `<p style="margin:0 0 18px;font-family:Anton;font-size:30px;letter-spacing:6px;text-align:center;color:${P.kicker}">${esc(cfg.kicker || '')}</p>`;
    }
    block += lines.map(l =>
      `<p style="margin:0;font-family:Anton;font-size:${fs_}px;line-height:0.92;white-space:nowrap;text-align:center;text-transform:uppercase;color:${P.plain}">${accent(l)}</p>`
    ).join('\n      ');
    if (s.sub) block += `<p style="margin:18px 0 0;font-family:Anton;font-size:40px;text-align:center;color:${P.sub}">${esc(s.sub)}</p>`;
    if (s.body) block += `<p style="margin:22px 0 0;font-family:Figtree;font-weight:700;font-size:32px;line-height:1.4;text-align:center;color:${P.plain}">${accent(s.body)}</p>`;
    if (s.tag) block += `<p style="margin:22px 0 0;font-family:Anton;font-size:34px;letter-spacing:1px;text-align:center;color:${P.accent}">${esc(s.tag)}</p>`;
  }
  const micro = s.micro
    ? `<p style="margin:26px 0 0;font-family:Figtree;font-weight:700;font-size:22px;letter-spacing:4px;text-align:center;color:${P.micro}">${esc(s.micro)}</p>`
    : '';

  return `
  <section data-document-role="page" data-label="Slide ${s.n} · ${esc(s.type)}" data-speaker-notes="${esc(s.alt || '')}"
           style="position:relative;width:${W}px;height:${H}px;overflow:hidden;background:${P.bg}">
    ${img}
    ${fade}
    ${brand}
    <div style="position:absolute;left:${PAD + 20}px;right:${PAD + 20}px;bottom:${Math.round(PAD * 1.3)}px">
      ${block}
      ${micro}
    </div>
  </section>`;
}

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${esc(cfg.title || POST)}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Anton&family=Figtree:ital,wght@0,400;0,700;1,400&display=swap">
<style>body{margin:0;background:#000}section{margin:0 auto 40px}</style>
</head>
<body>
${cfg.slides.map(page).join('\n')}
</body>
</html>
`;

await fs.mkdir(OUT_DIR, { recursive: true });
const target = path.join(OUT_DIR, `${POST}.html`);
await fs.writeFile(target, html);
console.log(`${cfg.slides.length} Seiten -> ${target}`);
