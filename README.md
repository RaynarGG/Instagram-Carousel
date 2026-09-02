# Content-Creation

Bilder und fertige Karussell-Slides für den Psychology-Account — gebaut in GitHub Actions,
damit das **komplett vom Handy** läuft. Kein Rechner nötig.

Regeln für die Bilder: `wsd-social-images` Skill (Format, Schichtaufbau, Archetypen, Prompt-Formel).

---

## Seitenverhältnis — 4:5, 

**Die Slides sind 1080 × 1350 (4:5).** Das ist keine Geschmacksfrage, sondern eine
harte Grenze: die Instagram-Graph-API, über die Buffer automatisch veröffentlicht,
akzeptiert nur **4:5 (0,80) bis 1,91:1**. Ein 3:4-Slide (0,75) wird abgelehnt mit
*„Image doesn't match Instagram's expected aspect ratios"*.

Buffer bietet dann zwei Auswege, beide schlecht:
- **Auto-Crop** schneidet 90 px weg. Weil unsere Typo unten sitzt, trifft es die
  Headline oder die schwarze Fusszone. Nicht benutzen.
- **Notify Me** heisst: Buffer schickt eine Erinnerung, gepostet wird von Hand.
  Kostet die Automatisierung.

**Die Lösung, die beides erhält:** die generierten Bilder bleiben **3:4**, nur die
Slide-Fläche ist **4:5**. Der Renderer beschneidet das Bild oben-anliegend, und
weil die unteren 40 % der Bilder ohnehin reines Schwarz sind, verschwindet genau
dieser Teil. Es geht **kein Text und kein Motiv** verloren — die Fusszone fängt
die Differenz ab.

Deshalb steht in `prompts/*.json` weiter `"aspect_ratio": "3:4"` und in
`posts/*.json` `1080 × 1350`. Das ist Absicht, kein Widerspruch.

> Die Skill `wsd-social-images` §1 sagt 3:4 und begründet das mit mehr Bildschirmhöhe.
> Das galt für manuelles Posten aus der App. Für den automatisierten Weg gewinnt
> die API-Grenze.

---

## Redaktionelle Haltung

Dieser Kanal ist **Unterhaltung, kein Journal Club**. Die Prioritäten sind:

1. **Der Hook gewinnt.** Slide 1 hat genau eine Aufgabe: den Daumen anhalten. Eine
   Formulierung, die zwei Sekunden Nachdenken braucht, hat verloren — auch wenn sie
   die präzisere ist. Im Zweifel wird zugunsten des Hooks entschieden, nicht zugunsten
   des Studienwortlauts.
2. **Zuspitzen ist erlaubt.** Zahlen dürfen gerundet werden, Effekte scharf formuliert,
   Einschränkungen weggelassen. Es muss **nicht 1 zu 1** dem Abstract entsprechen.
3. **Die Quelle .** Jeder Post hat eine Quelle mit
   Journal, Jahr und Autoren in der beschreibung

---

#

## Vom Handy benutzen

GitHub-App oder github.com im Browser → **Actions** → **Bilder & Slides** → **Run workflow**.

| Feld | Was es macht |
|---|---|
| **was** | `beides` (Bilder + Slides), `nur-bilder`, `nur-slides` |
| **post** | z. B. `01-just-think` — greift auf `prompts/post-01-just-think.json` und `posts/01-just-think.json` zu |
| **only** | Filter. Leer = alle. Sonst: `s3a` · `cover` · `slide:3` · `archetype-a` · mehrere per Komma |
| **bild_variante** | `a` oder `b` — welche Bildvariante in die Slides kommt |
| **neu_generieren** | An = vorhandene Bilder werden überschrieben. Aus = nur fehlende werden erzeugt (spart Geld) |
| **freitext_prompt** | Nur das Motiv beschreiben, z. B. *"a burning server rack alone in an empty datacenter hall"*. Die sieben Pflichtblöcke der Convention werden automatisch ergänzt. Erzeugt ein Einzelbild unter `99-adhoc`. |
| **freitext_name** | Kurzname für dieses Einzelbild |

Ein Push auf `prompts/**.json` oder `posts/**.json` startet den Lauf ebenfalls —
dabei werden **nur fehlende** Bilder generiert.

### Wo das Ergebnis liegt

- **Run-Summary** (direkt unter dem Lauf): Vorschau aller Bilder und Slides + Prüf-Tabelle
- **Branch `social-assets`**:
  - `out/<post>/LINKS.md` — Tabelle mit Vorschau und den Roh-Links zum Kopieren
  - `out/<post>/<id>-<slug>.png` — 2K-Original
  - `out/<post>/1080/…` — 1080 × 1440, das ist die Datei für Instagram
  - `out/<post>/slides/slide-01.png` … — die **fertigen Slides** mit Headline
  - `out/<post>/manifest.json` — alles maschinenlesbar, inkl. Messwerte
- **Artifacts** am Lauf: alles als ZIP

Bild aufs Handy holen: Link aus `LINKS.md` antippen → lange drücken → speichern.

---


### `prompts/post-<x>.json` — die Bildprompts
```json
{
  "id": "s3a",
  "slug": "finger-on-button",
  "slide": 3,
  "variant": "a",
  "keywords": ["number", "archetype-c", "macro"],
  "headline": "67% OF THE MEN SHOCKED THEMSELVES",
  "prompt": "Ultra-detailed cinematic composite, 3:4 vertical. …"
}
```
`id` und `slug` bestimmen den Dateinamen und damit den Link.
`keywords` sind das, was du später bei **only** eintippen kannst.
`headline` ist nur Doku — sie steht mit im Manifest, damit man Bild und Text zusammen sieht.

### `posts/<x>.json` — die Slide-Texte
```json
{
  "n": 3, "type": "stat", "image": "s3a",
  "headline": ["*67% OF THE MEN*", "SHOCKED *THEMSELVES*"],
  "body": "12 of 18 men. 6 of 24 women. One man pressed it *190 times*."
}
```
- `*Sternchen*` = orange
- `**Doppelsternchen**` = fett (nur in Bullets)
- `type`: `cover` · `facts` (Headline + Bullets) · `stat` (Headline + eine Zeile) ·
  `evidence` (Quellenblock) · `cta`
- **Die `type`-Werte sind Layouts, keine Dramaturgie-Vorschrift.** Sie sagen, wie
  eine Slide gesetzt wird, nicht welche vorkommen muss. Es gibt keine Pflichtabfolge
  und keine feste Anzahl — nimm so viele Slides, wie der Post braucht, um
  verständlich zu sein und zu unterhalten. Drei können reichen, sieben sind das
  sinnvolle Maximum, bevor der Swipe abbricht.
- `alt` pro Slide: ein Satz, Motiv plus Headline — Buffer verlangt ihn beim Upload
- `image` zeigt auf eine `id` aus der Prompt-Datei

Beides ist am Handy im GitHub-Web-Editor bearbeitbar — bei JSON aufpassen, dass Kommas
und Anführungszeichen stimmen; der Lauf bricht sonst mit einer klaren Meldung ab.

---

## Automatische Prüfung

Jedes Bild wird gegen die Convention gemessen, das Ergebnis steht in der Summary:

| Messwert | Grenze | Warum |
|---|---|---|
| Format | 3:4 (0,75) | Instagram-Höhe. Abweichungen werden automatisch beschnitten — zu hohe Bilder **oben**, damit die schwarze Fusszone erhalten bleibt |
| Fusszone | Helligkeit < 0,10 in den unteren 35 % | Sonst wird die Headline unlesbar |
| warmes Licht | ≥ 1,5 % Pixel im Bereich Orange | Ohne warme Lichtquelle hat `#EE9A54` im Bild keinen Halt |
| Kontrast | ≥ 0,14 | Flache Bilder stoppen keinen Scroll |

Beanstandungen **blockieren nicht** — sie stehen als Hinweis in der Tabelle.
Mit `--strict` (lokal) bricht der Lauf ab.

---



## Kosten im Blick

Jedes Bild ist ein bezahlter API-Call. Deshalb:
- **neu_generieren** standardmäßig aus — vorhandene Bilder werden übersprungen
- `only` nutzen, statt jedes Mal alle 11 Prompts laufen zu lassen
- `--dry-run` lokal, wenn du nur die Auswahl prüfen willst
