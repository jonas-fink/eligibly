# Modul-Spec: Neue Grundsicherung (SGB II, vormals „Bürgergeld“)

UI-Bezeichnung: **Neue Grundsicherung**. Code-Key: `buergergeld`. Gesetzliche Grundlage weiterhin SGB II.

Teil von: [SPEC.md](../../SPEC.md) — Abschnitt 3/6
Berechnungstiefe: **grob** (Vorabschätzung, kein exakter Bescheid-Ersatz) · Berechnungsart: `bedarfsdeckung`
Quellen (Stand der recherchierten Werte: 2026, vor Umsetzung erneut prüfen):
- [bundesregierung.de – Nullrunde Bürgergeld 2026](https://www.bundesregierung.de/breg-de/aktuelles/nullrunde-buergergeld-2383676)
- [buergergeld.org – Schonvermögen](https://www.buergergeld.org/sgb-ii/schonvermoegen/)
- [sozialrat.org – Freibeträge Erwerbstätigkeit 2026](https://sozialrat.org/buergergeld-freibetraege-erwerbstaetigkeit-2026/)

## 0. Namensentscheidung (bestätigt)

Zum 1. Juli 2026 wurde das Bürgergeld gesetzlich zur „Neuen Grundsicherung“ umgebaut. Die Regelsatzhöhen ändern sich laut Quelle dadurch nicht.

Produktentscheidung: Die UI verwendet durchgängig den aktuellen amtlichen Begriff Neue Grundsicherung, nicht Bürgergeld. Der interne Modul-Key im Code bleibt `buergergeld` (technischer Bezeichner, nicht UI-sichtbar) — reine Backend-Konvention, siehe SPEC.md Abschnitt 6.1.

## 1. Anspruchsvoraussetzungen (fachlich)

1. Erwerbsfähigkeit nach § 8 SGB II: mindestens 15 Jahre alt, unterhalb der Regelaltersgrenze (siehe Grundsicherungs-Modul), grundsätzlich in der Lage, mind. 3 Stunden täglich zu arbeiten.
2. Hilfebedürftigkeit: notwendiger Lebensunterhalt nicht ausreichend durch eigenes Einkommen/Vermögen gedeckt.
3. Gewöhnlicher Aufenthalt in Deutschland.
4. **Ausschluss bei gleichzeitigem Anspruch auf Grundsicherung (SGB XII) oder volle Erwerbsminderung** — diese Personen fallen unter das Grundsicherungs-Modul, nicht unter Bürgergeld (Altersgrenze/Erwerbsfähigkeit sind die abgrenzenden Kriterien zwischen beiden Modulen).
5. **Wechselwirkung mit Wohngeld/Kinderzuschlag (cross-modul, zentral im Orchestrator)**: Anspruch auf die Neue Grundsicherung schließt Wohngeld aus, und Kinderzuschlag/Wohngeld haben umgekehrt Vorrang, wenn sie zusammen die Bedürftigkeit vermeiden (§ 6a BKGG). Dieses Modul berechnet seinen Bedarf und Anspruch immer unabhängig — die eigentliche Vorrangentscheidung zwischen den drei Systemen trifft der Orchestrator, siehe [docs/orchestrator.md](../orchestrator.md).

## 2. Zusätzliche Inputfelder (`systemSpecificAnswers`)

```ts
interface BuergergeldAnswers {
  kannMindestens3StundenTaeglichArbeiten: boolean; // Erwerbsfähigkeit nach § 8 SGB II
  hatMinderjaehrigesKindImHaushalt: boolean; // erhöht Einkommens-Freibetragsgrenze (siehe Abschnitt 3)
  selbstgenutzesWohneigentumSeitWannGenutzt?: Date; // relevant für die einjährige Schutzfrist des Eigenheims
}
```

`geburtsdatum` (Kernmodell) wird für die Altersgrenzen (15 Jahre / Regelaltersgrenze) und für die altersabhängigen Vermögensfreibeträge (Abschnitt 4) genutzt. `vermoegen` liegt seit SPEC v0.4 personenbezogen vor, was für die altersabhängigen Freibeträge nötig ist. `kindergeldWirdBezogen` kommt ebenfalls aus dem Kernmodell.

**Einkommensbegriffe in diesem Modul**: Die §-11b-Freibetragsstaffelung bemisst sich am **Brutto-Erwerbseinkommen** (`einkommen.arten.erwerbstaetigkeit`); angerechnet wird das **Netto** abzüglich dieses Freibetrags. Renteneinkommen ist nicht über § 11b begünstigt.

## 3. Berechnungslogik (grob)

```
// 1. Bedarf
// regelsatz() braucht den Haushaltskontext: Stufe 1 (alleinstehend) vs. Stufe 2 (Partner)
// ist nicht aus der Person allein ableitbar (Review-Befund C6)
bedarf = summe(regelsatz(person, haushalt) für alle Haushaltsmitglieder) + warmmiete(haushalt) + mehrbedarfe

// 2. Erwerbstätigenfreibetrag pro erwerbstätiger Person (§ 11b SGB II)
// Bemessungsgrundlage ist das BRUTTO-Erwerbseinkommen, nicht das Netto (Review-Befund A2).
// Nur Erwerbseinkommen ist begünstigt — Rente, Kapitalerträge und Sonstiges nicht.
je Person:
  bruttoErwerb  = person.einkommen.arten.erwerbstaetigkeit
  grundfreibetrag = min(bruttoErwerb, GRUNDFREIBETRAG_ERWERBSEINKOMMEN)   // 100 €
  rest  = max(0, bruttoErwerb - 100)
  stufe1 = min(rest, 420) * 0.20                                          // 100–520 €,  max.  84 €
  stufe2 = min(max(0, rest - 420), 480) * 0.30                            // 520–1.000 €, max. 144 €
  obergrenzeStufe3 = hatMinderjaehrigesKindImHaushalt ? 500 : 200         // → 1.500 € bzw. 1.200 €
  stufe3 = min(max(0, rest - 900), obergrenzeStufe3) * 0.10
  freibetrag(person) = grundfreibetrag + stufe1 + stufe2 + stufe3

// Angerechnet wird das Netto abzüglich des auf Bruttobasis ermittelten Freibetrags
anrechenbaresErwerbseinkommen = summe(max(0, person.einkommen.nettoMonatlich - freibetrag(person)))

// 3. Weitere Einkommensarten (eigenes Anrechnungsregime, nicht über § 11b)
kindergeldGesamt = anzahl(kinder mit kindergeldWirdBezogen) * KINDERGELD_MONATLICH  // zentrale Konstante, SPEC 6.2.5
anrechenbaresKindergeld = max(0, kindergeldGesamt - KINDERGELD_FREIBETRAG_ERSTES_KIND)
anrechenbaresEinkommenGesamt =
    anrechenbaresErwerbseinkommen
  + anrechenbaresKindergeld
  + summe(unterhaltErhalten)

// WICHTIG für die Vorrangprüfung: Kindergeld MUSS hier enthalten sein, damit die
// § 6a-BKGG-Vermeidungsprüfung im Orchestrator es nicht doppelt zählt
// (siehe docs/orchestrator.md, Abschnitt 4.1)

// 4. Vermögensprüfung — Freibeträge sind altersabhängig PRO PERSON (SPEC 6.2.3)
vermoegensfreibetrag = summe(altersabhaengigerFreibetrag(person) für alle Haushaltsmitglieder)
vermoegenUeberschreitet = vermoegenGesamt > vermoegensfreibetrag
  // Ausnahme: selbstgenutztes Wohneigentum im ersten Bezugsjahr generell geschützt

// 5. Ergebnis (ModuleCalculation, berechnungsart 'bedarfsdeckung')
bedarfsluecke = bedarf - anrechenbaresEinkommenGesamt
voraussetzungenErfuellt =
  kannMindestens3StundenTaeglichArbeiten AND
  alter >= 15 AND alter < REGELALTERSGRENZE_JAHRE AND
  !vermoegenUeberschreitet
betrag = max(bedarfsluecke, 0)
```

## 4. Konstanten (TBD — vor Implementierung/jährlich zu verifizieren)

| Konstante | Recherchierter Wert (2026) | Quelle/Stand |
|---|---|---|
| Regelsätze (Stufe 1–6) | identisch zu SGB XII, siehe [Grundsicherungs-Modul](grundsicherung.md#3-berechnungslogik-grob) | bundesregierung.de, 2026 — Regelsätze sind seit 2011 zwischen SGB II und SGB XII vereinheitlicht |
| `GRUNDFREIBETRAG_ERWERBSEINKOMMEN` | 100 €/Monat | sozialrat.org, 2026 |
| Stufe 1 (100–520 €) | 20 %, max. 84 € | sozialrat.org, 2026 |
| Stufe 2 (520–1.000 €) | 30 %, max. 144 € | sozialrat.org, 2026 |
| Stufe 3 (1.000–1.200 €, mit mj. Kind bis 1.500 €) | 10 %, max. 20 € bzw. 50 € | sozialrat.org, 2026 |
| `KINDERGELD_FREIBETRAG_ERSTES_KIND` | **entfällt — Wert nicht bestätigt** | siehe Hinweis unten |
| Altersabhängiger Vermögensfreibetrag: bis 29 Jahre | 5.000 € | buergergeld.org, 2026 |
| Altersabhängiger Vermögensfreibetrag: 30–40 Jahre | 10.000 € | buergergeld.org, 2026 |
| Altersabhängiger Vermögensfreibetrag: 41–50 Jahre | 12.500 € | buergergeld.org, 2026 |
| Altersabhängiger Vermögensfreibetrag: ab 51 Jahre | 20.000 € | buergergeld.org, 2026 |
| Karenzzeit für Vermögen (allgemein) | **abgeschafft** (Reform 2026) | buergergeld.org, 2026 |
| Schutz selbstgenutztes Wohneigentum | 1 Jahr ab Bezugsbeginn, unabhängig von der Größe; danach Wohnflächengrenzen 130–140 m² | buergergeld.org, 2026 |

### 4.1 Kindergeld-Anrechnung — der 250-€-Freibetrag ließ sich nicht bestätigen

Die Recherche findet keinen Beleg für einen Kindergeld-Freibetrag von 250 €. Die Quellen mit Stand nach der Reform vom 01.07.2026 beschreiben durchgängig eine **volle Anrechnung**: Das Kindergeld gilt als Einkommen des Kindes und mindert dessen Bedarf Euro für Euro.

```
anrechenbaresEinkommenKind += kindergeldWirdBezogen ? KINDERGELD_MONATLICH : 0
```

Das ist zugleich die Voraussetzung dafür, dass die § 6a-Vermeidungsprüfung im Orchestrator nicht doppelt zählt (siehe [docs/orchestrator.md](../orchestrator.md) 4.1).

> **Status**: Der Wert aus v1 wird gestrichen, nicht durch einen neuen ersetzt. Sekundärquellen sind hier keine ausreichende Grundlage — **vor Implementierung ist § 11 SGB II in der ab 01.07.2026 geltenden Fassung im Volltext zu prüfen.** Bis dahin trägt das Modul für Haushalte mit Kindergeldbezug einen `datenluecken`-Eintrag.

### 4.2 Vermögensfreibeträge — Karenzzeit ist entfallen

Seit dem 01.07.2026 gibt es **keine Karenzzeit** mehr; das Vermögen wird ab dem ersten Tag des Leistungsbezugs geprüft. Die altersgestaffelten Freibeträge gelten pro Person; nicht ausgeschöpfte Freibeträge einzelner Mitglieder kommen den übrigen der Bedarfsgemeinschaft zugute.

> **Achtung bei jeder weiteren Recherche zu diesem Modul**: Das Netz ist voll mit Vor-Reform-Ständen. Eine im Rahmen dieser Recherche geprüfte Quelle nannte noch die Karenzzeit-Beträge von 40.000 € für die leistungsberechtigte Person und 15.000 € je weiterer Person — das ist die Rechtslage **vor** dem 01.07.2026. **Jeder SGB-II-Wert braucht eine Quelle mit erkennbarem Stand nach Juli 2026.**

## 5. Ergebnis-Report (`naechsteSchritte`)

- `beschreibung`: "Die Neue Grundsicherung wird beim zuständigen Jobcenter beantragt."
- `benoetigteUnterlagen`: Personalausweis, Einkommensnachweise, Vermögensnachweise, Mietvertrag/Nebenkostenabrechnung, ggf. Nachweis der Erwerbsfähigkeit.
- `zustaendigeStelle`: "Jobcenter der Wohnortgemeinde."

## 6. Offene Punkte dieses Moduls

- [x] Kindergeld-Anrechnungsregime — **recherchiert**: kein Beleg für einen 250-€-Freibetrag; Sekundärquellen nach 07/2026 beschreiben volle Anrechnung. Wert gestrichen (Abschnitt 4.1)
- [x] **§ 11 SGB II im Volltext geprüft** — **Ergebnis: es gibt keinen 250-€-Freibetrag.** Die Streichung war richtig. Aber die Regel ist auch nicht „volle Anrechnung", wie Sekundärquellen sie verkürzen. § 11 Abs. 1 Satz 5 lautet sinngemäß: Kindergeld wird dem Kind als Einkommen zugerechnet, **soweit es bei diesem zur Sicherung des Lebensunterhalts benötigt wird** (Bedarfe nach § 28 ausgenommen).

Daraus folgt für die Berechnung:

```
kindergeldAlsKindeseinkommen = min(KINDERGELD_MONATLICH, restbedarfDesKindes)
// Ein Überschuss darüber bleibt unberücksichtigt und wandert NICHT
// zum Elternteil. Das Kindergeld kann den Bedarf des Kindes also
// höchstens auf null senken, nie darüber hinaus wirken.
```

Das ist betragsrelevant: Bei einem Kind mit geringem Restbedarf — etwa weil Unterhalt fließt — wird das Kindergeld nur teilweise angerechnet. Eine Vollanrechnung würde den Anspruch der Bedarfsgemeinschaft zu niedrig ausweisen.

> **Vorbehalt zur Fassung**: Die abgerufene Fassung trägt den Stand 01.07.2023, also das letzte Änderungsdatum von § 11 — die Reform zum 01.07.2026 hat diese Vorschrift demnach nicht angefasst. Vor dem Livegang einmal gegenprüfen, weil die Recherche auf einer einzigen Abfrage beruht
- [x] Erwerbstätigenfreibeträge — **bestätigt** (§ 11b SGB II, seit der Reform 2023 unverändert, auch durch die Reform 07/2026 nicht berührt): 100 € Grundfreibetrag + 20/30/10 %, maximal 348 € ohne bzw. 378 € mit minderjährigem Kind
- [ ] Prüfen, ob der Erwerbstätigenfreibetrag korrekt vom Netto abgezogen wird oder ob die Anrechnung insgesamt auf Bruttobasis erfolgt — die Quellen sind hier unscharf, die Spec nimmt aktuell „Netto minus brutto-ermittelter Freibetrag" an
- [x] Mehrbedarfe — **entschieden (MVP)**: Alleinerziehung und Schwangerschaft rechnen mit. Kostenaufwändige Ernährung bleibt Post-MVP (setzt eine ärztliche Bescheinigung voraus)
- [x] Mehrbedarfs-Prozentsätze nach § 21 SGB II — **recherchiert** (Fassung 01.01.2021, durch die Reform 07/2026 nicht berührt):

| Mehrbedarf | Satz | Bezugsgröße | Voraussetzung |
|---|---|---|---|
| Werdende Mütter | 17 % | Regelbedarf § 20 | ab der 12. Schwangerschaftswoche bis Ende des Entbindungsmonats |
| Alleinerziehende | **36 %** | Regelbedarf § 20 Abs. 2 | ein Kind unter 7 **oder** zwei bis drei Kinder unter 16 |
| Alleinerziehende | **12 % je Kind** | Regelbedarf § 20 Abs. 2 | wenn das mehr ergibt als 36 %; **gedeckelt bei 60 %** |
| Behinderung | 35 % | Regelbedarf § 20 | erwerbsfähig, mit Leistungen zur Teilhabe am Arbeitsleben |
| Kostenaufwändige Ernährung | „in angemessener Höhe" | — | medizinisch notwendig, kein fester Satz — bleibt Post-MVP |

**Deckel über alles**: Die Summe der Mehrbedarfe darf den Regelbedarf für erwerbsfähige Leistungsberechtigte nicht übersteigen.

```
mehrbedarfAlleinerziehend(kinder) =
  max(
    (einKindUnter7 || zweiBisDreiKinderUnter16) ? 0.36 : 0,
    min(0.12 * anzahlKinder, 0.60)
  )
```

Die Staffelung ist ein Maximum, keine Summe — 36 % und 12-%-Regel schließen sich nicht aus, es gilt der höhere Wert.
- [ ] Genaue Regeln für die einjährige Eigenheim-Schutzfrist (Startdatum-Tracking) — Datenmodell-Feld `selbstgenutzesWohneigentumSeitWannGenutzt` ist ein erster Vorschlag
- [x] Selbstständigen-Einkommen — **entschieden**: bleibt Post-MVP, wird aber **nicht verschwiegen**. Der Wizard fragt nach Selbstständigkeit; bei „ja" liefert das Modul `nicht_pruefbar` mit dem Datenlücken-Eintrag „Bei selbstständigem Einkommen rechnet das Amt mit Durchschnittswerten über mehrere Monate und zieht Betriebsausgaben ab. Das können wir hier noch nicht abbilden." Still mit einem Monatswert weiterzurechnen wäre die schlechtere Variante: Das Ergebnis sähe belastbar aus und wäre es nicht
