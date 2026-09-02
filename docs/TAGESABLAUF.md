# Tagesablauf: ein Post, vier Freigaben

Arbeitsanweisung für die Session, die montags und freitags läuft. So geschrieben,
dass sie ohne Vorwissen abgearbeitet werden kann.

## Wo das läuft — und warum nicht in einer frischen Session

Die Routine ist an **eine bestehende Session gebunden** (`persistent_session_id`),
nicht auf „bei jedem Feuern eine neue Session" gestellt. Das ist kein Detail,
sondern die Voraussetzung dafür, dass der Ablauf überhaupt funktioniert.

Der erste Versuch lief mit `create_new_session_on_fire`. Die so gestarteten
Sessions kamen mit **zwei** fehlenden Dingen hoch:

| | frische Session | gebundene Session |
|---|---|---|
| Repo (`sources`) | leer | ausgecheckt, mit Push-Recht |
| MCP-Server | keine | github, Buffer |

Ohne Repo kein Commit und kein Push. Ohne MCP kein Buffer-Entwurf. Der Lauf
scheitert also zwangsläufig — und zwar erst am Ende, nachdem die teure Recherche
schon gelaufen ist. Der Testlauf hat auf diese Weise 12,92 $ verbrannt, ohne ein
einziges verwertbares Ergebnis.

**Beim Anlegen eines Triggers erscheint eine Warnung**, dass keine Connectors
mitgegeben werden. Die ist ernst zu nehmen. Bei einer gebundenen Session ist sie
gegenstandslos, weil in eine Unterhaltung gefeuert wird, die ihre Werkzeuge schon
hat.

Zwei Folgen, die man kennen muss:

- **Das Modell der Routine lässt sich nicht frei wählen.** Eine gebundene Session
  behält ihr eigenes Modell. Der `model`-Parameter am Trigger greift nur bei
  frischen Sessions.
- **Die Bindung hängt an dieser einen Session.** Wird sie archiviert, feuert die
  Routine ins Leere. Dann eine neue Session mit dem Repo öffnen und den Trigger
  mit deren ID neu anlegen.

Wer den Weg über frische Sessions doch will, muss das Repo am **Environment**
hinterlegen — nicht am Trigger. Ein `source_url` beim Anlegen einer Session per
`create_session` funktioniert nachweislich; ein Trigger kennt diesen Parameter
aber nicht.

---

## Grundregel

**Nach jedem der vier Schritte wird gestoppt und gefragt.** Nicht weiterbauen,
bevor der Schritt freigegeben ist.

| | Freigabe | Was geprüft wird |
|---|---|---|
| 1 | Thema | die Aussage und die Quelle |
| 2 | Texte | Hook, alle Slides, Caption — **was** dasteht |
| 3 | Rendering | **wie** es auf der Fläche sitzt: Position, Verteilung, Umbruch |
| 4 | Bildideen | ein Satz pro Bild |

Die Trennung von 2 und 3 ist Absicht: erst muss die Aussage stimmen, danach sitzt
sie richtig. Schritt 3 kostet nichts — er läuft ohne generierte Bilder.

Der Nutzer liest das **am Handy**. Jede Frage kurz halten: keine Absätze zum
Scrollen, keine Volltext-Prompts, keine langen Tabellen. Für Fragen
`AskUserQuestion` mit konkreten Optionen, für gerenderte Slides `SendUserFile`.

Bleibt eine Antwort aus: **warten.** Ein unbeantwortetes Gate ist kein Grund
weiterzubauen.

---

## Vorher lesen

| Datei | Wofür |
|---|---|
| `README.md` → „Redaktionelle Haltung" | Unterhaltung vor Präzision, zuspitzen ja / erfinden nein |
| `README.md` → „Seitenverhältnis" | **4:5, nicht 3:4** — und warum |
| `docs/playbook-technology.md` | Farbregel, Slide-Grammatik, Caption-Formel |
| Skill `wsd-social-images` | Bildformat, Archetypen, Sieben-Block-Prompt-Formel |
| Skill `wsd-headline` | Typografie |
| `posts/*.json` | was schon gepostet wurde — **keine Dubletten** |

---

## Schritt 1 · Thema

Vier Kandidaten. Jeder braucht:

- eine **echte Primärquelle** (Journal, Jahr, Autoren) — **per Websuche gegenprüfen**,
  nicht aus dem Gedächtnis behaupten
- **eine Zahl**, die eine Slide alleine tragen könnte
- etwas **Kontraintuitives**. „Schlaf ist wichtig" ist kein Thema.

**→ FRAGEN: welches Thema?** Vier Optionen, je zwei Sätze plus die Zahl.

---

## Schritt 2 · Die Texte

Erst der Hook, dann die übrigen Slides und die Caption. Hier geht es **nur um die
Aussage**, noch nicht darum, wie sie sitzt.

### Wie viele Slides

**Drei bis sieben.** Die Länge folgt dem Thema, nicht einem Schema.

Pflicht in jedem Post:
- **`cover`** — der Hook
- **`cta`** — Positionierungs-Aussage, keine Aufforderung

Die **Quelle steht in der Caption**, nicht auf einer Slide. Die `Sources:`-Zeile
mit Journal, Jahr und Autoren ist in jedem Post Pflicht — sie ist der Beleg.
Eine `evidence`-Slide ist **optional**: nimm sie, wenn der Beleg selbst
sehenswert ist (ein markiertes Paper, ein Screenshot), sonst spar dir die Slide
und nutz den Platz für Inhalt.

Dazwischen, so viele wie das Thema trägt:
- **`facts`** — Headline plus Bullets, der Informationsträger
- **`stat`** — Headline plus eine Zeile, für die grosse Zahl
- **`evidence`** — der Quellenblock, wenn er als Slide etwas beiträgt

Faustregel: **eine Zahl trägt drei bis vier Slides, eine Geschichte trägt sechs
bis sieben.** Lieber vier starke als sieben mit Füllmaterial. Wenn eine Slide nur
wiederholt, was die vorige schon gesagt hat, gehört sie raus.

### Regeln für die Texte

- **konkret = Akzent** (`[Klammern]`) — Zahlen, Namen, Substantive
- **verbindend = weiss** — Verben, Präpositionen, Füllwörter
- **keine Zeile einfarbig**, sonst zieht das Auge nicht weiter
- die Headline ist die ganze Nachricht, kein Teaser, keine Frage
- Slide 2 ist ein **neuer, engerer Hook** — nie eine Wiederholung des Covers
- `cta`: **App-Hinweis nur bei etwa jedem dritten Post**, sonst kippt es ins Werbliche
- `caption` nach der 6-Block-Formel: kern · detail · kontext · frage ·
  **sources** · genau 5 Hashtags. Die `Sources:`-Zeile ist der Beleg des Posts
  und damit **nicht verhandelbar** — sie trägt Journal, Jahr und Autoren.
- **`alt` pro Slide** — ein Satz, Motiv plus Headline. Buffer verlangt ihn später;
  wer ihn hier nicht schreibt, erfindet ihn am Ende neu.

**→ FRAGEN: Texte so?** Hook mit drei bis vier Varianten zur Auswahl, der Rest
als kurze Liste. Noch nichts rendern.

---

## Schritt 3 · Das fertige Rendering

Alle Slides rendern und **als Bild schicken**. Geprüft wird, wie der Text auf der
Fläche sitzt.

```bash
CHROME_PATH=$(ls -d /opt/pw-browsers/chromium-*/chrome-linux/chrome | head -1)
CHROME_PATH="$CHROME_PATH" node scripts/render-slides.mjs --post <x> --out /tmp/preview
```

Läuft **ohne generierte Bilder** — die Bildzone zeigt dann „BILD FEHLT".

### Das Seitenverhältnis ist nicht verhandelbar

`posts/*.json` steht auf **1080 × 1350 (4:5)**. Nicht auf 3:4 ändern: die
Instagram-API lehnt 0,75 beim automatischen Veröffentlichen ab. Die Bildprompts
bleiben bei `3:4` — ihre schwarze Fusszone fängt die Differenz ab. Begründung im
README.

### Die Stellschrauben

Der Text ist **unten angeschlagen** und wächst nach oben. Die Schriftgrösse wird
gesucht, bis **entweder** die Breite **oder** `headMax` erreicht ist.

| Schraube | Wo | Wirkung |
|---|---|---|
| **Zeilenumbruch** | jeder Array-Eintrag in `headline` = eine Zeile | die stärkste Schraube, meist die einzige nötige |
| `layout.headMax` | pro Slide | Höhendeckel. **Wirkt nur, wenn die Höhe begrenzt** |
| `layout.photo` | pro Slide | wie weit die Bildzone reicht und wo der Verlauf einsetzt |
| `padding` | pro Post, Default `0.045` | Seitenabstand |
| `maxFontSize` | pro Post, Default `240` | Deckel nach oben |

Defaults je Typ: `cover` 0,72/0,30 · `facts` 0,50/0,15 · `stat` 0,72/0,22 ·
`evidence` 1,00/0,20 · `cta` 1,00/0,28 (`photo`/`headMax`).

**`headMax` tut bei ein bis zwei Zeilen nichts** — dort begrenzt die Breite.
Gemessen: zwei lange Zeilen mit `headMax` 0,22 gegen 0,30 ergeben ein
bitidentisches Bild. Erst ab drei, vier kurzen Zeilen greift es.

**`facts` braucht meist `layout.photo: 0.62`** — der Typ-Default 0,50 lässt ein
leeres Band zwischen Bild und Headline stehen.

### Worauf zu achten ist

- **Unterlängen.** `Q`, `(`, `)` stossen in die Zeile darunter. Im Zweifel das
  Wort tauschen — `=` statt `EQUALS`.
- **Erzwungene Umbrüche.** Lange Wörter brechen am Bindestrich (`META-ANALYTIC`
  wurde zu `META-` / `ANALYTIC`). Kürzen.
- **Zu volle oder zu leere Textzone.** Zeilen anders umbrechen.

**→ FRAGEN: sitzt der Text so?** Bei Beanstandungen nachjustieren und erneut zeigen.

---

## Schritt 4 · Bildideen

`prompts/post-<x>.json` bauen: **ein Bild pro Slide**, Variante `a`. Die
b-Varianten sind Alternativen und werden nur nachgelegt, wenn ein Bild danebengeht
— sie kosten sonst nur Geld.

Jeder Prompt nach der Sieben-Block-Formel, **immer** mit warmer Amber-Lichtquelle
und schwarzer Fusszone in den unteren 40 %.

Das Bild darf die Headline **nicht bebildern**. Es zeigt den Ort, an dem es
passiert ist — leerer, grösser oder unheimlicher als erwartet.

**Keine benannte reale Person generieren.** Wird eine konkrete Person behauptet,
braucht es ein echtes Foto; ein generiertes Porträt behauptet etwas über einen
echten Menschen. Gesichter abwenden, Negativliste um `no recognisable face,
not a celebrity, no identifiable person` ergänzen.

**→ FRAGEN: Bildideen so?** Ein Satz pro Bild, nicht der Volltext-Prompt.

---

## Danach — ohne weitere Freigabe

### 1 · Prüfen und committen

```bash
node scripts/gen-images.mjs --file prompts/post-<x>.json --dry-run
```

Committen und pushen. Der Push-Trigger leitet den Post über die GitHub-API aus den
geänderten Dateien ab und generiert die **fehlenden** Bilder.

### 2 · Den Lauf wirklich prüfen

**Grün heisst nicht fertig.** Der Workflow war schon zweimal grün und hat dabei
alles übersprungen. Nach dem Lauf nachsehen, ob die Dateien auf `social-assets`
tatsächlich neu sind:

```bash
git fetch origin social-assets -q
git ls-tree -r origin/social-assets --name-only | grep <post>
```

### 3 · Buffer-Entwurf anlegen

Kanal `whatshouldido.app` (Instagram Business) in der Organisation
„My Organization". Der Post wird **als Entwurf** angelegt, nie veröffentlicht und
nie in die Queue geschoben — das entscheidet der Nutzer.

Drei Fallstricke, alle schon einmal zugeschlagen:

- **Bild-URLs an den Commit hängen**, nicht an den Branch:
  `raw.githubusercontent.com/RaynarGG/Instagram-Carousel/<sha>/out/...`
  Bei gleichbleibender Branch-URL liefert Buffer sonst die alte, gecachte Datei.
- **Bei `edit_post` immer `saveToDraft: true` mitgeben.** Weglassen setzt den
  Entwurf auf „geplant", obwohl die Doku etwas anderes behauptet.
- **`altText` ist Pflicht** pro Bild — kommt aus dem `alt`-Feld der Slide.

Danach dem Nutzer melden: Post-ID, Anzahl Slides, Status `draft`.

---

## Kosten

Jedes Bild ist ein bezahlter API-Call.

- **Nie ohne Rückfrage generieren.**
- Im Zweifel erst `only: s1a` — ein Call statt sieben.
- `--dry-run` zeigt die Auswahl, ohne etwas zu kosten.
- `neu_generieren` bleibt aus; vorhandene Bilder werden übersprungen.
