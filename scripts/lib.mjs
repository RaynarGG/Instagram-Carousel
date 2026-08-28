// Gemeinsame Helfer für gen-images und check-images.
import fs from 'node:fs/promises';
import path from 'node:path';

export const TARGET_RATIO = 3 / 4;   // 0.75 — siehe wsd-social-images/SKILL.md §1

export async function readPromptFile(file) {
  const raw = JSON.parse(await fs.readFile(file, 'utf8'));
  if (!raw.post) throw new Error(`${file}: Feld "post" fehlt`);
  if (!Array.isArray(raw.images)) throw new Error(`${file}: Feld "images" fehlt oder ist kein Array`);
  const d = raw.defaults ?? {};
  const seen = new Set();
  const images = raw.images.map((img, i) => {
    const id = img.id ?? `i${i + 1}`;
    if (!img.prompt) throw new Error(`${file}: Bild "${id}" hat kein "prompt"`);
    if (seen.has(id)) throw new Error(`${file}: doppelte id "${id}"`);
    seen.add(id);
    const slug = img.slug ?? id;
    return {
      ...img,
      id,
      slug,
      keywords: img.keywords ?? [],
      file: `${id}-${slug}`,
      model: img.model ?? d.model ?? 'gemini-3.1-flash-image',
      aspect_ratio: img.aspect_ratio ?? d.aspect_ratio ?? '3:4',
      image_size: img.image_size ?? d.image_size ?? '2K',
      mime_type: img.mime_type ?? d.mime_type ?? 'image/png',
    };
  });
  return { ...raw, defaults: d, images };
}

// --only akzeptiert: id, slug, keyword, "slide:2" — mehrere per Komma, ODER-verknüpft.
export function matches(img, only) {
  if (!only) return true;
  return only.split(',').map(s => s.trim().toLowerCase()).filter(Boolean).some(t => {
    if (t.startsWith('slide:')) return String(img.slide) === t.slice(6);
    return img.id.toLowerCase() === t
      || img.slug.toLowerCase() === t
      || img.keywords.some(k => String(k).toLowerCase() === t);
  });
}

export function rawUrl(repo, branch, relPath) {
  const p = relPath.split(path.sep).join('/');
  return `https://raw.githubusercontent.com/${repo}/${branch}/${p}`;
}

export async function exists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

export const sleep = ms => new Promise(r => setTimeout(r, ms));
