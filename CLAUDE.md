# Arbeitsanweisung für dieses Repo

## Was hier gebaut wird
Instagram-Karussells für den Psychology-Account. Pro Post zwei Dateien:
`posts/<x>.json` (die Slides) und `prompts/post-<x>.json` (die Bildprompts,
eines pro Slide). Keine feste Slide-Anzahl und keine vorgeschriebene Abfolge —
der Post soll verständlich sein und unterhalten, alles andere folgt daraus.
Aufbau, Felder und Syntax stehen im README.

## Täglicher Ablauf
Wenn ein neuer Post gebaut werden soll: **`docs/TAGESABLAUF.md`** ist die
Arbeitsanweisung. Vier Schritte, nach jedem wird gestoppt und gefragt —
Thema · Texte · Rendering · Bildideen. Nicht weiterbauen,
bevor der Schritt freigegeben ist.

## Vor jedem Post lesen
- **`README.md` → „Redaktionelle Haltung"** — die Tonalität. Kurzfassung: Unterhaltung
  vor Präzision, der Hook gewinnt im Zweifel, zuspitzen ist erlaubt, **erfinden nicht**,
  und die Quelle steht in der **Caption**: die `Sources:`-Zeile mit Journal, Jahr
  und Autoren ist in jedem Post Pflicht. Eine `evidence`-Slide ist optional.
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
- **Das Seitenverhältnis nicht auf 3:4 zurückdrehen.** Slides sind 1080 × 1350 (4:5),
  weil die Instagram-API nichts Schmaleres als 0,80 automatisch veröffentlicht.
  Bildprompts bleiben 3:4. Begründung im README.
- Keine API-Keys in Dateien, Commits oder Prompts. `GEMINI_API_KEY` lebt ausschliesslich
  als GitHub-Secret.
- Bilder nicht ohne Rückfrage neu generieren — jeder Call kostet Geld.
