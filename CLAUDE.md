# Arbeitsanweisung für dieses Repo

## Was hier gebaut wird
Instagram-Karussells für den Psychology-Account. Pro Post zwei Dateien:
`posts/<x>.json` (die sechs Slides) und `prompts/post-<x>.json` (die Bildprompts).
Aufbau, Felder und Syntax stehen im README.

## Vor jedem Post lesen
- **`README.md` → „Redaktionelle Haltung"** — die Tonalität. Kurzfassung: Unterhaltung
  vor Präzision, der Hook gewinnt im Zweifel, zuspitzen ist erlaubt, **erfinden nicht**,
  und die `evidence`-Slide mit Journal, Jahr und Autoren ist in jedem Post Pflicht.
- **Skill `wsd-social-images`** — Bildformat, Schichtaufbau, die vier Archetypen,
  die Sieben-Block-Prompt-Formel. Kein Prompt ohne warme Amber-Lichtquelle und
  ohne schwarze Fusszone.
- **Skill `wsd-headline`** — Typografie und Headline-Look.

## Prüfen, bevor committet wird
```bash
node scripts/gen-images.mjs --file prompts/post-<x>.json --dry-run
```
Kostet nichts und findet kaputtes JSON sowie fehlende Bild-IDs. Jede `image`-Referenz
in `posts/<x>.json` muss eine `id` in der Prompt-Datei treffen.

## Nicht tun
- Keine API-Keys in Dateien, Commits oder Prompts. `GEMINI_API_KEY` lebt ausschliesslich
  als GitHub-Secret.
- Bilder nicht ohne Rückfrage neu generieren — jeder Call kostet Geld.
