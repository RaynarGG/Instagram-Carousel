// Einmaliges Diagnose-Skript: listet die Modelle, die dieser API-Key sieht,
// gefiltert auf "veo" im Namen. Kostet nichts (reiner GET, keine Generierung)
// — Ziel ist herauszufinden, welches Modell tatsaechlich generateAudio
// unterstuetzt, statt weiter Modellnamen zu raten (veo-3.1-generate-preview
// lehnt es nachweislich ab, sowohl bei Bild- als auch bei Text-zu-Video).
//
//   node scripts/list-veo-models.mjs

const KEY = process.env.GEMINI_API_KEY;
if (!KEY) { console.error('GEMINI_API_KEY ist nicht gesetzt.'); process.exit(1); }

const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', {
  headers: { 'x-goog-api-key': KEY },
});
if (!r.ok) { console.error(`models.list ${r.status}: ${(await r.text()).slice(0, 500)}`); process.exit(1); }
const json = await r.json();
const veo = (json.models ?? []).filter(m => /veo/i.test(m.name));
if (!veo.length) { console.log('Keine Modelle mit "veo" im Namen gefunden.'); process.exit(0); }
for (const m of veo) {
  console.log(`\n${m.name}`);
  console.log(`  displayName: ${m.displayName ?? '—'}`);
  console.log(`  description: ${(m.description ?? '—').slice(0, 200)}`);
  console.log(`  supportedGenerationMethods: ${(m.supportedGenerationMethods ?? []).join(', ')}`);
}
