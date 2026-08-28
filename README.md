# Content-Creation

Bilder und fertige Karussell-Slides für den Psychology-Account — gebaut in GitHub Actions,
damit das **komplett vom Handy** läuft. Kein Rechner nötig.

Regeln für die Bilder: `wsd-social-images` Skill (Format, Schichtaufbau, Archetypen, Prompt-Formel).

---

## Einmalig einrichten

1. **API-Key als Secret ablegen.** Zwei Wege, beide funktionieren:
   - **Environment-Secret** (so ist es aktuell eingerichtet): Settings → Environments →
     Umgebung `GEMINI_API_KEY` → *Add environment secret*, Name `GEMINI_API_KEY`.
     Damit der Job das Secret sieht, muss im Workflow `environment: GEMINI_API_KEY` am Job
     stehen — steht dort. **Environment-Secrets sind für einen Job unsichtbar, der keine
     `environment:`-Zeile hat.** Das ist der häufigste Grund für „Key ist nicht gesetzt".
   - **Repository-Secret** (einfacher, ein Konzept weniger): Settings → Secrets and
     variables → Actions → *New repository secret*, Name `GEMINI_API_KEY`. Dann kann die
     `environment:`-Zeile im Workflow weg.

   Der Key gehört nirgendwo sonst hin: nicht in eine Datei, nicht in einen Commit, nicht in einen Chat.
2. Fertig. Der Rest läuft über *Actions*.

> **Öffentlich oder privat?** Bei einem **privaten** Repo funktionieren die
> `raw.githubusercontent.com`-Links nur, solange du im Browser eingeloggt bist — zum Einbetten
> irgendwo anders taugen sie dann nicht. Wenn du echte, überall funktionierende Bild-Links
> willst, muss das Repo **public** sein. Für „am Handy anschauen und speichern" reicht privat.

---

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

## Die zwei Dateien, die du bearbeitest

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

## Lokal, falls doch mal am Rechner

```bash
npm install
setx GEMINI_API_KEY "..."        # Windows, einmalig, danach neue Shell

node scripts/gen-images.mjs --file prompts/post-01-just-think.json --dry-run
node scripts/gen-images.mjs --only cover
node scripts/check-images.mjs
node scripts/render-slides.mjs --post 01-just-think
```

`--dry-run` zeigt nur, was generiert würde, und kostet nichts.

---

## Kosten im Blick

Jedes Bild ist ein bezahlter API-Call. Deshalb:
- **neu_generieren** standardmäßig aus — vorhandene Bilder werden übersprungen
- `only` nutzen, statt jedes Mal alle 11 Prompts laufen zu lassen
- `--dry-run` lokal, wenn du nur die Auswahl prüfen willst
