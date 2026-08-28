// Prüft generierte Bilder gegen die Bild-Convention (wsd-social-images/SKILL.md §7)
// und schreibt manifest.json + LINKS.md mit den fertigen Roh-Links.
//
//   node scripts/check-images.mjs --file prompts/post-01-just-think.json
//   node scripts/check-images.mjs --strict     (Exit 1, wenn ein Bild durchfällt)

import fs from 'node:fs/promises';
import path from 'node:path';
import { readPromptFile, rawUrl, exists } from './lib.mjs';

const args = process.argv.slice(2);
const flag = n => args.includes(`--${n}`);
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 && args[i + 1] ? args[i + 1] : d; };

const FILE    = opt('file', 'prompts/post-01-just-think.json');
const OUTROOT = opt('out', 'out');
const REPO    = opt('repo', process.env.GITHUB_REPOSITORY || 'OWNER/REPO');
const BRANCH  = opt('branch', process.env.ASSET_BRANCH || 'social-assets');
const STRICT  = flag('strict');

// Grenzwerte — abgeleitet aus der Convention, nicht aus dem Bauch
const LIMITS = {
  footLuma: 0.10,   // untere 35 % müssen praktisch schwarz sein
  amberMin: 0.015,  // mindestens 1,5 % warme Pixel, sonst hat die Akzentfarbe keinen Halt
  contrastMin: 0.14 // Standardabweichung der Helligkeit
};

let sharp;
try { ({ default: sharp } = await import('sharp')); }
catch { console.error('sharp fehlt — npm install sharp'); process.exit(1); }

const cfg = await readPromptFile(FILE);
const outDir = path.join(OUTROOT, cfg.post);

async function analyse(file) {
  const meta = await sharp(file).metadata();
  const W = 200;
  const { data, info } = await sharp(file).resize(W).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  const footStart = Math.floor(height * 0.65);
  let footSum = 0, footN = 0, amber = 0, lumaSum = 0, lumaSq = 0, n = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255;
      const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      lumaSum += luma; lumaSq += luma * luma; n++;
      if (y >= footStart) { footSum += luma; footN++; }

      const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
      if (max > 0.35 && d / (max || 1) > 0.25) {
        let hue;
        if (max === r) hue = 60 * (((g - b) / d) % 6);
        else if (max === g) hue = 60 * ((b - r) / d + 2);
        else hue = 60 * ((r - g) / d + 4);
        if (hue < 0) hue += 360;
        if (hue >= 12 && hue <= 52) amber++;
      }
    }
  }

  const mean = lumaSum / n;
  return {
    width: meta.width, height: meta.height,
    ratio: +(meta.width / meta.height).toFixed(4),
    footLuma: +(footSum / footN).toFixed(4),
    amber: +(amber / n).toFixed(4),
    contrast: +Math.sqrt(Math.max(0, lumaSq / n - mean * mean)).toFixed(4),
  };
}

const rows = [], manifest = { post: cfg.post, title: cfg.title ?? null, branch: BRANCH, repo: REPO, generated_at: new Date().toISOString(), images: {} };
let failures = 0;

for (const img of cfg.images) {
  const rel = path.join(outDir, `${img.file}.png`);
  if (!await exists(rel)) continue;

  const a = await analyse(rel);
  const problems = [];
  if (Math.abs(a.ratio - 0.75) > 0.005) problems.push(`Format ${a.ratio} statt 0.75`);
  if (a.footLuma > LIMITS.footLuma)     problems.push(`Fusszone zu hell (${a.footLuma})`);
  if (a.amber < LIMITS.amberMin)        problems.push(`kaum warmes Licht (${(a.amber * 100).toFixed(1)} %)`);
  if (a.contrast < LIMITS.contrastMin)  problems.push(`flach (Kontrast ${a.contrast})`);
  if (problems.length) failures++;

  const rel1080 = path.join(outDir, '1080', `${img.file}.png`);
  const entry = {
    id: img.id, slug: img.slug, slide: img.slide ?? null, variant: img.variant ?? null,
    keywords: img.keywords, headline: img.headline ?? null,
    path: rel.split(path.sep).join('/'),
    url: rawUrl(REPO, BRANCH, rel),
    url_1080: await exists(rel1080) ? rawUrl(REPO, BRANCH, rel1080) : null,
    metrics: a,
    pass: problems.length === 0,
    problems,
  };
  manifest.images[img.id] = entry;
  rows.push(entry);
}

await fs.writeFile(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

// LINKS.md — zum Nachschlagen und Kopieren
const md = [
  `# ${cfg.post} — Bild-Links`,
  ``,
  `Branch \`${BRANCH}\` · erzeugt ${manifest.generated_at}`,
  ``,
  `| | id | Stichworte | Prüfung | Link |`,
  `|---|---|---|---|---|`,
  ...rows.map(r =>
    `| <img src="${r.url}" width="90"> | \`${r.id}\` | ${r.keywords.join(', ') || '—'} | ${r.pass ? 'ok' : r.problems.join('; ')} | [1080](${r.url_1080 ?? r.url}) · [2K](${r.url}) |`),
  ``,
  `## Roh-Links`,
  ``,
  '```',
  ...rows.map(r => `${r.id}  ${r.url_1080 ?? r.url}`),
  '```',
].join('\n');
await fs.writeFile(path.join(outDir, 'LINKS.md'), md);

// Konsole + GitHub Job Summary
const table = [
  `| id | Format | Fusszone | warmes Licht | Kontrast | Prüfung |`,
  `|---|---|---|---|---|---|`,
  ...rows.map(r => `| \`${r.id}\` | ${r.metrics.width}×${r.metrics.height} | ${r.metrics.footLuma} | ${(r.metrics.amber * 100).toFixed(1)} % | ${r.metrics.contrast} | ${r.pass ? 'ok' : '**' + r.problems.join('; ') + '**'} |`),
].join('\n');

console.log(`\n${rows.length} Bilder geprüft, ${failures} mit Beanstandung\n`);
console.log(table);

if (process.env.GITHUB_STEP_SUMMARY) {
  const preview = rows.map(r => `<img src="${r.url_1080 ?? r.url}" width="150" alt="${r.id}">`).join(' ');
  await fs.appendFile(process.env.GITHUB_STEP_SUMMARY,
    `## ${cfg.post}\n\n${preview}\n\n${table}\n\nAlle Links: \`${outDir}/LINKS.md\` auf Branch \`${BRANCH}\`\n\n`);
}

if (STRICT && failures) process.exit(1);
