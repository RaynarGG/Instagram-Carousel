# Tagesablauf: ein Post, alleine gebaut

Arbeitsanweisung für die Session, die montags und freitags läuft. Der Post wird
**ohne Zwischenfreigaben** fertig gebaut und in Canva abgelegt. Der Nutzer
bekommt am Ende **eine** kurze Nachricht und entscheidet dann über Bilder-Neuwürfe,
Änderungen und die Veröffentlichung.

Der Nutzer liest am **Handy**: Nachricht kurz halten, keine Volltext-Prompts,
keine langen Tabellen. Dateien mit `SendUserFile`.

**Nur stoppen und fragen, wenn:** ein Schritt scheitert und sich nicht selbst
lösen lässt · zwei Themen gleich gut sind und das Thema nicht belegbar ist ·
etwas Geld kosten würde, das nicht in diesem Ablauf steht.

## Vorher lesen

**`docs/LERNEN.md`** (was laut Zahlen funktioniert; Regeln dort gelten) · `README.md` → „Redaktionelle Haltung" und „Seitenverhältnis" · `docs/playbook-technology.md`
· Skills `wsd-social-images` (Bild-Prompts) und `wsd-headline` (Typografie) · `posts/*.json`
(keine Dubletten).

## 1 · Thema wählen

Vier Kandidaten prüfen, **einen** nehmen. Jeder braucht:

- eine **echte Primärquelle** (Journal, Jahr, Autoren), **per Websuche gegengeprüft**,
  nicht aus dem Gedächtnis
- **eine Zahl**, die eine Slide alleine tragen kann
- etwas **Kontraintuitives**
- **News-Register:** „3 Forscher fanden heraus …“, keine Allgemeinwissen-Behauptung

## 2 · Texte

Erst der Hook, dann die übrigen Slides und die Caption. Drei bis sieben Slides,
Länge folgt dem Thema. Zuspitzen ja, **erfinden nie**.

- **Keine `facts`-Slides.** Die Slides erzählen die Geschichte (`cover`, `stat`, `evidence`, `cta`).
- **Cover:** Hook, der Sub verrät die Pointe nicht.
- **Slide 2 ist eine Szene, kein Methodenteil** (`docs/LERNEN.md` T1): Menschen, Ort, Handlung, endet mit
  offener Spannung, die Slide 3 auflöst. Body ≤ ~30 Wörter, ≤ 2 Zahlen. Bedingungen, Stichprobe, Jahr,
  Ablaufdetails später, auf die `evidence`-Slide oder in die Caption. Prüffrage: Will jemand, der nur
  Slide 2 sieht, wissen, wie es ausgeht?
- Wo es sie gibt: eine **kurze psychologische Erklärung** (Mechanismus, nicht nur Ergebnis).
- Körpertext **erzählend und fesselnd**, Rehooks, verständlich. Was eine Slide nur wiederholt, fliegt raus.
- **`evidence`-Slide** mit Journal, Jahr, Autoren: Pflicht.
- Letzte Slide: ruhige Positionierung („wir posten wöchentlich Psychologie-Studien“), keine Aufforderung. App-Hinweis nur bei jedem dritten Post.
- Farbregel: konkret = Akzent `[Klammern]`, verbindend = weiß, **keine Zeile einfarbig**.
- `caption`: kern · detail · kontext · frage · **`Sources:`-Zeile** · genau 5 Hashtags.
- **`alt` pro Slide**, ein Satz.

Dateien: `posts/<nr>-<slug>.json` und `prompts/post-<nr>-<slug>.json` (ein Bild pro
Slide, Variante `a`, Sieben-Block-Formel, Amber-Licht, schwarze Fusszone; Aufbau im README).
Echte Personen dürfen im Bild vorkommen.

## 3 · Video-Text-Bild und Videorecherche (gleich zu Beginn schicken)

Der Nutzer schneidet das Video selbst. Er bekommt von dir:

**a) Das Text-Bild** (1080 × 1920, Text unten, oben Platz fürs Video), Deutsch und Englisch:

```bash
# videos/<post>/text.json schreiben (Format: Kopf von scripts/render-video-text.mjs), dann:
CHROME_PATH=$(ls -d /opt/pw-browsers/chromium-*/chrome-linux/chrome | head -1) \
  node scripts/render-video-text.mjs --spec videos/<post>/text.json
```

Regeln für den Text (Vorbild `videos/03-honest-placebo/text.json`):
- **Hook sofort:** die ersten vier, fünf Zeilen tragen die Pointe („… Trotzdem ging es ihnen besser.“), Doppelpunkte statt Nebensätze.
- **Kein Zitieren der Forscher im Fließtext** (Harvard, Namen, Skalennamen): das zerstört Lesefluss und Spannung. Das gehört in die Caption.
- Wortlaut des Nutzers nicht umschreiben, nur straffen. Emojis lassen sich in Anton nicht setzen (Nutzer legt Sticker).
- Body ≤ 12 Zeilen. Die Ausgabe warnt, wenn der Text tiefer als 86 % der Höhe endet: dann kürzen.
- Ergebnis prüfen (Bild ansehen), dann mit `SendUserFile` schicken.

**b) Passende Videos recherchieren** (Websuche): 3 bis 5 Kandidaten zum Thema, je
Link, was man sieht (ein Satz), Lizenz oder Quelle (Pexels, Pixabay, Archive.org,
Wikimedia, YouTube CC …). Nur prüfen und verlinken, **nicht herunterladen und nicht
zuschneiden**. Liste als `videos/<post>/README.md` ablegen und in der Nachricht nennen.

## 4 · Rendern, prüfen, Bilder

```bash
CHROME_PATH=$(ls -d /opt/pw-browsers/chromium-*/chrome-linux/chrome | head -1) \
  node scripts/render-slides.mjs --post <x> --out /tmp/preview    # kostenlos, ohne Bilder
node scripts/gen-images.mjs --file prompts/post-<x>.json --dry-run   # findet kaputtes JSON, fehlende IDs
```

Slides: **1080 × 1350 (4:5), nicht auf 3:4 zurückdrehen** (die Instagram-API lehnt 0,75 ab; die Bildprompts
bleiben 3:4, ihre schwarze Fusszone fängt die Differenz ab). Auf Unterlängen (`Q`, `(`), erzwungene
Umbrüche und zu volle Textzonen achten; Stellschrauben sind Zeilenumbruch, `layout.headMax`, `layout.photo`.

Committen und pushen (nur auf den vorgegebenen Branch). Der Push auf `prompts/**` startet
`social-images.yml` und generiert die **fehlenden** Bilder. Das ist die **einzige** Stelle, die Geld
kostet, und sie ist für einen neuen Post ausdrücklich freigegeben.

**Grün heißt nicht fertig.** Nach dem Lauf prüfen, ob die Dateien auf `social-assets` neu sind:

```bash
git fetch origin social-assets -q && git ls-tree -r origin/social-assets --name-only | grep <post>
```

Fehlen Bilder (429 = Guthaben leer, Sicherheitsfilter): melden, **nichts wiederholen**.

## 5 · Canva

Fertigen Post nach Canva legen, damit der Nutzer dort weiterbearbeitet:

```bash
node scripts/export-canva-html.mjs --post <x> --out canva --image-base <raw-URL-mit-SHA> --images "s1a=...,s2a=..."
```

Die HTML-Datei committen, dann Canva `import-design-from-url` mit der `raw.githubusercontent.com`-URL
(**SHA-gepinnt**, nicht Branch). Danach `read-design` und auf **Überlauf** prüfen: Canva setzt Anton und
Figtree breiter als Chromium, deshalb Reserve lassen; abgeschnittene Zeilen mit `edit-design` korrigieren.
Der `commit` einer `edit-design`-Transaktion erfolgt erst nach Nutzerfreigabe. Link zum Design in die Nachricht.

## 6 · Buffer-Entwurf

Kanäle: Instagram `whatshouldido.app` und TikTok (Organisation „My Organization“). **Nur als
Entwurf** (`saveToDraft: true`), **nie veröffentlichen, nie in die Queue**: das entscheidet der Nutzer.
Bild-URLs an den **Commit** hängen, nicht an den Branch. `altText` pro Bild ist Pflicht. IG:
`{instagram:{type:"post",shouldShareToFeed:false}}`, TikTok: `{tiktok:{title}}`.

## 7 · Die eine Nachricht an den Nutzer

Kurz, fürs Handy: Thema in einem Satz · Hook · die zwei Text-Bilder · Video-Kandidaten (Links) ·
Canva-Link · Buffer-Draft-IDs · **was nicht funktioniert hat**. Dann warten.

## Kosten und Grenzen

- Bilder nur für **neue** Posts generieren, **nie** vorhandene neu würfeln (`neu_generieren` bleibt aus).
- Keine API-Keys in Dateien, Commits oder Prompts (`GEMINI_API_KEY` nur als GitHub-Secret).
- `CLAUDE.md` wird nicht angefasst.
- Nie auf einen anderen Branch pushen.
