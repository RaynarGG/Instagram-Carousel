// Erkennt die gesprochene Zeile in einem generierten Reel-Clip per Gemini
// (Video-Verstehen, NICHT der Bild/Video-Generierungs-Pfad) und brennt
// Untertitel per ffmpeg ein.
//
// Warum Spracherkennung statt einfach unseren eigenen Skript-Text zu nehmen:
// Veo spricht die Zeile aus dem Prompt nach, aber Tempo/Timing (und im
// Zweifel auch die exakte Formulierung) sind nicht garantiert. Ohne echte
// Zeitstempel waeren die Untertitel geraten statt synchron.
//
// UNGETESTET: Modellname fuer Video-Verstehen ist eine Annahme (gleiche
// Modellfamilie wie die Bildgenerierung, ohne "-image"-Suffix), das JSON-
// Cue-Format haengt davon ab, dass Gemini der Formatvorgabe folgt. Erster
// echter Testlauf zeigt, ob das so funktioniert.
//
// Rendering: SRT-Datei + ffmpeg "subtitles"-Filter (libass), NICHT drawtext —
// das lokal getestete Static-ffmpeg-Build hat drawtext nicht kompiliert
// ("No such filter"), subtitles/ass schon. fontsdir zeigt direkt auf die
// mitgelieferte Schrift, damit kein System-Font auf dem CI-Runner
// vorhanden sein muss (ffmpeg selbst war dort ja auch nicht vorinstalliert).
//
// Font: DejaVu Sans Bold, mitgeliefert unter scripts/reels-fonts/ (freie
// Lizenz). Reines Funktions-Styling fuer den ersten Test, kein Markenlook —
// der Account-Font Anton liegt nur als woff2 vor, das libass nicht laedt.
//
//   node scripts/caption-reel-clip.mjs --in reels/05-.../out/clip1.mp4 --out reels/05-.../out/clip1-captioned.mp4
//   node scripts/caption-reel-clip.mjs --in ... --dry-run   (nur Transkript zeigen, kein ffmpeg)

import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const run = promisify(execFile);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const FONT_DIR = path.join(HERE, 'reels-fonts');

const args = process.argv.slice(2);
const flag = n => args.includes(`--${n}`);
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 && args[i + 1] ? args[i + 1] : d; };

const IN   = opt('in');
const OUT  = opt('out');
const MODEL = opt('model', 'gemini-3.1-flash');
const DRY  = flag('dry-run');

if (!IN) { console.error('--in <clip.mp4> ist Pflicht.'); process.exit(1); }
if (!OUT && !DRY) { console.error('--out <clip-captioned.mp4> ist Pflicht (ausser bei --dry-run).'); process.exit(1); }

const KEY = process.env.GEMINI_API_KEY;
if (!KEY) { console.error('GEMINI_API_KEY ist nicht gesetzt.'); process.exit(1); }

export async function transcribe(videoPath) {
  const bytes = await fs.readFile(videoPath);
  const b64 = bytes.toString('base64');
  const prompt = 'Listen to the speech in this video. Transcribe exactly what is spoken, split into short caption '
    + 'chunks of about 3 to 6 words each, suitable for burned-in video subtitles. For each chunk give the start '
    + 'and end time in seconds (one decimal place) matching when it is actually heard. '
    + 'Respond with ONLY a JSON array, no markdown fences, no commentary, in this exact shape: '
    + '[{"start": 0.0, "end": 1.2, "text": "..."}, ...]. Cover the entire spoken audio, in order, no gaps or overlaps.';

  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'x-goog-api-key': KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: 'video/mp4', data: b64 } }] }],
    }),
  });
  if (!r.ok) throw Object.assign(new Error(`generateContent ${r.status}: ${(await r.text()).slice(0, 500)}`), { status: r.status });
  const json = await r.json();
  const text = json.candidates?.[0]?.content?.parts?.map(p => p.text).filter(Boolean).join('') ?? '';
  if (!text) throw new Error(`Keine Text-Antwort von Gemini. Rohantwort: ${JSON.stringify(json).slice(0, 500)}`);

  // Manchmal kommt Markdown drumrum (```json ... ```), trotz Anweisung.
  const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
  let cues;
  try { cues = JSON.parse(cleaned); }
  catch (e) { throw new Error(`Antwort war kein valides JSON: ${e.message}\nRohtext: ${cleaned.slice(0, 500)}`); }
  if (!Array.isArray(cues) || !cues.length) throw new Error(`Erwartetes JSON-Array leer oder falsch geformt: ${cleaned.slice(0, 300)}`);
  return cues;
}

function srtTime(sec) {
  const ms = Math.max(0, Math.round(sec * 1000));
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const msRest = ms % 1000;
  const pad = (n, l = 2) => String(n).padStart(l, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(msRest, 3)}`;
}

export function buildSrt(cues) {
  return cues.map((c, i) =>
    `${i + 1}\n${srtTime(c.start)} --> ${srtTime(c.end)}\n${String(c.text).trim()}\n`
  ).join('\n');
}

// ffmpeg-Filter-Optionswerte: Doppelpunkt, Backslash, Anfuehrungszeichen,
// eckige Klammern und Komma muessen fuer die Filtergraph-Syntax escaped werden.
function escFilterPath(p) {
  return p.replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, "\\'");
}

console.log(`\nTranskribiere: ${IN} (Modell ${MODEL}, ungetestet)`);
const cues = await transcribe(IN);
console.log(`${cues.length} Untertitel-Cues erkannt:`);
for (const c of cues) console.log(`  ${c.start.toFixed(1)}–${c.end.toFixed(1)}s  ${c.text}`);

const srtPath = (OUT ? OUT : IN).replace(/\.mp4$/i, '') + '.srt';
await fs.writeFile(srtPath, buildSrt(cues));
console.log(`SRT geschrieben -> ${srtPath}`);

if (DRY) { console.log('\n[DRY RUN] kein ffmpeg-Aufruf.'); process.exit(0); }

// FontSize ist KEIN Pixelwert, sondern relativ zur ASS-PlayRes, die der
// subtitles-Filter automatisch auf die Video-Aufloesung setzt. 48 ergab bei
// 720x1280 eine Wort-pro-Zeile-Monsterschrift (lokal getestet); 22 sitzt
// sauber in der unteren Drittel-Zone.
const style = 'FontName=DejaVu Sans,Bold=1,FontSize=22,PrimaryColour=&H00FFFFFF,'
  + 'OutlineColour=&H00000000,BorderStyle=1,Outline=1.4,Shadow=0,Alignment=2,MarginV=90';
const filter = `subtitles=filename='${escFilterPath(srtPath)}':fontsdir='${escFilterPath(FONT_DIR)}':force_style='${style}'`;

console.log(`\nBrenne Untertitel ein -> ${OUT} …`);
try {
  await run('ffmpeg', ['-y', '-i', IN, '-vf', filter,
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'copy', '-movflags', '+faststart', OUT]);
  console.log('ok');
} catch (e) {
  console.error('FEHLER beim ffmpeg-Lauf:');
  console.error(e.stderr?.toString().slice(-3000) ?? e.message);
  process.exitCode = 1;
}
