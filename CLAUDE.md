# Arbeitsanweisung für dieses Repo

## Was hier gebaut wird
Instagram-Karussells für den Psychology-Account. Pro Post zwei Dateien:
`posts/<x>.json` (die sechs Slides) und `prompts/post-<x>.json` (die Bildprompts).
Aufbau, Felder und Syntax stehen im README.

## Täglicher Ablauf
Wenn ein neuer Post gebaut werden soll: **`docs/TAGESABLAUF.md`** ist die
Arbeitsanweisung. Vier Schritte, nach jedem wird gestoppt und gefragt —
Thema · Hook · restliche Slides und Caption · Bildideen. Nicht weiterbauen,
bevor der Schritt freigegeben ist.

## Vor jedem Post lesen
- **`README.md` → „Redaktionelle Haltung"** — die Tonalität. Kurzfassung: Unterhaltung
  vor Präzision, der Hook gewinnt im Zweifel, zuspitzen ist erlaubt, **erfinden nicht**,
  und die `evidence`-Slide mit Journal, Jahr und Autoren ist in jedem Post Pflicht.
- **Skill `wsd-social-images`** — Bildformat, Schichtaufbau, die vier Archetypen,
  die Sieben-Block-Prompt-Formel. Kein Prompt ohne warme Amber-Lichtquelle und
  ohne schwarze Fusszone.
- **Skill `wsd-headline`** — Typografie und Headline-Look.
- **`docs/playbook-technology.md`** — das Vorbild-Format: Farbregel
  (konkret = Akzent, verbindend = weiss, keine Zeile einfarbig),
  Slide-Grammatik, Caption-Formel mit Pflicht-`Sources:`-Zeile.

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
