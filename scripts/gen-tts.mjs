// Text-zu-Sprache über die Gemini API (kein Video, kein Veo).
//
// Modell und Antwortform sind live verifiziert (Testlauf 09.09.2026):
// gemini-3.1-flash-tts-preview antwortet mit inlineData,
// mimeType "audio/l16; rate=24000; channels=1" — also rohes PCM,
// 24 kHz, 16 bit, mono, ohne Container. Der WAV-Header wird hier
// selbst davorgesetzt, damit ffmpeg/ffprobe die Datei lesen können.
//
// Warum TTS statt Veos eingebautem Ton: Veo liefert immer 8s und
// entscheidet selbst, wann der Sprecher einsetzt. TTS ist exakt so lang
// wie der Text und startet praktisch sofort (gemessen: 0,3 s Vorlauf).
// Ausserdem kennen wir den Wortlaut, was die Untertitel ohne
// Transkriptions-Ratespiel möglich macht.
//
//   node scripts/gen-tts.mjs --text "..." --out clip1.wav
//   node scripts/gen-tts.mjs --file reels/05-.../clips.json --out-dir reels/05-.../out

import fs from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2);
const flag = n => args.includes(`--${n}`);
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 && args[i + 1] ? args[i + 1] : d; };

const TEXT    = opt('text');
const FILE    = opt('file');
const OUT     = opt('out', 'tts-test.wav');
const OUT_DIR = opt('out-dir');
const ONLY    = opt('only', '');
const MODEL   = opt('model', 'gemini-3.1-flash-tts-preview');
const VOICE   = opt('voice', 'Kore');
const FORCE   = flag('force');

if (!TEXT && !FILE) { console.error('Entweder --text "..." oder --file <clips.json> ist Pflicht.'); process.exit(1); }

const KEY = process.env.GEMINI_API_KEY;
if (!KEY) { console.error('GEMINI_API_KEY ist nicht gesetzt.'); process.exit(1); }

function wavHeader({ dataLength, sampleRate = 24000, bitsPerSample = 16, channels = 1 }) {
  const buf = Buffer.alloc(44);
  const byteRate = sampleRate * channels * bitsPerSample / 8;
  const blockAlign = channels * bitsPerSample / 8;
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataLength, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(channels, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(byteRate, 28);
  buf.writeUInt16LE(blockAlign, 32);
  buf.writeUInt16LE(bitsPerSample, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataLength, 40);
  return buf;
}

// Die Antwort traegt das Audio als inlineData; defensiv gesucht, gleiches
// Prinzip wie findB64 in gen-images.mjs.
function findAudio(obj) {
  let data = null, mimeType = null;
  (function walk(o) {
    if (data || !o || typeof o !== 'object') return;
    for (const [k, v] of Object.entries(o)) {
      if (data) return;
      if ((k === 'inlineData' || k === 'inline_data') && v?.data) {
        data = v.data; mimeType = v.mimeType ?? v.mime_type; return;
      }
      if (v && typeof v === 'object') walk(v);
    }
  })(obj);
  return { data, mimeType };
}

async function synthesize(text, voice) {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'x-goog-api-key': KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
      },
    }),
  });
  if (!r.ok) throw new Error(`generateContent ${r.status}: ${(await r.text()).slice(0, 500)}`);
  const json = await r.json();
  const { data, mimeType } = findAudio(json);
  if (!data) throw new Error(`Keine Audio-Daten in der Antwort. Rohantwort: ${JSON.stringify(json).slice(0, 500)}`);
  const pcm = Buffer.from(data, 'base64');
  return { wav: Buffer.concat([wavHeader({ dataLength: pcm.length }), pcm]), mimeType };
}

const exists = async p => { try { await fs.access(p); return true; } catch { return false; } };

if (TEXT) {
  console.log(`Modell: ${MODEL}   Stimme: ${VOICE}   Text: "${TEXT}"`);
  const { wav, mimeType } = await synthesize(TEXT, VOICE);
  await fs.writeFile(OUT, wav);
  console.log(`mimeType=${mimeType}  ->  ${OUT} (${wav.length} bytes)`);
  process.exit(0);
}

// Clips-Datei-Modus
const raw = JSON.parse(await fs.readFile(FILE, 'utf8'));
const outDir = OUT_DIR || path.join(path.dirname(FILE), 'out');
await fs.mkdir(outDir, { recursive: true });
const d = raw.defaults ?? {};
const wanted = ONLY ? ONLY.split(',').map(s => s.trim()) : null;

console.log(`\nReel: ${raw.reel}   Modell: ${MODEL}   Ziel: ${outDir}\n`);
let done = 0, skipped = 0, failed = 0;

for (const c of raw.clips ?? []) {
  if (wanted && !wanted.includes(c.id)) continue;
  if (!c.spoken) { console.log(`· ${c.id.padEnd(16)} — kein "spoken", übersprungen`); continue; }
  const target = path.join(outDir, `${c.id}.wav`);
  if (!FORCE && await exists(target)) { skipped++; console.log(`· ${c.id.padEnd(16)} — existiert, übersprungen`); continue; }
  process.stdout.write(`· ${c.id.padEnd(16)} … `);
  try {
    const { wav } = await synthesize(c.spoken, c.voice ?? d.voice ?? VOICE);
    await fs.writeFile(target, wav);
    console.log(`ok (${(wav.length / 48000).toFixed(2)}s)`);
    done++;
  } catch (e) {
    console.log(`FEHLER: ${e.message}`);
    failed++;
  }
}

console.log(`\nFertig: ${done} neu · ${skipped} übersprungen · ${failed} Fehler`);
if (failed) process.exitCode = 1;
