> **Achtung: unvollstaendig.** Diese Datei ist nur der Schluss des Pipeline-Playbooks
> (ab Abschnitt 9). Die Abschnitte 1-8 fehlen. Wer die Vollversion hat, ersetzt die Datei.

  umstellt, muss sie ergänzen — sonst ist `secrets.GEMINI_API_KEY` leer.
---
 
## 9 · Kosten
 
Jedes Bild ist ein bezahlter API-Call.
- vorhandene Bilder werden übersprungen, `neu_generieren` ist standardmäßig aus
- `only` statt Vollauf
- `--dry-run` zeigt die Auswahl ohne Call
- der Push-Trigger generiert nur **fehlende** Bilder
Der teure Fehler: bei jedem Textdreh alle Prompts neu laufen lassen.
 
---
 
## 10 · Offene Punkte
 
* **`wsd-headline` steht auf 4:5 (1080 × 1350), die Pipeline auf 3:4 (1080 × 1440).**
  Die Pipeline gewinnt — die Messung an @technology sagt 3:4. Wer `wsd-headline` für
  Einzelgrafiken nutzt, muss `width`/`height` mitgeben, sonst passt das Format nicht zum
  restlichen Karussell.
* **Video-Cover** sind nicht automatisiert. Slide 1 als Video mit Ton ist bei @technology
  Standard (~8 s, nur der Hintergrund bewegt sich, Typo statisch) — siehe
  `wsd-social-images` §5.
* **Kanalziel** (Awareness vs. Beta-Signups) und **ein Kanal oder zwei** (englischer
  Psychology-Content vs. deutscher WSD-Content) sind weiter unentschieden. Solange das
  offen ist, weiß die `cta`-Slide nicht, ob sie „follow" oder „warteliste" sagt.
## Referenzen
- `references/vorlage-post.json` — leeres Post-Gerüst mit allen fünf Typen
- `references/vorlage-prompts.json` — leeres Prompt-Gerüst