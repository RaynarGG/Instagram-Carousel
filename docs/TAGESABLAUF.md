# Tagesablauf: ein Post, vier Freigaben

Diese Datei ist die Arbeitsanweisung für die tägliche Session. Sie ist so
geschrieben, dass eine Session sie ohne Vorwissen abarbeiten kann.

## Grundregel

**Nach jedem der vier Schritte wird gestoppt und gefragt.** Nicht weiterbauen,
bevor der Schritt freigegeben ist. Lieber eine Rückfrage zu viel als ein fertiger
Post, dessen Hook nicht sitzt — alles nach Schritt 2 hängt am Hook.

Am Handy gelesen heisst: **kurz halten.** Keine Volltext-Prompts in die Frage,
keine Absätze, die man scrollen muss.

---

## Vorher lesen

| Datei | Wofür |
|---|---|
| `README.md` → „Redaktionelle Haltung" | Tonalität: Unterhaltung vor Präzision, Hook gewinnt, zuspitzen ja / erfinden nein, `evidence`-Slide Pflicht |
| `docs/playbook-technology.md` | Farbregel, Slide-Grammatik, Caption-Formel, Unsicherheits-Mechanik |
| Skill `wsd-social-images` | Bildformat, Archetypen, Sieben-Block-Prompt-Formel |
| Skill `wsd-headline` | Typografie |
| `posts/*.json` | was schon gepostet wurde — **keine Dubletten** |

---

## Schritt 1 · Thema

Vier Kandidaten suchen. Jeder braucht:

- eine **echte, auffindbare Primärquelle** (Journal, Jahr, Autoren) — vor dem
  Vorschlagen per Websuche gegenprüfen, nicht aus dem Gedächtnis behaupten
- **eine Zahl**, die als Slide 3 alleine tragen könnte
- etwas **Kontraintuitives**. „Schlaf ist wichtig" ist kein Thema.

Nicht vorschlagen, was in `posts/` schon liegt.

**→ FRAGEN: welches Thema?** Vier Optionen, je zwei Sätze plus die Zahl.

---

## Schritt 2 · Hook und Cover

Drei bis vier Hook-Varianten für Slide 1. Regeln aus dem Playbook:

- **konkret = Akzent** (`[Klammern]`) — Zahlen, Namen, Substantive
- **verbindend = weiss** — Verben, Präpositionen, Füllwörter
- **keine Zeile einfarbig**, sonst zieht das Auge nicht weiter
- die Headline ist die ganze Nachricht, kein Teaser, keine Frage
- 2–4 Zeilen; kürzere Zeilen setzen grösser, der Renderer skaliert automatisch
- Vorsicht bei `Q` und `(`,`)` — Unterlängen stossen in die nächste Zeile

Die Varianten **rendern**, nicht beschreiben:

```bash
CHROME_PATH=$(ls -d /opt/pw-browsers/chromium-*/chrome-linux/chrome | head -1)
CHROME_PATH="$CHROME_PATH" node scripts/render-slides.mjs --post <x> --out /tmp/preview
```

**→ FRAGEN: welcher Hook?** Mit den gerenderten Bildern.

---

## Schritt 3 · Die restlichen fünf Slides und die Caption

`posts/<x>.json` fertig bauen: `facts` · `stat` · `evidence` · `stat` · `cta`.

- Slide 2 ist ein **neuer, engerer Hook** — nie eine Wiederholung des Covers
- Slide 4 `evidence` mit Journal, Jahr, Autoren. **Pflicht in jedem Post.**
- Slide 6 `cta`: Positionierungs-Aussage, keine Aufforderung. **App-Hinweis nur
  bei etwa jedem dritten Post** — sonst kippt der Kanal ins Werbliche.
- `caption` nach der 6-Block-Formel: kern · detail · kontext · frage ·
  **sources** · genau 5 Hashtags. Die `Sources:`-Zeile ist der Unterschied
  zwischen Quelle und Meme-Account.

**→ FRAGEN: Slides und Caption so?** Gerendert zeigen.

---

## Schritt 4 · Bildideen

`prompts/post-<x>.json` mit 11 Bildern bauen (a/b-Varianten). Jeder Prompt nach
der Sieben-Block-Formel, **immer** mit warmer Amber-Lichtquelle und schwarzer
Fusszone in den unteren 40 %.

Das Bild darf die Headline **nicht bebildern**. Es zeigt den Ort, an dem es
passiert ist — leerer, grösser oder unheimlicher als erwartet.

**Keine benannte reale Person generieren.** Wenn eine konkrete Person behauptet
wird, braucht es ein echtes Foto; ein generiertes Porträt behauptet etwas über
einen echten Menschen.

**→ FRAGEN: Bildideen so?** Eine Zeile pro Bild, nicht der Volltext-Prompt.

---

## Danach

```bash
node scripts/gen-images.mjs --file prompts/post-<x>.json --dry-run
```

Committen, pushen. Der Push-Trigger leitet den Post aus den geänderten Dateien
ab und generiert die **fehlenden** Bilder.

**Bilder nie ohne Rückfrage neu generieren — jeder Call kostet Geld.**
Im Zweifel erst `only: cover`, ein Call statt elf.
