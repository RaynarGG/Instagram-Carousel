// Baut aus generierten Veo-Clips + TTS-Spuren ein fertiges Reel:
// pro Clip die Tonspur gegen die TTS-Aufnahme tauschen, das Video auf die
// Sprechlänge kürzen, Untertitel einbrennen — danach alles aneinanderhängen.
//
// Warum der Ton getauscht wird: Veo liefert immer 8s und setzt den Sprecher
// irgendwo darin ein. Die TTS-Spur ist exakt so lang wie der Text und startet
// sofort. Veos eigener Ton (Atmo + Sprecher) wird dabei komplett verworfen.
//
// Untertitel-Timing ohne Transkription: wir kennen den Wortlaut aus clips.json.
// Der Sprechbereich wird per ffmpeg-silencedetect gemessen (Vorlauf und
// Auslauf abziehen), dann werden die Text-Häppchen proportional zu ihrer
// Zeichenlänge über diesen Bereich verteilt. Kein Rate-Modell, kein API-Call.
//
//   node scripts/assemble-reel.mjs --file reels/05-.../clips.json
//   node scripts/assemble-reel.mjs --file ... --out-dir ... --dry-run
//   node scripts/assemble-reel.mjs --file ... --only clip1-stand

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

const FILE    = opt('file');
const OUT_DIR = opt('out-dir');
// Teillauf: nur diese ids zusammenbauen. Fehlende Clips sind dann kein Fehler,
// sondern schlicht nicht gemeint.
const ONLY    = opt('only', '');
const DRY     = flag('dry-run');
// Kleine Atempause hinter dem letzten Wort, damit der Schnitt nicht auf der
// Silbe sitzt.
const TAIL_PAD = Number(opt('tail-pad', '0.45'));

if (!FILE) { console.error('--file <clips.json> ist Pflicht.'); process.exit(1); }

const raw = JSON.parse(await fs.readFile(FILE, 'utf8'));
const outDir = OUT_DIR || path.join(path.dirname(FILE), 'out');
const wanted = ONLY ? ONLY.split(',').map(x => x.trim()).filter(Boolean) : null;
const fullOrder = raw.reel_order ?? (raw.clips ?? []).map(c => c.id);
const order = wanted ? fullOrder.filter(id => wanted.includes(id)) : fullOrder;
const byId = Object.fromEntries((raw.clips ?? []).map(c => [c.id, c]));

const exists = async p => { try { await fs.access(p); return true; } catch { return false; } };

async function probeDuration(file) {
  const { stdout } = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]);
  const secs = Number(stdout.trim());
  if (!Number.isFinite(secs) || secs <= 0) throw new Error(`ffprobe lieferte keine brauchbare Dauer fuer ${file}`);
  return secs;
}

async function probeSize(file) {
  const { stdout } = await run('ffprobe', ['-v', 'error', '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height', '-of', 'csv=p=0', file]);
  const [width, height] = stdout.trim().split(',').map(Number);
  if (!width || !height) throw new Error(`ffprobe lieferte keine Masse fuer ${file}`);
  return { width, height };
}

// Findet den tatsächlich gesprochenen Bereich: alles vor dem ersten und nach
// dem letzten Ton ist Stille, die wir beim Untertitel-Timing nicht mitzählen.
async function speechSpan(wav, duration) {
  // ffmpeg schreibt silencedetect nach stderr und beendet sich mit 0 — der
  // Rueckgabewert traegt stderr also im Erfolgsfall, nicht nur im Fehlerfall.
  let stderr = '';
  try {
    const res = await run('ffmpeg', ['-i', wav, '-af', 'silencedetect=noise=-30dB:d=0.08', '-f', 'null', '-']);
    stderr = res.stderr?.toString() ?? '';
  } catch (e) {
    stderr = e.stderr?.toString() ?? '';
  }
  const starts = [...stderr.matchAll(/silence_start:\s*([\d.]+)/g)].map(m => Number(m[1]));
  const ends = [...stderr.matchAll(/silence_end:\s*([\d.]+)/g)].map(m => Number(m[1]));
  // Führende Stille: ein silence_end nahe 0 heisst, davor war Stille.
  const lead = (starts.length && starts[0] < 0.05 && ends.length) ? ends[0] : 0;
  // Auslaufende Stille: ein silence_start ohne passendes Ende vor Dateiende.
  const lastStart = starts.length ? starts[starts.length - 1] : null;
  const lastEnd = ends.length ? ends[ends.length - 1] : null;
  const trail = (lastStart !== null && (lastEnd === null || lastEnd <= lastStart || lastEnd >= duration - 0.02))
    ? lastStart : duration;
  return { start: lead, end: Math.max(lead + 0.5, trail) };
}

// Text in Untertitel-Häppchen schneiden. Zwei Grenzen gleichzeitig: höchstens
// fünf Wörter und höchstens rund achtundzwanzig Zeichen — sonst bricht libass bei der
// grossen Reel-Schrift auf drei oder vier Zeilen um und deckt das halbe Bild
// zu. An Satzzeichen wird bevorzugt getrennt.
function chunkText(text, maxWords = 5, maxChars = 28) {
  const words = String(text).trim().split(/\s+/);
  const chunks = [];
  let cur = [];
  const len = a => a.join(' ').length;
  for (const w of words) {
    if (cur.length && (cur.length >= maxWords || len([...cur, w]) > maxChars)) {
      chunks.push(cur); cur = [];
    }
    cur.push(w);
    if (/[.,!?;:]$/.test(w) && cur.length >= 2) { chunks.push(cur); cur = []; }
  }
  if (cur.length) chunks.push(cur);
  // Ein alleinstehendes Restwort sieht aus wie ein Fehler — lieber ein Wort aus
  // dem vorigen Häppchen nachrücken lassen, statt beide zusammenzukleben.
  const last = chunks[chunks.length - 1];
  const prev = chunks[chunks.length - 2];
  if (chunks.length > 1 && last.length === 1 && prev.length > 2) last.unshift(prev.pop());
  return chunks.map(c => c.join(' '));
}

// Häppchen proportional zur Zeichenlänge über den Sprechbereich verteilen.
function cuesFor(text, span) {
  const chunks = chunkText(text);
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const window = span.end - span.start;
  let t = span.start;
  return chunks.map(c => {
    const dur = window * (c.length / total);
    const cue = { start: t, end: t + dur, text: c };
    t += dur;
    return cue;
  });
}

function srtTime(sec) {
  const ms = Math.max(0, Math.round(sec * 1000));
  const pad = (n, l = 2) => String(n).padStart(l, '0');
  return `${pad(Math.floor(ms / 3600000))}:${pad(Math.floor((ms % 3600000) / 60000))}:${pad(Math.floor((ms % 60000) / 1000))},${pad(ms % 1000, 3)}`;
}
const buildSrt = cues => cues.map((c, i) => `${i + 1}\n${srtTime(c.start)} --> ${srtTime(c.end)}\n${c.text.trim()}\n`).join('\n');

const escFilterPath = p => p.replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, "\\'");

// Veo bekommt ein 3:4-Bild und legt es mittig in den 9:16-Rahmen — oben und
// unten bleiben schwarze Balken, an Oberkante und rechtem Rand zieht es
// ausserdem einen hellen Saum. Beides muss weg, sonst sieht das Reel aus wie
// ein recyceltes Postbild.
//
//   fit "cover"   → Bildband auf volle Hoehe zoomen, Seiten beschneiden.
//                   Fuellt den Rahmen, kostet rund ein Viertel der Breite.
//   fit "contain" → Bildband auf volle Breite, sauber mittig auf Schwarz.
//                   Fuer Clips, bei denen nichts wegdarf (Graph mit Achsen).
function reframeFilter(w, h, fit, srcAspect, inset) {
  const [aw, ah] = String(srcAspect).split(':').map(Number);
  const bandH = Math.min(h, Math.round(w * ah / aw));
  const bandY = Math.round((h - bandH) / 2);
  const even = n => (n % 2 === 0 ? n : n - 1);
  const cw = even(w - 2 * inset);
  const ch = even(bandH - 2 * inset);
  const crop = `crop=${cw}:${ch}:${inset}:${bandY + inset}`;
  if (fit === 'contain') {
    return `${crop},scale=${w}:-2,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:black`;
  }
  return `${crop},scale=-2:${h},crop=${w}:${h}`;
}

// FontSize ist relativ zur ASS-PlayRes (= Videoauflösung), 22 sitzt bei
// 720x1280 sauber in der unteren Drittel-Zone. Lokal kalibriert.
const SUB_STYLE = 'FontName=DejaVu Sans,Bold=1,FontSize=22,PrimaryColour=&H00FFFFFF,'
  + 'OutlineColour=&H00000000,BorderStyle=1,Outline=1.4,Shadow=0,Alignment=2,MarginV=55';

console.log(`\nReel: ${raw.reel}   Ordner: ${outDir}`);
console.log(`Reihenfolge: ${order.join(' -> ')}${DRY ? '   [DRY RUN]' : ''}\n`);

const pieces = [];
for (const id of order) {
  const clip = byId[id];
  if (!clip) { console.error(`· ${id} — steht in reel_order, aber nicht in clips`); process.exitCode = 1; continue; }
  const video = path.join(outDir, `${id}.mp4`);
  const wav = path.join(outDir, `${id}.wav`);
  if (!await exists(video)) { console.error(`· ${id.padEnd(16)} — Video fehlt (${video})`); process.exitCode = 1; continue; }
  if (!await exists(wav))   { console.error(`· ${id.padEnd(16)} — TTS fehlt (${wav})`); process.exitCode = 1; continue; }

  const ttsDur = await probeDuration(wav);
  const vidDur = await probeDuration(video);
  const span = await speechSpan(wav, ttsDur);
  // Der Schnitt richtet sich nach der Sprache, nicht nach dem Video. Ist die
  // TTS-Spur laenger als Veos feste 8s, wird das letzte Bild eingefroren statt
  // den Satz abzuschneiden — ein stehender Schluss faellt weniger auf als ein
  // abgehacktes Wort.
  const want = span.end + TAIL_PAD;
  const freeze = Math.max(0, want - vidDur);
  const cues = cuesFor(clip.spoken, span);
  const srtPath = path.join(outDir, `${id}.srt`);
  const outPath = path.join(outDir, `${id}-final.mp4`);

  console.log(`· ${id.padEnd(16)} TTS ${ttsDur.toFixed(2)}s (Sprache ${span.start.toFixed(2)}–${span.end.toFixed(2)}s), Video ${vidDur.toFixed(2)}s -> Schnitt bei ${want.toFixed(2)}s`
    + `${freeze > 0.01 ? `, ${freeze.toFixed(2)}s Standbild angehaengt` : ''}, ${cues.length} Untertitel`);
  if (DRY) { pieces.push(outPath); continue; }

  await fs.writeFile(srtPath, buildSrt(cues));
  const { width, height } = await probeSize(video);
  const reframe = reframeFilter(width, height, clip.fit ?? 'cover', clip.source_aspect ?? '3:4', Number(clip.inset ?? 16));
  const hold = freeze > 0.01 ? `tpad=stop_mode=clone:stop_duration=${(freeze + 0.1).toFixed(3)},` : '';
  const vf = `${hold}${reframe},subtitles=filename='${escFilterPath(srtPath)}':fontsdir='${escFilterPath(FONT_DIR)}':force_style='${SUB_STYLE}'`;
  await run('ffmpeg', ['-y', '-i', video, '-i', wav,
    '-map', '0:v:0', '-map', '1:a:0',
    '-vf', vf, '-t', String(want.toFixed(3)),
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', '24',
    '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-ac', '2',
    '-movflags', '+faststart', outPath]);
  pieces.push(outPath);
}

if (DRY) { console.log('\n[DRY RUN] kein ffmpeg-Aufruf, kein Zusammenschnitt.'); process.exit(0); }
if (pieces.length < 1) { console.error('Keine fertigen Teile — nichts zusammenzuschneiden.'); process.exit(1); }

const listFile = path.join(outDir, '_concat.txt');
await fs.writeFile(listFile, pieces.map(p => `file '${path.resolve(p)}'`).join('\n') + '\n');
const reelOut = path.join(outDir, 'reel.mp4');
console.log(`\nSchneide ${pieces.length} Teile zusammen -> ${reelOut}`);
await run('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', listFile,
  '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', '24',
  '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-ac', '2',
  '-movflags', '+faststart', reelOut]);
const dur = await probeDuration(reelOut);
console.log(`ok — ${dur.toFixed(2)}s`);
