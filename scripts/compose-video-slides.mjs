// Legt die Textebene (Overlay-PNG aus render-slides.mjs) per ffmpeg auf den
// generierten Video-Clip — "das Bild lebt, der Text steht still"
// (wsd-social-images/SKILL.md §5). Braucht render-slides.mjs UND
// gen-video.mjs vorher: liest video-manifest.json aus dem Post-Ordner.
//
// Ergebnis: out/<post>/slides/slide-<nn>.mp4 — dieselbe Nummer wie die
// PNG-Slide, als eigene Datei daneben (die PNG bleibt als Fallback/Vorschau
// bestehen).
//
//   node scripts/compose-video-slides.mjs --post 04-forgetting-curve-20-minutes
//   node scripts/compose-video-slides.mjs --post 04-... --dry-run   (nur den ffmpeg-Befehl zeigen)

import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { exists } from './lib.mjs';

const run = promisify(execFile);

const args = process.argv.slice(2);
const flag = n => args.includes(`--${n}`);
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 && args[i + 1] ? args[i + 1] : d; };

const POST    = opt('post', '01-just-think');
const OUTROOT = opt('out', 'out');
const DRY     = flag('dry-run');

const outDir = path.join(OUTROOT, POST);
const manifestFile = path.join(outDir, 'video-manifest.json');

if (!await exists(manifestFile)) {
  console.error(`${manifestFile} fehlt — erst render-slides.mjs laufen lassen (das schreibt die Manifest-Datei nur, wenn mindestens ein Slide ein Video hat).`);
  process.exit(1);
}
const manifest = JSON.parse(await fs.readFile(manifestFile, 'utf8'));
if (!manifest.slides.length) {
  console.log('Keine Slides mit Video in dieser Manifest-Datei — nichts zu tun.');
  process.exit(0);
}

const { width: W, height: H } = manifest;
const slidesDir = path.join(outDir, 'slides');

// -shortest hat sich als NICHT zuverlaessig erwiesen, wenn einer der beiden
// Inputs eine geloopte Stand-Bild-"Videospur" ist: ein echter Testlauf
// produzierte statt 4s ein ueber drei Stunden langes File. Die echte
// Videolaenge deshalb per ffprobe auslesen und hart mit -t begrenzen.
async function probeDuration(file) {
  const { stdout } = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]);
  const secs = Number(stdout.trim());
  if (!Number.isFinite(secs) || secs <= 0) throw new Error(`ffprobe lieferte keine brauchbare Dauer fuer ${file}: "${stdout.trim()}"`);
  return secs;
}

for (const s of manifest.slides) {
  const out = path.join(slidesDir, `slide-${String(s.n).padStart(2, '0')}.mp4`);
  const filter =
    `[1:v]scale=w=${W}:h=${s.photoPx}:force_original_aspect_ratio=increase,` +
    `crop=${W}:${s.photoPx},pad=${W}:${H}:0:0:black[bg];[bg][0:v]overlay=0:0:format=auto[out]`;
  const duration = DRY ? null : await probeDuration(s.video);
  const cmd = ['-y', '-loop', '1', '-i', s.overlay, '-i', s.video,
    '-filter_complex', filter, '-map', '[out]',
    '-t', String(duration ?? 'DAUER-VON-FFPROBE'), '-shortest',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out];

  if (DRY) { console.log(`· Slide ${s.n}  ffmpeg ${cmd.join(' ')}`); continue; }

  process.stdout.write(`· Slide ${s.n}  komponiere -> ${out}  … `);
  try {
    await run('ffmpeg', cmd);
    console.log('ok');
  } catch (e) {
    console.log('FEHLER');
    console.error(e.stderr?.toString().slice(-2000) ?? e.message);
    process.exitCode = 1;
  }
}
