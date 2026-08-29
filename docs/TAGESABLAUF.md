# Tagesablauf: ein Post, vier Freigaben

Diese Datei ist die Arbeitsanweisung für die tägliche Session. Sie ist so
geschrieben, dass eine Session sie ohne Vorwissen abarbeiten kann.

## Grundregel

**Nach jedem der vier Schritte wird gestoppt und gefragt.** Nicht weiterbauen,
bevor der Schritt freigegeben ist.

| | Freigabe | Was geprüft wird |
|---|---|---|
| 1 | Thema | die Aussage und die Quelle |
| 2 | Texte | Hook, alle sechs Slides, Caption — **was** dasteht |
| 3 | Rendering | **wie** es auf der Fläche sitzt: Position, Verteilung, Umbruch |
| 4 | Bildideen | ein Satz pro Bild |

Die Trennung von 2 und 3 ist Absicht: erst muss die Aussage stimmen, danach
sitzt sie richtig. Wer beides in einem Schritt prüft, prüft am Ende keins von
beidem sauber. Schritt 3 kostet nichts — er läuft ohne generierte Bilder.

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

## Schritt 2 · Die Texte

Erst der Hook für Slide 1, dann die Texte aller sechs Slides und die Caption.
In diesem Schritt geht es **nur um die Aussage**, noch nicht darum, wie sie sitzt.

Regeln aus dem Playbook:

- **konkret = Akzent** (`[Klammern]`) — Zahlen, Namen, Substantive
- **verbindend = weiss** — Verben, Präpositionen, Füllwörter
- **keine Zeile einfarbig**, sonst zieht das Auge nicht weiter
- die Headline ist die ganze Nachricht, kein Teaser, keine Frage
- Slide 2 ist ein **neuer, engerer Hook** — nie eine Wiederholung des Covers
- Slide 4 `evidence` mit Journal, Jahr, Autoren. **Pflicht in jedem Post.**
- Slide 6 `cta`: Positionierungs-Aussage, keine Aufforderung. **App-Hinweis nur
  bei etwa jedem dritten Post** — sonst kippt der Kanal ins Werbliche.
- `caption` nach der 6-Block-Formel: kern · detail · kontext · frage ·
  **sources** · genau 5 Hashtags. Die `Sources:`-Zeile ist der Unterschied
  zwischen Quelle und Meme-Account.

**→ FRAGEN: Texte so?** Hook mit drei bis vier Varianten zur Auswahl, der Rest
als kurze Liste. Noch nichts rendern.

---

## Schritt 3 · Das fertige Rendering

Jetzt alle sechs Slides rendern und zeigen. Geprüft wird hier **nicht mehr der
Text, sondern wie er auf der Fläche sitzt**: Position, Verteilung, Umbruch,
Grössenverhältnis zwischen Bildzone und Textzone.

```bash
CHROME_PATH=$(ls -d /opt/pw-browsers/chromium-*/chrome-linux/chrome | head -1)
CHROME_PATH="$CHROME_PATH" node scripts/render-slides.mjs --post <x> --out /tmp/preview
```

Das läuft auch **ohne generierte Bilder** — die Bildzone zeigt dann „BILD FEHLT".
Genau deshalb kommt dieser Schritt vor den Bildern: Layout prüfen kostet nichts.

### Die Stellschrauben

Der gesamte Text ist **unten angeschlagen** (`justify-content:flex-end`) und
wächst nach oben. Die Schriftgrösse wird pro Zeile automatisch gesucht, bis
entweder die Breite oder `headMax` erreicht ist.

| Schraube | Wo | Wirkung |
|---|---|---|
| **Zeilenumbruch** | jeder Array-Eintrag in `headline` = eine Zeile | die stärkste Schraube, und meist die einzige, die man braucht |
| `layout.headMax` | pro Slide, überschreibt den Typ-Default | Höhendeckel des Headline-Blocks. **Wirkt nur, wenn die Höhe begrenzt** |
| `layout.photo` | pro Slide | wie weit die Bildzone reicht; steuert auch, wo der Verlauf ins Schwarze einsetzt |
| `padding` | einmal pro Post, Default `0.045` | Seitenabstand. Kleiner = mehr Platz = grössere Schrift |
| `maxFontSize` | einmal pro Post, Default `240` | Deckel nach oben |

### Warum `headMax` oft nichts tut

Die Schriftgrösse wird gesucht, bis **entweder** die Breite **oder** `headMax`
erreicht ist — was zuerst kommt, gewinnt. Gemessen an einer `stat`-Slide:

| Headline | `headMax` 0,22 → 0,30 |
|---|---|
| zwei lange Zeilen (`[50%] BETTER ODDS` / `OF [STAYING ALIVE]`) | **kein Unterschied**, Bild bitidentisch — die Breite begrenzt |
| vier kurze Zeilen (`[50%]` / `BETTER` / `ODDS OF` / `[STAYING ALIVE]`) | Bild ändert sich — die Höhe begrenzt |

Praktisch heisst das: **bei ein bis zwei Zeilen ist der Umbruch die einzige
Schraube.** Wer dort mehr Grösse will, teilt anders um oder senkt `padding`.
`headMax` lohnt erst ab drei, vier Zeilen.

Default-Werte pro Slide-Typ:

| Typ | `photo` | `headMax` |
|---|---|---|
| `cover` | 0,72 | 0,30 |
| `facts` | 0,50 | 0,15 |
| `stat` | 0,72 | 0,22 |
| `evidence` | 1,00 | 0,20 |
| `cta` | 1,00 | 0,28 |

Überschreiben sieht so aus:

```json
{ "n": 3, "type": "stat", "image": "s3a",
  "layout": { "headMax": 0.26, "photo": 0.68 },
  "headline": ["[50%] BETTER ODDS", "OF [STAYING ALIVE]"] }
```

### Worauf zu achten ist

- **Unterlängen.** `Q`, `(`, `)` stossen in die Zeile darunter. Der Renderer
  federt das über die `desc`-Regel ab, bei sehr grosser Schrift reicht das nicht.
  Im Zweifel das Wort austauschen — `=` statt `EQUALS`.
- **Erzwungene Umbrüche.** Lange Wörter wie `META-ANALYTIC` brechen am
  Bindestrich und sehen gebrochen aus. Kürzen.
- **Zu volle Textzone.** Wenn die Headline bis an die Kopfzeile stösst, ist
  `headMax` zu gross oder es sind zu viele Zeilen.
- **Zu leere Textzone.** Zwei kurze Zeilen auf einer `cover`-Slide lassen unten
  viel Luft. Entweder eine Zeile mehr, oder `headMax` runter.

**→ FRAGEN: sitzt der Text so?** Die gerenderten Slides als Bild schicken, nicht
beschreiben. Bei Beanstandungen nachjustieren und erneut zeigen.

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
