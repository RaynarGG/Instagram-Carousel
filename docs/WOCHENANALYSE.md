# Wochenanalyse: was funktioniert, kommt in die Pipeline

Arbeitsanweisung für die wöchentliche Routine (sonntags abends, vor dem Montags-Post).
Ziel: aus den Zahlen der veröffentlichten Posts **konkrete Änderungen an den
Anweisungen** ableiten, damit mehr von dem gepostet wird, was funktioniert.

Ergebnis jeder Woche: ein Eintrag in **`docs/LERNEN.md`**, höchstens zwei Änderungen
an der Pipeline, ein Commit und eine kurze Nachricht an den Nutzer.

## 1 · Daten holen

Buffer, Organisation „My Organization“ (`6a8779ade464f4c50bd23b5a`).
Kanäle: Instagram `6a877a1dccaf649a67e5a18d` · TikTok `6aa1b8accd8b9c702c3b01a0` ·
YouTube `6a877a02ccaf649a67e59cab`.

- `list_posts` mit `status: ["sent"]`, `includeMetrics: true`, `first: 20`, sortiert nach `dueAt` absteigend.
  Die Antwort ist groß und landet in einer Datei: mit `jq` auswerten, nicht seitenweise lesen.
- Nur Posts, die **mindestens 48 h** draußen sind (Metriken laufen bis zu 24 h nach).
  Jüngere als „zu früh“ notieren.
- Zuordnung zu `posts/<nr>-<slug>.json` über den Caption-Anfang oder die Bild-URL (`out/<post>/…`).
- **Hinweise des Nutzers** (Swipe-Abbruch, Kommentare, Beobachtungen aus TikTok Studio /
  Instagram Insights) sind das stärkste Signal. Buffer liefert **keine** Swipe-Tiefe pro Slide.

## 2 · Kennzahlen lesen

Immer **relativ** vergleichen (mit dem Median der letzten Posts im selben Kanal), nie absolut.

| Signal | Was es misst | Wo man schraubt |
|---|---|---|
| TikTok-Aufrufe | stoppt der Daumen? Thema + Cover | Themenwahl, Cover-Headline, Bild 1 |
| Likes ÷ Aufrufe | hat die Geschichte getragen? | Slides 2 bis n, Pointe |
| Shares, Saves, Kommentare | will man es weitergeben / behalten? | Pointe, Mechanismus, Frage in der Caption |
| Ø Ansehzeit (TikTok) | grob, wie lange geblättert wird | unter 2 s: kaum jemand swiped über das Cover hinaus |
| Swipe-Abbruch pro Slide (nur vom Nutzer) | wo die Geschichte reißt | **die Slide, auf der abgebrochen wird** |

Fallen, die man kennen muss:
- **Ansehzeit ist kein Swipe-Maß.** Eine textlastige Slide erhöht sie, obwohl dort abgebrochen wird
  (Post 08: 13 s Ø, trotzdem Abbruch auf Slide 2). Nur zusammen mit der Textdichte lesen.
- **Instagram** hat derzeit eine Reichweite unter 25 pro Post: nicht interpretierbar. Notieren, nicht ableiten.
- **0 oder 1 Aufruf** auf TikTok heißt Auslieferungsfehler (Entwurf nicht abgeschickt, privat, Sperre),
  nicht schlechter Inhalt. Dem Nutzer melden, aus der Auswertung nehmen.

## 3 · Diagnose

Bester und schwächster auswertbarer Post der Woche (plus jeder Post mit Nutzerhinweis):
`posts/<x>.json` öffnen, die Slide ansehen, an der es hängt, und die Ursache **in einem Satz** benennen.
Konkret und mit Zitat der Slide, z. B. „Slide 2 zählt vier Versuchsbedingungen auf, bevor klar ist,
warum man weiterlesen soll“. Gegenprobe am besten Post: was macht der an dieser Stelle anders?

Danach die **offenen Tests** in `docs/LERNEN.md` prüfen: Haben neue Posts die Regel befolgt, und wie
schneiden sie gegen den Median ab? Bestätigt → „Regel“. Widerlegt → Änderung zurücknehmen.

## 4 · Änderungen an der Pipeline

- **Höchstens zwei Änderungen pro Woche.** Jede mit Beleg (Post, Zahl, Slide) in `docs/LERNEN.md`.
- Ein einzelner Ausreißer ist **keine** Regel, sondern eine Beobachtung. Ausnahme: der Nutzer bestätigt
  die Ursache (wie beim Swipe-Abbruch).
- Neue Regeln starten als **Test** und werden nach zwei, drei weiteren Posts bestätigt oder zurückgenommen.
- Wohin:
  - Text- und Ablaufregeln: `docs/TAGESABLAUF.md` (die Stelle ersetzen, nicht nur ergänzen, damit sich
    nichts widerspricht)
  - Format und Typografie: `docs/playbook-technology.md`
  - Layout-Probleme: Renderer oder `layout`-Felder, danach kostenlos rendern und prüfen
- **Nie ändern:** `CLAUDE.md` · `evidence`-Slide-Pflicht · „erfinden nie“ · 4:5 · Kostenregeln ·
  Buffer nur als Entwurf · keine API-Keys.
- **Nicht anfassen:** veröffentlichte Posts, Buffer-Posts, vorhandene Bilder (nichts neu generieren).
- Commit `Wochenanalyse KW <nn>: <Änderung>` und Push auf den vorgegebenen Branch. Die Post-Routine
  liest die Anweisungen beim nächsten Lauf.

## 5 · Nachricht an den Nutzer

Kurz, fürs Handy:
- Top und Flop der Woche (je eine Zahl)
- die Ursache in einem Satz
- was geändert wurde (oder warum nichts)
- Status der offenen Tests
- Auffälligkeiten (Auslieferungsfehler, doppelte Posts)
- eine Bitte, wenn Daten fehlen. Beispiel: „Bis zu welcher Slide wurde bei Post X geswiped?“
  Ein Screenshot aus TikTok Studio reicht.
