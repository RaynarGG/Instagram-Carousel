// Einmaliges Diagnose-Skript: listet die Modelle, die dieser API-Key sieht,
// optional gefiltert auf einen Namensteil. Kostet nichts (reiner GET, keine
// Generierung) — Ziel ist, echte Modellnamen zu verifizieren statt zu raten.
//
//   node scripts/list-veo-models.mjs           (Default-Filter: "veo")
//   node scripts/list-veo-models.mjs --filter flash
//   node scripts/list-veo-models.mjs --filter ""   (alle Modelle)

const args = process.argv.slice(2);
const fi = args.indexOf('--filter');
const FILTER = fi >= 0 ? args[fi + 1] : 'veo';

const KEY = process.env.GEMINI_API_KEY;
if (!KEY) { console.error('GEMINI_API_KEY ist nicht gesetzt.'); process.exit(1); }

const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', {
  headers: { 'x-goog-api-key': KEY },
});
if (!r.ok) { console.error(`models.list ${r.status}: ${(await r.text()).slice(0, 500)}`); process.exit(1); }
const json = await r.json();
const veo = FILTER ? (json.models ?? []).filter(m => new RegExp(FILTER, 'i').test(m.name)) : (json.models ?? []);
if (!veo.length) { console.log(`Keine Modelle mit "${FILTER}" im Namen gefunden.`); process.exit(0); }
for (const m of veo) {
  console.log(`\n${m.name}`);
  console.log(`  displayName: ${m.displayName ?? '—'}`);
  console.log(`  description: ${(m.description ?? '—').slice(0, 200)}`);
  console.log(`  supportedGenerationMethods: ${(m.supportedGenerationMethods ?? []).join(', ')}`);
}
