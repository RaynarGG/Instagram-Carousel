// Testet Text-zu-Sprache ueber die Gemini API (kein Video, kein Veo).
// Modellname per echter models.list-Abfrage verifiziert: gemini-3.1-flash-tts-preview
// (siehe scripts/list-veo-models.mjs --filter tts).
//
// UNGETESTET gegen die echte API: Request-Form ist aus der allgemeinen
// Gemini-TTS-Konvention abgeleitet (responseModalities:AUDIO + speechConfig),
// nicht Feld-fuer-Feld verifiziert. Antwort ist vermutlich rohes PCM
// (24kHz, 16-bit, mono) ohne WAV-Header — das Skript haengt einen Header
// selbst an, damit ffmpeg/ffprobe die Datei lesen koennen.
//
//   node scripts/gen-tts.mjs --text "Did you know ..." --out clip1.wav

import fs from 'node:fs/promises';

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 && args[i + 1] ? args[i + 1] : d; };

const TEXT  = opt('text');
const OUT   = opt('out', 'tts-test.wav');
const MODEL = opt('model', 'gemini-3.1-flash-tts-preview');
const VOICE = opt('voice', 'Kore');

if (!TEXT) { console.error('--text "..." ist Pflicht.'); process.exit(1); }

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

console.log(`Modell: ${MODEL}   Stimme: ${VOICE}   Text: "${TEXT}"`);

const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
  method: 'POST',
  headers: { 'x-goog-api-key': KEY, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contents: [{ parts: [{ text: TEXT }] }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } } },
    },
  }),
});
if (!r.ok) {
  console.error(`generateContent ${r.status}: ${(await r.text()).slice(0, 800)}`);
  process.exit(1);
}
const json = await r.json();

// Defensiv nach inlineData suchen, gleiches Prinzip wie findB64 in gen-images.mjs —
// Antwortform hier ebenfalls nicht live verifiziert.
let audioB64 = null, mimeType = null;
(function walk(o) {
  if (audioB64 || !o || typeof o !== 'object') return;
  for (const [k, v] of Object.entries(o)) {
    if (audioB64) return;
    if ((k === 'inlineData' || k === 'inline_data') && v?.data) { audioB64 = v.data; mimeType = v.mimeType ?? v.mime_type; return; }
    if (v && typeof v === 'object') walk(v);
  }
})(json);

if (!audioB64) {
  console.error('Keine Audio-Daten in der Antwort gefunden. Rohantwort:');
  console.error(JSON.stringify(json, null, 2).slice(0, 2000));
  process.exit(1);
}

console.log(`Gefunden: mimeType=${mimeType ?? '(keine Angabe)'}  base64-Laenge=${audioB64.length}`);
const pcm = Buffer.from(audioB64, 'base64');
const wav = Buffer.concat([wavHeader({ dataLength: pcm.length }), pcm]);
await fs.writeFile(OUT, wav);
console.log(`Geschrieben (als WAV, 24kHz/16bit/mono angenommen) -> ${OUT} (${wav.length} bytes)`);
