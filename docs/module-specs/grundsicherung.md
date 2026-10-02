# Modul-Spec: Grundsicherung im Alter und bei Erwerbsminderung (SGB XII, 4. Kapitel)

Teil von: [SPEC.md](../../SPEC.md) — Abschnitt 3/6
Berechnungstiefe: **grob** (Vorabschätzung, kein exakter Bescheid-Ersatz) · Berechnungsart: `bedarfsdeckung`
Quellen (Stand der recherchierten Werte: 2026, vor Umsetzung erneut prüfen):
- [juraforum.de – Grundsicherung Höhe 2026](https://www.juraforum.de/lexikon/grundsicherung-hoehe)
- [sozialrat.org – Grundsicherung Alter/Erwerbsminderung](https://sozialrat.org/grundsicherung-alter-erwerbsminderung/)

## 1. Anspruchsvoraussetzungen (fachlich)

1. Gewöhnlicher Aufenthalt in Deutschland.
2. Mindestens eine der beiden Bedingungen:
   - Regelaltersgrenze der gesetzlichen Rentenversicherung erreicht (aktuell 67 Jahre für Jahrgänge 1964+), **oder**
   - Volle Erwerbsminderung nach § 43 SGB VI, dauerhaft, ab 18 Jahren.
3. Bedürftigkeit: notwendiger Lebensunterhalt ist aus eigenem Einkommen und Vermögen nicht (vollständig) gedeckt.

## 2. Zusätzliche Inputfelder (`systemSpecificAnswers`)

Über das Kern-`Haushalt`-Modell hinaus wird pro Person benötigt:

```ts
interface GrundsicherungAnswers {
  hatVolleErwerbsminderung: boolean; // unabhängig vom Alter relevant
  erwerbsminderungIstDauerhaft?: boolean; // nur relevant falls hatVolleErwerbsminderung = true
  hatMerkzeichenG?: boolean; // für Mehrbedarf, siehe unten
  weitereMehrbedarfe?: boolean; // Sammelfeld für sonstige Mehrbedarfe (kostenaufwändige Ernährung etc.) – Detailkatalog TBD
}
```

`geburtsdatum` (aus dem Kernmodell) wird verwendet, um die Regelaltersgrenze automatisch zu prüfen (67 Jahre als aktueller Fixwert, siehe TBD unten zur Jahrgangsstaffelung).

**Einkommensbegriff in diesem Modul**: Gerechnet wird mit `einkommen.nettoMonatlich`. Anders als bei der Neuen Grundsicherung gibt es hier **keine** Erwerbstätigenfreibeträge — die Aufschlüsselung in `einkommen.arten` wird deshalb nur informativ verwendet (Renteneinkommen ist der praktisch häufigste Fall).

## 3. Berechnungslogik (grob)

Die Leistung ist **personenbezogen**: Anspruchsberechtigt ist die einzelne Person, die die Altersgrenze erreicht hat oder voll erwerbsgemindert ist — nicht automatisch der ganze Haushalt. Das Modul rechnet deshalb je Person und gibt `teilbetraege` zurück (siehe [SPEC.md 6.3](../../SPEC.md#63-berechnungsergebnis-eines-moduls)).

```
// je anspruchsberechtigter Person:
  // regelsatz() braucht den Haushaltskontext — Stufe 1 (alleinstehend) vs. Stufe 2 (Partner)
  // ist aus der Person allein nicht ableitbar (Review-Befund C6)
  bedarf(person) = regelsatz(person, haushalt)
                 + anteiligeUnterkunftskosten(person, haushalt)
                 + mehrbedarf(person)

  // Volle Anrechnung, KEINE § 11b-Freibeträge (siehe Hinweis unten).
  // Renten- und Kapitaleinkommen zählen ungemindert.
  anrechenbaresEinkommen(person) = person.einkommen.nettoMonatlich

  luecke(person) = bedarf(person) - anrechenbaresEinkommen(person)

anspruchsberechtigtePersonen = mitglieder.filter(p =>
  altersgrenzeErreicht(p) OR (hatVolleErwerbsminderung(p) AND erwerbsminderungIstDauerhaft(p)))

voraussetzungenErfuellt =
  anspruchsberechtigtePersonen.length > 0 AND
  vermoegenGesamt <= SCHONVERMOEGEN_PRO_PERSON * anzahlPersonen

bedarfsluecke = summe(luecke(p) für p in anspruchsberechtigtePersonen)
betrag        = max(bedarfsluecke, 0)   // grobe Vorabschätzung, monatlich
teilbetraege  = anspruchsberechtigtePersonen.map(p => ({ personId: p.id, betrag: max(luecke(p), 0) }))
```

**Gemischte Haushalte**: Erreicht ein Partner die Altersgrenze und der andere nicht, fällt nur der erste unter dieses Modul — der andere unter die [Neue Grundsicherung](buergergeld.md). Beide Module können für denselben Haushalt gleichzeitig Ergebnisse liefern, jeweils mit `teilbetraege` für die betroffenen Personen. Das ist kein Vorrangkonflikt, sondern eine Abgrenzung (siehe [docs/orchestrator.md](../orchestrator.md), Abschnitt 1).

### Schonvermögen — Korrektur gegenüber v1

> v1 nahm an, der Freibetrag von 10.000 € gelte **pro Person mal Personenzahl**. Das ist falsch. § 1 der Verordnung zur Durchführung des § 90 Abs. 2 Nr. 9 SGB XII staffelt nach Rolle:
>
> - **10.000 €** für jede leistungsberechtigte volljährige Person (und für alleinstehende Minderjährige)
> - **+ 500 €** für jede Person, die von einer solchen Person überwiegend unterhalten wird
>
> Ein Ehegatte ist keine eigene Kategorie: Er zählt entweder selbst als leistungsberechtigt (10.000 €) oder als überwiegend unterhalten (500 €).

```
schonvermoegen = 10_000 * anzahlLeistungsberechtigterVolljaehriger
               +    500 * anzahlUeberwiegendUnterhaltenerPersonen
```

Auswirkung: Für ein Paar mit zwei Kindern, bei dem beide Erwachsenen leistungsberechtigt sind, sind es 21.000 € — nicht 40.000 €, wie die alte Annahme ergeben hätte. Ist nur eine Person leistungsberechtigt und unterhält die übrigen drei, sind es 11.500 €.

**Wichtiger fachlicher Hinweis**: Im 4. Kapitel SGB XII gelten *keine* Freibeträge auf Renten-/Kapitaleinkommen wie beim Bürgergeld (§ 82 SGB XII vs. § 11b SGB II). Das Rule-Modul darf **nicht** die Bürgergeld-Freibetragslogik wiederverwenden.

### Konstanten (TBD — vor Implementierung/jährlich zu verifizieren)

| Konstante | Recherchierter Wert (2026) | Quelle/Stand |
|---|---|---|
| `REGELSATZ_STUFE_1` (Alleinstehende) | 563 €/Monat | juraforum.de, 2026 |
| `REGELSATZ_STUFE_2` (Partner, je Person) | 506 €/Monat | juraforum.de, 2026 |
| `REGELSATZ_STUFE_3` (stationäre Einrichtung) | 451 €/Monat | juraforum.de, 2026 — Randfall, im MVP vermutlich nicht relevant |
| `REGELSATZ_STUFE_4` (Jugendliche 15–18) | 471 €/Monat | juraforum.de, 2026 |
| `REGELSATZ_STUFE_5` (Kinder 7–14) | 390 €/Monat | juraforum.de, 2026 |
| `REGELSATZ_STUFE_6` (Kinder bis 6) | 357 €/Monat | juraforum.de, 2026 |
| `SCHONVERMOEGEN_LEISTUNGSBERECHTIGT` | 10.000 € | § 1 DVO zu § 90 Abs. 2 Nr. 9 SGB XII, Stand 30.09.2025 |
| `SCHONVERMOEGEN_UNTERHALTENE_PERSON` | 500 € | § 1 DVO zu § 90 Abs. 2 Nr. 9 SGB XII, Stand 30.09.2025 |
| `REGELALTERSGRENZE` | Tabelle nach Geburtsjahr, 65 bis 67 Jahre | § 235 SGB VI — vollständige Staffelung in Abschnitt 5; **kein Fixwert 67** |
| Angemessenheitsgrenze KdU (Warmmiete) | — | **TBD**: regional unterschiedlich (kommunale Richtwerte), im MVP evtl. grobe Pauschale statt echter Angemessenheitsprüfung |
| Mehrbedarf bei Merkzeichen G | 17 % vom Regelsatz | sozialrat.org, 2026 |

## 4. Ergebnis-Report (`naechsteSchritte`)

- `beschreibung`: "Grundsicherung im Alter/bei Erwerbsminderung wird beim zuständigen Sozialamt beantragt."
- `benoetigteUnterlagen`: Personalausweis, Rentenbescheid bzw. Nachweis der vollen Erwerbsminderung, Einkommensnachweise, Vermögensnachweise, Mietvertrag/Nebenkostenabrechnung.
- `zustaendigeStelle`: "Sozialamt der Wohnortgemeinde / des Landkreises."

## 5. Offene Punkte dieses Moduls

- [x] Schonvermögen — **verifiziert und korrigiert**: 10.000 € je leistungsberechtigter volljähriger Person, + 500 € je überwiegend unterhaltener Person (§ 1 DVO zu § 90 Abs. 2 Nr. 9 SGB XII). Die Annahme „pro Person × Anzahl Personen" aus v1 war falsch
- [ ] Erhebung im Wizard: Wer im Haushalt ist „leistungsberechtigt" und wer „überwiegend unterhalten"? Das ist für Nutzer nicht selbsterklärend — Ableitung aus `erwerbsstatusPrimaer` und Alter prüfen
- [ ] Verteilschlüssel der Unterkunftskosten auf die Personen (`anteiligeUnterkunftskosten`) — aktuell nicht definiert, naheliegend nach Kopfzahl analog Kinderzuschlag
- [x] Jahrgangsabhängige Staffelung der Regelaltersgrenze — **recherchiert** (§ 235 SGB VI). Der Fixwert 67 war falsch für alle vor 1964 Geborenen; die Jahrgänge 1959 bis 1963 erreichen ihre Grenze in den kommenden Jahren, Jahrgang 1960 im Lauf des Jahres 2026. Ein Fixwert hätte ihnen das Ergebnis verweigert.

| Geburtsjahr | Regelaltersgrenze | | Geburtsjahr | Regelaltersgrenze |
|---|---|---|---|---|
| bis 1946 | 65 Jahre | | 1956 | 65 J + 10 M |
| 1947 | 65 J + 1 M | | 1957 | 65 J + 11 M |
| 1948 | 65 J + 2 M | | 1958 | 66 Jahre |
| 1949 | 65 J + 3 M | | 1959 | 66 J + 2 M |
| 1950 | 65 J + 4 M | | 1960 | 66 J + 4 M |
| 1951 | 65 J + 5 M | | 1961 | 66 J + 6 M |
| 1952 | 65 J + 6 M | | 1962 | 66 J + 8 M |
| 1953 | 65 J + 7 M | | 1963 | 66 J + 10 M |
| 1954 | 65 J + 8 M | | **ab 1964** | **67 Jahre** |
| 1955 | 65 J + 9 M | | | |

Ab Jahrgang 1959 steigt die Grenze in Zwei-Monats-Schritten statt in Einzelmonaten. Die Tabelle gehört ins versionierte Konstanten-Set; geprüft wird gegen `geburtsdatum` und `pruefungsStichtag`, nicht gegen das Geburtsjahr allein — der Monat entscheidet mit.
- [x] Angemessenheitsgrenze für Unterkunftskosten — **entschieden**: Es wird die **volle Miete angesetzt**, keine Pauschale. Die Grenze legt jede Kommune selbst fest, ein bundesweiter Datensatz existiert nicht, und eine erfundene Pauschale wäre in teuren Städten zu niedrig und auf dem Land zu hoch. Der Report sagt dafür ausdrücklich: „Das Amt erkennt Unterkunftskosten nur bis zu einer örtlichen Angemessenheitsgrenze an. Liegt deine Miete darüber, kann der Betrag niedriger ausfallen." Damit rechnet die App für teure Wohnungen nachvollziehbar zu hoch statt willkürlich falsch
- [x] Mehrbedarfe — **entschieden**: Alleinerziehung und Schwangerschaft rechnen **im MVP mit**. Ohne sie liegt das Ergebnis für Alleinerziehende systematisch zu niedrig, und das ist eine Kerngruppe. Der Mehrbedarf bei Merkzeichen G ist bereits abgebildet
- [ ] Kostenaufwändige Ernährung bleibt Post-MVP — sie setzt eine ärztliche Bescheinigung voraus und lässt sich nicht aus Wizard-Angaben ableiten. Der Report nennt sie als möglichen zusätzlichen Posten
