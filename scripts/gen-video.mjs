// Generiert kurze Bild-zu-Video-Clips über die Gemini API (Veo).
//
// Nimmt das bereits generierte Standbild aus gen-images.mjs und animiert es
// per Image-to-Video (Veo 3 / Veo 3.1). Das Ergebnis ist ein rohes .mp4 ohne
// Textebene — die Headline wird wie beim Standbild separat überlagert
// (siehe wsd-social-images/SKILL.md §5 "Video-Cover"), das ist hier noch
// nicht automatisiert.
//
// UNGETESTET GEGEN DIE ECHTE API. gen-images.mjs wurde erst nach echten
// Fehlschlägen stabil (siehe git log) — dieses Skript ist bisher nur gegen
// die öffentliche REST-Dokumentation und Community-Beispiele gebaut, nie
// gegen den echten Endpunkt gelaufen. Vor dem ersten Einsatz in der
// Tagesroutine: ein einzelner --only Testlauf mit einem Clip, Ergebnis
// prüfen, `findVideoRef` ggf. an die tatsächliche Antwortform anpassen.
//
// Kosten (Stand Sept 2026, siehe Google-Blog "Veo 3 now available in the
// Gemini API"): Veo 3 mit Ton ~$0.40/s, ohne Ton ~$0.20/s. Ein 8s-Clip damit
// grob $1.60–$3.20. Nie ohne ausdrückliche Rückfrage aufrufen — teurer als
// ein einzelnes Bild.
//
// Der API-Key kommt aus GEMINI_API_KEY, wie bei gen-images.mjs.
//
//   node scripts/gen-video.mjs --file prompts/post-04-....json --only s4a
//   node scripts/gen-video.mjs --dry-run          (kein API-Call, nur Plan)

import fs from 'node:fs/promises';
import path from 'node:path';
import { readPromptFile, matches, exists, sleep } from './lib.mjs';

const args = process.argv.slice(2);
const flag = n => args.includes(`--${n}`);
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 && args[i + 1] ? args[i + 1] : d; };

const FILE      = opt('file', 'prompts/post-01-just-think.json');
const ONLY      = opt('only', '');
const OUTROOT   = opt('out', 'out');
const FORCE     = flag('force');
const DRY       = flag('dry-run');
const POLL_MS   = 10_000;
const TIMEOUT_MS = 6 * 60_000;

const KEY = process.env.GEMINI_API_KEY;
if (!KEY && !DRY) {
  console.error('GEMINI_API_KEY ist nicht gesetzt.');
  console.error('Lokal: setx GEMINI_API_KEY "..." — in CI: Repository Secret anlegen.');
  process.exit(1);
}

const cfg = await readPromptFile(FILE);
const outDir = path.join(OUTROOT, cfg.post);
const videoDir = path.join(outDir, 'videos');
await fs.mkdir(videoDir, { recursive: true });

const withVideo = cfg.images.filter(i => i.video?.enabled);
const jobs = withVideo.filter(i => matches(i, ONLY));
if (!jobs.length) {
  console.error(`Kein Bild mit "video"-Block passt auf --only "${ONLY}". Vorhandene Video-ids: ${withVideo.map(i => i.id).join(', ') || '(keine — kein Bild in dieser Datei hat einen "video"-Block)'}`);
  process.exit(1);
}

async function stillImageBase64(img) {
  // Bevorzugt die volle Aufloesung, faellt auf die 1080er-Variante zurueck.
  const candidates = [path.join(outDir, `${img.file}.jpeg`), path.join(outDir, '1080', `${img.file}.jpeg`)];
  for (const c of candidates) {
    if (await exists(c)) return (await fs.readFile(c)).toString('base64');
  }
  throw new Error(`Kein generiertes Standbild fuer "${img.id}" gefunden (erwartet: ${candidates.join(' oder ')}). Erst gen-images.mjs laufen lassen — Image-to-Video braucht das fertige Bild.`);
}

async function startOperation(img, imageB64) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${img.video.model}:predictLongRunning`;
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'x-goog-api-key': KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      instances: [{
        prompt: img.video.motion_prompt,
        image: { bytesBase64Encoded: imageB64, mimeType: 'image/jpeg' },
      }],
      parameters: {
        aspectRatio: img.video.aspect_ratio,
        durationSeconds: img.video.duration_seconds,
        resolution: img.video.resolution,
        generateAudio: img.video.generate_audio,
        personGeneration: img.video.person_generation,
        sampleCount: 1,
      },
    }),
  });
  if (!r.ok) throw Object.assign(new Error(`predictLongRunning ${r.status}: ${(await r.text()).slice(0, 300)}`), { status: r.status });
  const json = await r.json();
  if (!json.name) throw new Error('Keine Operation-ID in der Antwort (Feld "name" fehlt) — Antwortform pruefen.');
  return json.name;
}

async function pollOperation(name) {
  const started = Date.now();
  while (Date.now() - started < TIMEOUT_MS) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/${name}`, {
      headers: { 'x-goog-api-key': KEY },
    });
    if (!r.ok) throw Object.assign(new Error(`Operation-Abfrage ${r.status}: ${(await r.text()).slice(0, 300)}`), { status: r.status });
    const json = await r.json();
    if (json.error) throw new Error(`Video-Operation fehlgeschlagen: ${json.error.message ?? JSON.stringify(json.error)}`);
    if (json.done) return json;
    process.stdout.write('.');
    await sleep(POLL_MS);
  }
  throw new Error(`Zeitlimit (${TIMEOUT_MS / 1000}s) beim Warten auf die Video-Operation erreicht.`);
}

// Die Antwortform ist nie live verifiziert worden — deshalb defensiv nach
// einer Video-URI ODER nach eingebetteten Bytes suchen, gleiches Prinzip
// wie findB64 in gen-images.mjs.
function findVideoRef(obj) {
  let uri = null, b64 = null;
  (function walk(o) {
    if ((uri || b64) || !o || typeof o !== 'object') return;
    for (const [k, v] of Object.entries(o)) {
      if (uri || b64) return;
      if (k === 'video' && v && typeof v === 'object') {
        if (typeof v.uri === 'string') { uri = v.uri; return; }
        if (typeof v.bytesBase64Encoded === 'string') { b64 = v.bytesBase64Encoded; return; }
      }
      if ((k === 'uri' || k === 'fileUri') && typeof v === 'string' && /^https?:\/\//.test(v)) { uri = v; return; }
      if (k === 'bytesBase64Encoded' && typeof v === 'string' && v.length > 1000) { b64 = v; return; }
      if (v && typeof v === 'object') walk(v);
    }
  })(obj);
  if (!uri && !b64) throw new Error('Keine Video-URI und keine Video-Bytes in der Operation-Antwort gefunden. (findVideoRef an die echte Antwortform anpassen.)');
  return { uri, b64 };
}

async function downloadVideo({ uri, b64 }) {
  if (b64) return Buffer.from(b64, 'base64');
  const sep = uri.includes('?') ? '&' : '?';
  const r = await fetch(`${uri}${sep}key=${KEY}`, { headers: { 'x-goog-api-key': KEY } });
  if (!r.ok) throw Object.assign(new Error(`Video-Download ${r.status}: ${(await r.text()).slice(0, 300)}`), { status: r.status });
  return Buffer.from(await r.arrayBuffer());
}

console.log(`\nPost: ${cfg.post}   Datei: ${FILE}   Ziel: ${videoDir}`);
console.log(`${jobs.length} Video(s) ausgewählt${ONLY ? ` (--only ${ONLY})` : ''}${DRY ? '  [DRY RUN]' : ''}\n`);

const done = [], failed = [], skipped = [];

for (const img of jobs) {
  const target = path.join(videoDir, `${img.file}.mp4`);
  const seconds = img.video.duration_seconds;
  const rate = img.video.generate_audio ? 0.40 : 0.20;
  if (!FORCE && await exists(target)) { skipped.push(img.id); console.log(`· ${img.id.padEnd(5)} ${img.file}  — existiert, übersprungen`); continue; }
  if (DRY) { console.log(`· ${img.id.padEnd(5)} ${img.file}  — würde generiert (${img.video.model}, ${seconds}s, ${img.video.aspect_ratio}, geschätzt $${(rate * seconds).toFixed(2)})`); continue; }

  process.stdout.write(`· ${img.id.padEnd(5)} ${img.file}  (${seconds}s, geschätzt $${(rate * seconds).toFixed(2)}) … `);
  try {
    const stillB64 = await stillImageBase64(img);
    const opName = await startOperation(img, stillB64);
    const finished = await pollOperation(opName);
    const ref = findVideoRef(finished);
    const buf = await downloadVideo(ref);
    await fs.writeFile(target, buf);
    console.log(' ok');
    done.push(img.id);
  } catch (e) {
    console.log(`FEHLER: ${e.message}`);
    failed.push({ id: img.id, error: e.message });
  }
}

console.log(`\nFertig: ${done.length} neu · ${skipped.length} übersprungen · ${failed.length} Fehler`);
if (failed.length) {
  await fs.writeFile(path.join(videoDir, '_errors.json'), JSON.stringify(failed, null, 2));
  process.exitCode = failed.length === jobs.length ? 1 : 0;
}
