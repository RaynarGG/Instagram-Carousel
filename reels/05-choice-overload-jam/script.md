# Reel-Skript — Choice Overload / Jam Study

Status: **zurückgestellt** — Video-Generierung erst, wenn die Carousel-Slides
fertig sind. Hook noch nicht final gewählt (siehe unten, Empfehlung B).

Prinzip: Addiction Loop — jeder Clip schließt eine Frage und reißt sofort die
nächste auf. Visueller Arc: 1 Glas → 24 Gläser → 6 Gläser.

## Clip 1 (~7s) — HOOK, Loop öffnet

**Gesprochen — vier Varianten, noch nicht entschieden:**
- A (staccato): "Twenty-four flavors of jam. Everybody stopped. Almost nobody bought."
- **B (Du-Ansprache, empfohlen):** "You've walked out of a store empty-handed and blamed yourself. It wasn't you. It was the shelf."
- C (Paradox flach): "More choice made people buy less. A grocery store proved it. With jam."
- D (zwei Tische): "The table with twenty-four jams drew the crowd. The table with six made the money."

**Gezeigt:** Ein einzelnes Marmeladenglas schwebt im absoluten Schwarz, warmes
Bernsteinlicht von innen, feine Staubpartikel, langsamer Push-in. Ab Sekunde 3
taucht ein zweites Glas auf, dann ein drittes, dann immer schneller — bis 24
Gläser das Bild füllen und das Licht in Dutzende Reflexe zersplittert. Ende
auf visueller Überforderung.

*Offene Frage am Ende: warum kauft keiner?*

## Clip 2 (~7s) — RE-HOOK, neuer Loop

**Gesprochen:** "So they cut it down to six. Fewer people stopped — but of
the ones who did, ten times as many walked out with a jar."

**Gezeigt:** Die 24 Gläser lösen sich eins nach dem anderen ins Dunkel auf,
das Licht sammelt sich wieder. Sechs Gläser bleiben, ruhig gesetzt, jedes
klar beleuchtet. Eine Hand greift entschlossen zu — kein Zögern.

*Offene Frage am Ende: zehnmal? wie kann weniger mehr verkaufen?*

## Clip 3 (~7s) — PAYOFF + Twist

**Gesprochen:** "Three percent versus forty. The extra options didn't help
anyone choose. They just made walking away the easier answer."

**Gezeigt:** Split-Komposition: links die Wand aus 24 Gläsern in kaltem
Schatten, rechts die sechs im warmen Amber. Kamera zieht zurück auf ein
einzelnes gewähltes Glas in einem Einkaufskorb, alles andere verschluckt
das Schwarz.

---

## Offene technische Punkte (vor dem ersten Call klären)

- Text-zu-Video mit gesprochenem Ton ist ein anderer API-Pfad als
  `gen-video.mjs` (das ist Bild-zu-Video, kein Text-Input, `generateAudio`
  wird dort nachweislich abgelehnt). Braucht ein neues Skript.
- Ob `generateAudio` beim reinen Text-zu-Video-Pfad erlaubt ist, ist
  **ungetestet** — muss vor dem ersten produktiven Lauf mit einem einzelnen
  billigen Testclip verifiziert werden.
- Kosten pro Clip nicht ohne Rückfrage auslösen (wie bei allen Bildern/Videos
  in diesem Repo).
