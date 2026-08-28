// Baut aus einem kurzen Freitext eine gültige Prompt-Datei — für den Handy-Weg.
// Der Text beschreibt nur das Motiv; die sieben Pflichtblöcke der Convention
// werden automatisch drumherum gelegt.
//
//   node scripts/adhoc.mjs --post 99-adhoc --slug burning-rack \
//     --text "a burning server rack alone in an empty datacenter hall"

import fs from 'node:fs/promises';

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 && args[i + 1] ? args[i + 1] : d; };

const POST = opt('post', '99-adhoc');
const SLUG = (opt('slug', 'adhoc') || 'adhoc').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const TEXT = opt('text', '').trim();
const OUT  = opt('file', 'prompts/_adhoc.json');
if (!TEXT) { console.error('--text fehlt'); process.exit(1); }

const prompt = [
  'Ultra-detailed cinematic composite, 3:4 vertical.',
  TEXT.replace(/\.?$/, '.'),
  'The main subject fills the upper two thirds of the frame, shot from close range,',
  'with strong foreground, midground and background separation and layered depth.',
  'One hard directional key light, everything else collapsing into shadow,',
  'plus a warm amber practical light source inside the frame.',
  'Tiny illegible technical annotation text in the top-left corner, like a lab dossier.',
  'High contrast, deep blacks, fine film grain, documentary and unpolished.',
  'The bottom 40 percent of the frame fades to pure solid black with no detail.',
  'no text, no lettering, no captions, no watermark, no logos, nothing legible,',
  'no borders, no frame, no collage grid lines',
].join(' ');

await fs.writeFile(OUT, JSON.stringify({
  post: POST,
  title: `Ad-hoc: ${TEXT}`,
  defaults: { model: 'gemini-3.1-flash-image', aspect_ratio: '3:4', image_size: '2K', mime_type: 'image/png' },
  images: [{ id: 'a1', slug: SLUG, slide: 1, variant: 'a', keywords: ['adhoc'], prompt }],
}, null, 2));

console.log(`${OUT} geschrieben — Post "${POST}", Bild a1-${SLUG}`);
console.log(`\nZusammengesetzter Prompt:\n${prompt}\n`);
