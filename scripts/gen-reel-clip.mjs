// Generiert Reel-Clips per Text-zu-Video MIT Ton über Veo (Gemini API).
//
// Anders als gen-video.mjs (Bild-zu-Video, `image` im instances-Objekt,
// generateAudio dort nachweislich abgelehnt): hier gibt es KEIN Startbild,
// nur einen Prompt, der Szene und gesprochene Zeile kombiniert. Ob
// generateAudio in diesem Pfad erlaubt ist, ist der zentrale Testpunkt —
// erst live gegen die echte API verifiziert, hier noch nicht.
//
// Liest reels/<post>/clips.json (Feld "reel", Array "clips" mit
// id/duration_seconds/spoken/prompt). "spoken" ist nur Dokumentation fuer
// die spaetere Untertitel-Erkennung, nicht Teil des API-Calls — der Prompt
// traegt die gesprochene Zeile bereits in Anfuehrungszeichen.
//
// Kosten: wie gen-video.mjs, Veo 3 mit Ton ~$0.40/s, ohne ~$0.20/s. Ein
// 7s-Clip mit Ton damit ~$2.80. Nie ohne ausdrueckliche Rueckfrage aufrufen.
//
//   node scripts/gen-reel-clip.mjs --file reels/05-.../clips.json --only clip1
//   node scripts/gen-reel-clip.mjs --file reels/05-.../clips.json --dry-run

import fs from 'node:fs/promises';
import path from 'node:path';
import { sleep } from './lib.mjs';

const args = process.argv.slice(2);
const flag = n => args.includes(`--${n}`);
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 && args[i + 1] ? args[i + 1] : d; };

const FILE    = opt('file');
const ONLY    = opt('only', '');
const OUTROOT = opt('out', '');
const FORCE   = flag('force');
const DRY     = flag('dry-run');
const POLL_MS = 10_000;
const TIMEOUT_MS = 6 * 60_000;

if (!FILE) { console.error('--file reels/<post>/clips.json ist Pflicht.'); process.exit(1); }

const KEY = process.env.GEMINI_API_KEY;

const raw = JSON.parse(await fs.readFile(FILE, 'utf8'));
if (!raw.reel) throw new Error(`${FILE}: Feld "reel" fehlt`);
if (!Array.isArray(raw.clips)) throw new Error(`${FILE}: Feld "clips" fehlt oder ist kein Array`);
const d = raw.defaults ?? {};

const outDir = OUTROOT || path.join(path.dirname(FILE), 'out');
await fs.mkdir(outDir, { recursive: true });

const clips = raw.clips.map(c => {
  if (!c.id) throw new Error(`${FILE}: Clip ohne "id"`);
  if (!c.prompt) throw new Error(`${FILE}: Clip "${c.id}" hat kein "prompt"`);
  // Kein erzwungener Default mehr: wenn weder der Clip noch die Defaults eine
  // Laenge angeben, wird durationSeconds im Request komplett weggelassen und
  // Veo bestimmt selbst (Testfrage: laesst sich das ueberhaupt weglassen?).
  const secs = c.duration_seconds ?? d.duration_seconds ?? null;
  if (secs !== null && (secs < 4 || secs > 8)) throw new Error(`${FILE}: Clip "${c.id}" hat duration_seconds ${secs} — Veo erlaubt nur 4 bis 8`);
  return {
    id: c.id,
    spoken: c.spoken ?? null,
    prompt: c.prompt,
    duration_seconds: secs,
    model: c.model ?? d.model ?? 'veo-3.1-generate-preview',
    aspect_ratio: c.aspect_ratio ?? d.aspect_ratio ?? '9:16',
    resolution: c.resolution ?? d.resolution ?? '720p',
    generate_audio: c.generate_audio ?? d.generate_audio ?? true,
    person_generation: c.person_generation ?? d.person_generation ?? 'allow_all',
  };
});

const matches = (c, only) => !only || only.split(',').map(s => s.trim()).includes(c.id);
const jobs = clips.filter(c => matches(c, ONLY));
if (!jobs.length) {
  console.error(`Kein Clip passt auf --only "${ONLY}". Vorhandene ids: ${clips.map(c => c.id).join(', ')}`);
  process.exit(1);
}
if (!KEY && !DRY) {
  console.error('GEMINI_API_KEY ist nicht gesetzt.');
  process.exit(1);
}

async function startOperation(clip) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${clip.model}:predictLongRunning`;
  const parameters = {
    aspectRatio: clip.aspect_ratio,
    resolution: clip.resolution,
    personGeneration: clip.person_generation,
    sampleCount: 1,
  };
  if (clip.duration_seconds !== null) parameters.durationSeconds = clip.duration_seconds;
  if (clip.generate_audio) parameters.generateAudio = true;
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'x-goog-api-key': KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ instances: [{ prompt: clip.prompt }], parameters }),
  });
  if (!r.ok) throw Object.assign(new Error(`predictLongRunning ${r.status}: ${(await r.text()).slice(0, 500)}`), { status: r.status });
  const json = await r.json();
  if (!json.name) throw new Error('Keine Operation-ID in der Antwort (Feld "name" fehlt).');
  return json.name;
}

async function pollOperation(name) {
  const started = Date.now();
  while (Date.now() - started < TIMEOUT_MS) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/${name}`, { headers: { 'x-goog-api-key': KEY } });
    if (!r.ok) throw Object.assign(new Error(`Operation-Abfrage ${r.status}: ${(await r.text()).slice(0, 300)}`), { status: r.status });
    const json = await r.json();
    if (json.error) throw new Error(`Video-Operation fehlgeschlagen: ${json.error.message ?? JSON.stringify(json.error)}`);
    if (json.done) return json;
    process.stdout.write('.');
    await sleep(POLL_MS);
  }
  throw new Error(`Zeitlimit (${TIMEOUT_MS / 1000}s) beim Warten auf die Video-Operation erreicht.`);
}

// Gleiches Prinzip wie findVideoRef in gen-video.mjs — Antwortform nie live
// verifiziert, deshalb defensiv nach URI ODER Bytes suchen.
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
  if (!uri && !b64) throw new Error('Keine Video-URI und keine Video-Bytes in der Operation-Antwort gefunden.');
  return { uri, b64 };
}

async function downloadVideo({ uri, b64 }) {
  if (b64) return Buffer.from(b64, 'base64');
  const sep = uri.includes('?') ? '&' : '?';
  const r = await fetch(`${uri}${sep}key=${KEY}`, { headers: { 'x-goog-api-key': KEY } });
  if (!r.ok) throw Object.assign(new Error(`Video-Download ${r.status}: ${(await r.text()).slice(0, 300)}`), { status: r.status });
  return Buffer.from(await r.arrayBuffer());
}

console.log(`\nReel: ${raw.reel}   Datei: ${FILE}   Ziel: ${outDir}`);
console.log(`${jobs.length} Clip(s) ausgewählt${ONLY ? ` (--only ${ONLY})` : ''}${DRY ? '  [DRY RUN]' : ''}\n`);

const exists = async p => { try { await fs.access(p); return true; } catch { return false; } };
const done = [], failed = [], skipped = [];

for (const clip of jobs) {
  const target = path.join(outDir, `${clip.id}.mp4`);
  const rate = clip.generate_audio ? 0.40 : 0.20;
  const secsLabel = clip.duration_seconds !== null ? `${clip.duration_seconds}s` : 'Laenge von Veo bestimmt (nicht angegeben)';
  const costLabel = clip.duration_seconds !== null ? `$${(rate * clip.duration_seconds).toFixed(2)}` : `$${(rate * 4).toFixed(2)}–$${(rate * 8).toFixed(2)} (4–8s moeglich)`;
  if (!FORCE && await exists(target)) { skipped.push(clip.id); console.log(`· ${clip.id.padEnd(6)} — existiert, übersprungen`); continue; }
  if (DRY) { console.log(`· ${clip.id.padEnd(6)} — würde generiert (${clip.model}, ${secsLabel}, ${clip.aspect_ratio}, Ton: ${clip.generate_audio}, geschätzt ${costLabel})`); continue; }

  process.stdout.write(`· ${clip.id.padEnd(6)} (${secsLabel}, geschätzt ${costLabel}) … `);
  try {
    const opName = await startOperation(clip);
    const finished = await pollOperation(opName);
    const ref = findVideoRef(finished);
    const buf = await downloadVideo(ref);
    await fs.writeFile(target, buf);
    console.log(' ok');
    done.push(clip.id);
  } catch (e) {
    console.log(`FEHLER: ${e.message}`);
    failed.push({ id: clip.id, error: e.message });
  }
}

console.log(`\nFertig: ${done.length} neu · ${skipped.length} übersprungen · ${failed.length} Fehler`);
if (failed.length) {
  await fs.writeFile(path.join(outDir, '_errors.json'), JSON.stringify(failed, null, 2));
  process.exitCode = failed.length === jobs.length ? 1 : 0;
}
