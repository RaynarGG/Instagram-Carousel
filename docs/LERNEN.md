# Was funktioniert: Lernlog aus den Zahlen

Vor jedem Post lesen. Wird von der Wochenanalyse (`docs/WOCHENANALYSE.md`) gepflegt.
**Regeln** sind belegt und gelten. **Tests** gelten auch, werden aber noch geprüft.
**Beobachtungen** sind Hinweise ohne Pflicht.

## Regeln und Tests

### T1 · Slide 2 ist eine Szene, kein Methodenteil (Test seit 2026-10-09)
- **Regel:** Slide 2 erzählt den Anfang der Geschichte mit Menschen, Ort und Handlung. Sie endet mit
  einer offenen Spannung, die Slide 3 auflöst.
  - Body höchstens etwa 30 Wörter und höchstens zwei Zahlen.
  - Versuchsbedingungen, Stichprobe, Jahr und Ablaufdetails kommen später, auf die `evidence`-Slide
    oder in die Caption.
- **Beleg:** Post 08 (Schokolade/Trinkgeld) bekam auf TikTok 899 Aufrufe. Die meisten haben laut
  Nutzer nur bis Slide 2 geswiped.
  - Slide 2 dort: „Spring 1998. One waitress … 80 dining parties, four conditions. A shuffled stack of
    index cards …“. Das sind vier Bedingungen und Ablaufdetails, bevor klar ist, warum man weiterlesen soll.
  - Gegenprobe Post 06 (Manilow), bester Post mit 5.383 Aufrufen: Slide 2 ist eine Szene („walked him
    into a room where five strangers sat … asked him to guess how many had noticed“). Sie endet mit
    einer Frage, die man beantwortet haben will.
- **Prüfen an:** Post 09 und 10 haben noch die alte Regel und ebenfalls methodenlastige Slides 2
  (52 Studenten, Bedingungen / 14 °C, 60 s, 30 s). Erwartung: Abbruch auf Slide 2. Ab Post 11 gilt die
  neue Regel, dann vergleichen.

## Beobachtungen (noch keine Regel)

- **B1 · Cover verrät alles, keiner swiped.** Post 05 (Marmelade) bekam 3.174 Aufrufe, aber nur 1,2 s
  Ø Ansehzeit.
  - Das Cover „The more options you give, the less people buy“ liefert die ganze Pointe. Es gibt
    keinen Grund zu swipen.
  - Manilow („… to count who actually noticed“) und Placebo („works even when you know“, dazu die Frage
    nach dem Wie) lassen eine Lücke offen und liegen bei 3 bis 5 s.
  - Wenn sich das wiederholt, wird daraus eine Regel: Das Cover nennt den Befund, aber nicht den
    Mechanismus.
- **B2 · TikTok ist der Reichweitenkanal.** TikTok liegt bei 900 bis 5.400 Aufrufen, Instagram bei 3 bis 22
  Reichweite. Instagram-Zahlen sind derzeit nicht auswertbar.
- **B3 · Auslieferungsfehler.** Post 02 auf TikTok hatte 0 Aufrufe, Post 07 auf TikTok 1 Aufruf. Beide
  zählen nicht in die Auswertung. Ursache beim Nutzer klären.
  - Vermutung (11.10.): Buffer-Sendungen per Queue kommen auf TikTok und Instagram nicht live an.
    Live geht erst der Post, den der Nutzer in der App absetzt (`via: network`).

## Kennzahlen TikTok (Karussells)

| Post | Thema | Aufrufe | Likes | Likes/Aufrufe | Shares | Ø Ansehzeit |
|---|---|---:|---:|---:|---:|---:|
| 06 | Manilow-Shirt (Spotlight) | 5.383 | 116 | 2,2 % | 0 | 4,7 s |
| 05 | Marmelade (Choice Overload) | 3.174 | 26 | 0,8 % | 0 | 1,2 s |
| 03 | Ehrliches Placebo | 2.899 | 82 | 2,8 % | 5 | 3,2 s |
| 08 | Schokolade/Trinkgeld | 899 | 10 | 1,1 % | 0 | 13,0 s |
| 07 | „Because“/Kopierer | 1 | 1 | – | 0 | – (Auslieferungsfehler) |
| 02 | Einsamkeit | 0 | 1 | – | 0 | – (Auslieferungsfehler) |

Stand der Metriken: 2026-10-11. Posts 09 und 10 sind erst seit 11.10. auf TikTok live, also noch zu frisch.

## Wochenlog

### KW 41 · 2026-10-11 · Sonntagslauf
- **Neue auswertbare Posts:** keine. Post 09 (IKEA) und Post 10 (Kälte) sind erst seit 11.10. auf TikTok
  live. Erster Stand nach wenigen Stunden: Post 10 hat 40 Aufrufe, Post 09 einen.
- **Post 08** ist bei 899 Aufrufen stehen geblieben (10 Likes, 2 Kommentare). Die Auslieferung auf TikTok
  ist durch.
- **Test T1:** noch nicht prüfbar. Die Vergleichsposts 09 und 10 sind zu frisch, und Post 11 (der erste
  mit der neuen Regel) kommt am Montag.
- **Geändert:** nichts an der Pipeline, weil kein neuer Beleg vorliegt. In `docs/WOCHENANALYSE.md` ist
  die Zuordnungsregel ergänzt (siehe B3).
- **B3 ergänzt:** Seit 04.10. haben alle Buffer-Sendungen mit `via: buffer` und `addToQueue` auch nach
  über 48 h keine Metriken. Gemessen werden nur die Posts, die mit `via: network` in Buffer stehen, also
  in der App gepostet und nachgeladen wurden, und seit 11.10. die Sendungen mit `shareNow`.
  - Folge: Jeder Post erscheint zwei- bis dreimal in der Liste.
  - Post 09 auf Instagram (06.10.) und Post 10 auf Instagram (09.10.) haben bisher keine Zeile mit
    Metriken. Entweder sind sie nicht live, oder Buffer hat sie noch nicht nachgeladen.

### KW 41 · 2026-10-09 · Erstanalyse
- **Top:** Post 06 Manilow, 5.383 Aufrufe auf TikTok. **Flop** (auswertbar): Post 08 Schokolade, 899
  Aufrufe mit Abbruch auf Slide 2.
- **Ursache:** Slide 2 von Post 08 ist ein Methodenteil statt einer Szene.
- **Geändert:** Die Slide-2-Regel in `docs/TAGESABLAUF.md` ist umgestellt (T1).
- **Offen:** Ursache der TikTok-Fehler bei Post 02 und 07. Post 08 wurde auf beiden Kanälen doppelt
  gesendet (IG 04.10. + 06.10., TikTok 05.10. + 06.10.).
