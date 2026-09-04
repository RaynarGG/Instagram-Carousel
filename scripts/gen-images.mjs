// Generiert Bilder aus einer Prompt-Datei über die Gemini API.
//
// Der API-Key kommt ausschliesslich aus der Umgebung (GEMINI_API_KEY).
// Lokal:  setx GEMINI_API_KEY "..."   (Windows, einmalig, danach neue Shell)
// In CI:  Repository Secret GEMINI_API_KEY
//
//   node scripts/gen-images.mjs --file prompts/post-01-just-think.json
//   node scripts/gen-images.mjs --only cover
//   node scripts/gen-images.mjs --only s1a,s3b --force
//   node scripts/gen-images.mjs --dry-run          (kein API-Call, nur Plan)

import fs from 'node:fs/promises';
import path from 'node:path';
import { readPromptFile, matches, exists, sleep, TARGET_RATIO } from './lib.mjs';

const args = process.argv.slice(2);
const flag = n => args.includes(`--${n}`);
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 && args[i + 1] ? args[i + 1] : d; };

const FILE    = opt('file', 'prompts/post-01-just-think.json');
const ONLY    = opt('only', '');
const OUTROOT = opt('out', 'out');
const FORCE   = flag('force');
const DRY     = flag('dry-run');
const RETRIES = Number(opt('retries', '3'));

const KEY = process.env.GEMINI_API_KEY;

const cfg = await readPromptFile(FILE);
const outDir = path.join(OUTROOT, cfg.post);
await fs.mkdir(outDir, { recursive: true });

const jobs = cfg.images.filter(i => matches(i, ONLY));
if (!jobs.length) {
  console.error(`Kein Bild passt auf --only "${ONLY}". Vorhandene ids: ${cfg.images.map(i => i.id).join(', ')}`);
  process.exit(1);
}

// Nur ein echter API-Call braucht den Key — reine Wiederverwendung (reuse) ist ein
// lokaler Dateikopiervorgang und kostet nichts.
if (!KEY && !DRY && jobs.some(i => !i.reuse)) {
  console.error('GEMINI_API_KEY ist nicht gesetzt.');
  console.error('Lokal: setx GEMINI_API_KEY "..." — in CI: Repository Secret anlegen.');
  process.exit(1);
}

// ---- API: zwei Formen, weil Google die Endpunkte umgestellt hat ----------
async function viaInteractions(img) {
  const r = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
    method: 'POST',
    headers: { 'x-goog-api-key': KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: img.model,
      input: [{ type: 'text', text: img.prompt }],
      response_format: {
        type: 'image',
        mime_type: img.mime_type,
        aspect_ratio: img.aspect_ratio,
        image_size: img.image_size,
      },
    }),
  });
  if (!r.ok) throw Object.assign(new Error(`interactions ${r.status}: ${(await r.text()).slice(0, 300)}`), { status: r.status });
  return findB64(await r.json());
}

async function viaGenerateContent(img) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${img.model}:generateContent`;
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'x-goog-api-key': KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: img.prompt }] }],
      generationConfig: {
        responseModalities: ['IMAGE'],
        imageConfig: { aspectRatio: img.aspect_ratio, imageSize: img.image_size },
      },
    }),
  });
  if (!r.ok) throw Object.assign(new Error(`generateContent ${r.status}: ${(await r.text()).slice(0, 300)}`), { status: r.status });
  return findB64(await r.json());
}

// Die ersten Bytes echter Bilddaten. Alles andere ist nicht das Bild, egal wie
// ueberzeugend es nach base64 aussieht.
const MAGIC = [
  ['png',  '89504e47'],
  ['jpeg', 'ffd8ff'],
  ['webp', '52494646'],   // RIFF, danach WEBP
  ['gif',  '47494638'],
];
function isImageB64(str) {
  if (typeof str !== 'string' || str.length < 512) return false;
  const head = Buffer.from(str.replace(/\s/g, '').slice(0, 32), 'base64').toString('hex');
  return MAGIC.some(([, sig]) => head.startsWith(sig));
}

// Beide Antwortformen tragen die Bildbytes als base64, aber an unterschiedlicher
// Stelle -> erst gezielt an den bekannten Feldern nachsehen, dann als Rueckfall
// rekursiv suchen. Gegriffen wird nur, was auch wirklich mit einer Bildsignatur
// beginnt: Gemini-3-Antworten enthalten mit `thoughtSignature` einen langen
// base64-Token VOR den Bilddaten, und der landete frueher in sharp.
function findB64(obj) {
  let hit = null;

  // 1) die dokumentierten Felder, in der Reihenfolge ihrer Verlaesslichkeit
  (function targeted(o) {
    if (hit || !o || typeof o !== 'object') return;
    for (const [k, v] of Object.entries(o)) {
      if (hit) return;
      if ((k === 'inlineData' || k === 'inline_data') && v && isImageB64(v.data)) { hit = v.data; return; }
      if ((k === 'b64_json' || k === 'imageBytes' || k === 'image_bytes') && isImageB64(v)) { hit = v; return; }
      if (v && typeof v === 'object') targeted(v);
    }
  })(obj);

  // 2) Rueckfall: irgendein Feld, das mit einer echten Bildsignatur beginnt
  if (!hit) (function walk(o) {
    if (hit || !o || typeof o !== 'object') return;
    for (const v of Object.values(o)) {
      if (hit) return;
      if (isImageB64(v)) { hit = v; return; }
      if (v && typeof v === 'object') walk(v);
    }
  })(obj);

  if (!hit) throw new Error('Keine Bilddaten in der Antwort gefunden. (Antwort enthielt keinen base64-Block mit PNG/JPEG/WebP-Signatur.)');
  return hit.replace(/\s/g, '');
}

async function generate(img) {
  let lastErr;
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    for (const call of [viaInteractions, viaGenerateContent]) {
      try { return await call(img); }
      catch (e) {
        lastErr = e;
        const retryable = !e.status || e.status === 429 || e.status >= 500;
        if (!retryable) break;
      }
    }
    if (attempt < RETRIES) {
      const wait = 2000 * attempt;
      process.stdout.write(`retry in ${wait / 1000}s … `);
      await sleep(wait);
    }
  }
  throw lastErr;
}

// ---- 3:4 erzwingen -------------------------------------------------------
// Zu breit -> links/rechts mittig beschneiden.
// Zu hoch  -> OBEN beschneiden, damit die schwarze Fusszone erhalten bleibt.
async function normalise(buf) {
  let sharp;
  try { ({ default: sharp } = await import('sharp')); }
  catch { return { buf, note: 'sharp fehlt, Bild unverändert übernommen' }; }

  const img = sharp(buf, { failOn: 'none' });
  const { width: w, height: h } = await img.metadata();
  const ratio = w / h;
  let pipeline = sharp(buf, { failOn: 'none' });
  let note = null;

  if (Math.abs(ratio - TARGET_RATIO) > 0.005) {
    if (ratio > TARGET_RATIO) {
      const nw = Math.round(h * TARGET_RATIO);
      pipeline = pipeline.extract({ left: Math.round((w - nw) / 2), top: 0, width: nw, height: h });
      note = `von ${w}x${h} seitlich auf 3:4 beschnitten`;
    } else {
      const nh = Math.round(w / TARGET_RATIO);
      pipeline = pipeline.extract({ left: 0, top: h - nh, width: w, height: nh });
      note = `von ${w}x${h} oben auf 3:4 beschnitten (Fusszone bleibt)`;
    }
  }
  const full = await pipeline.jpeg().toBuffer();
  const small = await sharp(full).resize(1080, 1440, { fit: 'fill' }).jpeg({ compressionLevel: 9 }).toBuffer();
  return { buf: full, small, note };
}

// ---- Lauf ----------------------------------------------------------------
console.log(`\nPost: ${cfg.post}   Datei: ${FILE}   Ziel: ${outDir}`);
console.log(`${jobs.length} von ${cfg.images.length} Bildern ausgewählt${ONLY ? ` (--only ${ONLY})` : ''}${DRY ? '  [DRY RUN]' : ''}\n`);

await fs.mkdir(path.join(outDir, '1080'), { recursive: true });
const done = [], failed = [], skipped = [];

// Bild aus einem frueheren Post uebernehmen statt neu zu generieren — fuer
// wiederkehrende Motive wie den ruhigen Schluss-Tisch, den es schon in
// mehreren Posts gibt. Sucht die Quelldatei per Praefix, wie findImage in
// render-slides.mjs.
async function copyReused(img) {
  const srcDir = path.join(OUTROOT, img.reuse.post);
  for (const sub of ['', '1080']) {
    const dir = path.join(srcDir, sub);
    if (!await exists(dir)) continue;
    for (const f of await fs.readdir(dir)) {
      if (f.startsWith(`${img.reuse.id}-`) && /\.jpe?g$/i.test(f)) {
        const dest = sub ? path.join(outDir, '1080', `${img.file}.jpeg`) : path.join(outDir, `${img.file}.jpeg`);
        await fs.copyFile(path.join(dir, f), dest);
      }
    }
  }
  if (!await exists(path.join(outDir, `${img.file}.jpeg`))) {
    throw new Error(`Quellbild "${img.reuse.id}" aus "${img.reuse.post}" nicht gefunden unter ${srcDir} — erst den Quell-Post generieren.`);
  }
}

for (const img of jobs) {
  const target = path.join(outDir, `${img.file}.jpeg`);
  if (!FORCE && await exists(target)) { skipped.push(img.id); console.log(`· ${img.id.padEnd(5)} ${img.file}  — existiert, übersprungen`); continue; }

  if (img.reuse) {
    if (DRY) { console.log(`· ${img.id.padEnd(5)} ${img.file}  — würde aus ${img.reuse.post}/${img.reuse.id} übernommen (kein Call, kostet nichts)`); continue; }
    process.stdout.write(`· ${img.id.padEnd(5)} ${img.file}  — übernehme aus ${img.reuse.post}/${img.reuse.id} … `);
    try {
      await copyReused(img);
      console.log('ok');
      done.push(img.id);
    } catch (e) {
      console.log(`FEHLER: ${e.message}`);
      failed.push({ id: img.id, error: e.message });
    }
    continue;
  }

  if (DRY) { console.log(`· ${img.id.padEnd(5)} ${img.file}  — würde generiert (${img.model}, ${img.aspect_ratio}, ${img.image_size})`); continue; }

  process.stdout.write(`· ${img.id.padEnd(5)} ${img.file}  … `);
  try {
    const b64 = await generate(img);
    const { buf, small, note } = await normalise(Buffer.from(b64, 'base64'));
    await fs.writeFile(target, buf);
    if (small) await fs.writeFile(path.join(outDir, '1080', `${img.file}.jpeg`), small);
    console.log(`ok${note ? `  (${note})` : ''}`);
    done.push(img.id);
  } catch (e) {
    console.log(`FEHLER: ${e.message}`);
    failed.push({ id: img.id, error: e.message });
  }
}

console.log(`\nFertig: ${done.length} neu · ${skipped.length} übersprungen · ${failed.length} Fehler`);
if (failed.length) {
  await fs.writeFile(path.join(outDir, '_errors.json'), JSON.stringify(failed, null, 2));
  process.exitCode = failed.length === jobs.length ? 1 : 0;   // Teilerfolg blockiert den Lauf nicht
}
