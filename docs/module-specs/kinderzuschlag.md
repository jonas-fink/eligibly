# Modul-Spec: Kinderzuschlag (KiZ)

Teil von: [SPEC.md](../../SPEC.md) — Abschnitt 3/6
Berechnungstiefe: **detailliert** · Berechnungsart: `bedarfsdeckung`
Quellen (Stand der recherchierten Werte: 2026, vor Umsetzung erneut prüfen):
- [dgb.de – Kinderzuschlag und Kindergrundsicherung](https://www.dgb.de/service/ratgeber/kinderzuschlag-und-kindergrundsicherung/)
- [kindergeld.org – Kinderzuschlag 2026](https://www.kindergeld.org/blog/kinderzuschlag/)

## 1. Anspruchsvoraussetzungen (fachlich)

1. Kindergeldanspruch besteht für das jeweilige Kind.
2. Kind ist unter 25 Jahre, unverheiratet, lebt im Haushalt der Eltern.
3. Elterneinkommen erreicht die Mindesteinkommensgrenze:
   - Alleinerziehende: ≥ 600 € brutto/Monat
   - Paare: ≥ 900 € brutto/Monat
4. Elterneinkommen + Vermögen übersteigen nicht die individuelle Belastungsgrenze (Abschmelzung, siehe Abschnitt 3) — bei zu hohem Einkommen läuft der Anspruch aus, bei zu niedrigem Einkommen (unter der Brutto-Mindestgrenze) ist regulär die Neue Grundsicherung einschlägig.
5. Vermögen unterhalb des Freibetrags (siehe Abschnitt 4).
6. **Wechselwirkung mit Neuer Grundsicherung (cross-modul, zentral im Orchestrator)**: KiZ hat gemeinsam mit Wohngeld Vorrang vor der Neuen Grundsicherung, *wenn* beide zusammen die Bedürftigkeit des Haushalts vermeiden (§ 6a BKGG). Dieses Modul berechnet dafür immer den vollen, unkorrigierten Anspruch — die eigentliche Vermeidungsprüfung (Vergleich mit dem Bedarf der Neuen Grundsicherung) läuft zentral im Orchestrator, siehe [docs/orchestrator.md](../orchestrator.md). Das Modul selbst kennt den Zustand "Neue Grundsicherung" nicht und muss ihn auch nicht kennen.

## 2. Zusätzliche Inputfelder (`systemSpecificAnswers`)

```ts
interface KinderzuschlagAnswers {
  // pro Kind im Haushalt (istKind === true im Kernmodell)
  kindEinkommenMonatlich?: number; // z. B. Unterhalt, Unterhaltsvorschuss, Ausbildungsvergütung
}
```

`kindergeldWirdBezogen` liegt seit SPEC v0.4 im Kernmodell auf `Haushaltsmitglied` (siehe [SPEC.md 6.2.5](../../SPEC.md#625-kindergeld)) und wird hier nicht erneut abgefragt.

Aus dem Kernmodell übernommen: Elterneinkommen (`einkommen` der Personen mit `istHauptantragsteller` bzw. `istPartnerDesHauptantragstellers`), Wohnkosten (`wohnsituation`), `haushaltstyp` (steuert die Mindesteinkommensgrenze), `unterhaltErhalten`/`unterhaltGezahlt`.

**Einkommensbegriffe in diesem Modul** (siehe [SPEC.md 6.2.1](../../SPEC.md#621-einkommen--ein-begriff-reicht-nicht)):
- Mindesteinkommensgrenze (600/900 €): **brutto** → `einkommen.bruttoMonatlich`
- Bedarfsrechnung und Abschmelzung: **netto** → `einkommen.nettoMonatlich`

## 3. Berechnungslogik (detailliert)

```
// 0. Mindesteinkommensprüfung — BRUTTO (Review-Befund A2)
elternEinkommenBrutto = summe(einkommen.bruttoMonatlich der Eltern)
mindestgrenze = haushaltstyp === 'alleinerziehend'
  ? MINDESTEINKOMMEN_ALLEINERZIEHEND   // 600 € brutto
  : MINDESTEINKOMMEN_PAAR              // 900 € brutto
mindesteinkommenErreicht = elternEinkommenBrutto >= mindestgrenze

// 1. Elternbedarf ermitteln (analog SGB-II-Bedarfsberechnung, siehe Modul Neue Grundsicherung)
elternRegelbedarf = summe(regelsatz(elternteil, haushalt) für alle Elternteile)
elternKdUAnteil   = warmmiete * (anzahlEltern / anzahlPersonen)  // vereinfachter Verteilschlüssel, siehe Offene Punkte
elternBedarf      = elternRegelbedarf + elternKdUAnteil

// 2. Abschmelzung — NETTO, nach Abzug der Erwerbstätigenfreibeträge (§ 11b SGB II, siehe 4.2)
elternEinkommenNetto     = summe(einkommen.nettoMonatlich der Eltern)
elternEinkommenBereinigt = elternEinkommenNetto - erwerbstaetigenfreibetrag(elternEinkommenBrutto)
ueberschuss              = max(0, elternEinkommenBereinigt - elternBedarf)
abschmelzungGesamt       = ueberschuss * ABSCHMELZUNGSSATZ_ELTERNEINKOMMEN  // 45 %

// 3. Pro Kind: Höchstbetrag minus 45 % des eigenen Einkommens des Kindes (§ 6a Abs. 3 BKGG)
kizProKind(kind) = max(0, HOECHSTBETRAG_KIZ_PRO_KIND
                        - (kindEinkommenMonatlich(kind) ?? 0) * ANRECHNUNGSSATZ_KINDESEINKOMMEN)

// 4. Abschmelzung EINMAL auf die Summe anwenden, nicht pro Kind (Review-Befund A3)
gesamtKiz = max(0, summe(kizProKind(kind) für alle Kinder) - abschmelzungGesamt)

// 5. Ergebnis
voraussetzungenErfuellt =
  mindesteinkommenErreicht AND
  vermoegenGesamt <= vermoegensfreibetrag(anzahlPersonen, anzahlKinder) AND
  mindestens ein Kind mit kindergeldWirdBezogen === true

betrag = gesamtKiz  // monatlich

// 6. Abgeleitete Höchsteinkommensgrenze — nur für den Report, nicht für die Rechnung (siehe 4.1)
hoechsteinkommensgrenze = elternBedarf + summe(kizProKind(kind)) / ABSCHMELZUNGSSATZ_ELTERNEINKOMMEN
teilbetraege = [{ personId: kind.id, betrag: anteiliger Betrag je Kind }]  // siehe Hinweis unten
```

**Zur Verteilung der Abschmelzung (Review-Befund A3)**: In v1 stand hier ein undefiniertes `anteiligeAbschmelzung(...)`. Ob der Elternüberschuss *pro Kind* oder *einmal auf die Summe* abgezogen wird, macht bei drei Kindern einen Unterschied von mehreren hundert Euro. Festlegung: **einmal auf die Summe**, weil der Überschuss eine Eigenschaft des Elterneinkommens ist und nicht pro Kind erneut entsteht. Für die Anzeige der `teilbetraege` pro Kind wird der verbleibende Gesamtbetrag proportional zu `kizProKind(kind)` verteilt.

**Wichtiger Hinweis zur Genauigkeit**: Die reale KiZ-Berechnung (§ 6a BKGG) ist komplexer (u. a. exakte Bedarfsermittlung nach SGB-II-Logik inkl. Erwerbstätigenfreibeträgen, gestaffelte Anrechnung, Wohnkosten-Verteilschlüssel). Die obige Logik ist eine belastbare Annäherung für eine "detaillierte" Vorabschätzung, aber kein Bescheid-Ersatz — das entspricht dem generellen Disclaimer aus Abschnitt 4 der Haupt-Spec.

## 4. Konstanten (TBD — vor Implementierung/jährlich zu verifizieren)

| Konstante | Recherchierter Wert (2026) | Quelle/Stand |
|---|---|---|
| `HOECHSTBETRAG_KIZ_PRO_KIND` | 297 €/Monat | Familienkasse, weiterhin 2026. Die Jahresformel aus Existenzminimum 6.696 €, Kindergeld 259 € und Bildung und Teilhabe 29 € läge darunter; der Vorjahresbetrag bleibt die Untergrenze. |
| `MINDESTEINKOMMEN_ALLEINERZIEHEND` | 600 € brutto/Monat | dgb.de, 2026 |
| `MINDESTEINKOMMEN_PAAR` | 900 € brutto/Monat | dgb.de, 2026 |
| `ABSCHMELZUNGSSATZ_ELTERNEINKOMMEN` | 45 % des Überschusses über Elternbedarf | kindergeld.org, 2026 |
| `ANRECHNUNGSSATZ_KINDESEINKOMMEN` | **45 %** (z. B. Unterhalt, Unterhaltsvorschuss) | § 6a Abs. 3 BKGG · dgb.de, 2026 |
| `VERMOEGENSFREIBETRAG_2_PERSONEN` | 55.000 € | kindergeld.org, 2026 |
| `VERMOEGENSFREIBETRAG_3_PERSONEN` | 70.000 € | kindergeld.org, 2026 |
| `VERMOEGENSFREIBETRAG_JE_WEITERES_KIND` | + 15.000 € | kindergeld.org, 2026 |

Selbstbewohnte Immobilien und private Altersvorsorge zählen laut Quelle nicht zum anrechenbaren Vermögen (analog zu Schonvermögen-Regeln in anderen Modulen).

> **Korrektur gegenüber v1**: `ANRECHNUNGSSATZ_KINDESEINKOMMEN` stand auf 100 %. § 6a Abs. 3 BKGG lautet: „Der Kinderzuschlag wird um 45 Prozent des zu berücksichtigenden Einkommens des Kindes monatlich gemindert." Die 100 % waren die Rechtslage **vor** der Reform 2020. Der Fehler wirkt sich unmittelbar aus: Bei 250 € Unterhaltsvorschuss wurde der Kinderzuschlag um 250 € statt um 112,50 € gekürzt — in vielen Fällen der Unterschied zwischen „Anspruch" und „kein Anspruch". Die Anrechnungstabelle des Orchestrators ist entsprechend zu korrigieren ([docs/orchestrator.md](../orchestrator.md) Abschnitt 6).

### 4.1 Höchsteinkommensgrenze — keine Konstante, sondern abgeleitet

§ 6a BKGG nennt **keine** Höchsteinkommensgrenze. Sie ergibt sich aus der Abschmelzung: Der Anspruch endet, wenn die 45 % des Einkommens über der Bemessungsgrenze den Gesamt-Kinderzuschlag aufzehren.

```
gesamtKiZ            = anzahlKinder * HOECHSTBETRAG_KIZ_PRO_KIND - kindeseinkommenAnrechnung
hoechsteinkommensgrenze = bemessungsgrenze + gesamtKiZ / 0.45
```

Die Grenze ist damit haushaltsindividuell — sie hängt an Kinderzahl, Elternbedarf und Wohnkosten. Eine Tabelle wäre nicht nur unnötig, sondern falsch: Jede veröffentlichte „Höchsteinkommensgrenze" ist ein Beispielwert für eine bestimmte Konstellation.

### 4.2 Erwerbstätigenfreibeträge (§ 11b SGB II)

Das Elterneinkommen wird „entsprechend der Vorschriften des SGB II bereinigt" — dieselben Freibeträge wie bei der Neuen Grundsicherung:

| Einkommensbereich | Freibetragssatz | maximal anrechnungsfrei |
|---|---|---|
| Grundfreibetrag | pauschal | 100 € |
| 100 – 520 € | 20 % | 84 € |
| 520 – 1.000 € | 30 % | 144 € |
| 1.000 – 1.200 € | 10 % | 20 € |
| 1.000 – 1.500 € (mit minderjährigem Kind in der Bedarfsgemeinschaft) | 10 % | 50 € |

Summe: maximal 348 € ohne Kind, **378 € mit Kind** — beim Kinderzuschlag greift praktisch immer die Variante mit Kind. Quelle: sozialrat.org, Stand 2026; unverändert seit der Reform 2023.

Der Freibetrag wird **je Elternteil** auf `einkommen.arten.erwerbstaetigkeit` gerechnet, nicht auf die Summe der Bruttoeinkommen. § 11b ist personenbezogen, und Rente fällt nicht darunter. Die Pseudocode-Zeile mit einem Aufruf auf das summierte Brutto würde zwei Verdienste in eine Staffel pressen.

## 5. Ergebnis-Report (`naechsteSchritte`)

- `beschreibung`: "Kinderzuschlag wird zusammen mit oder zusätzlich zum Kindergeld bei der Familienkasse beantragt."
- `benoetigteUnterlagen`: Kindergeldbescheid, Einkommensnachweise der Eltern, Nachweis Unterhalt/Unterhaltsvorschuss (falls zutreffend), Mietvertrag/Nebenkostenabrechnung.
- `zustaendigeStelle`: "Familienkasse der Bundesagentur für Arbeit."

## 6. Offene Punkte dieses Moduls

- [x] Verteilung der Abschmelzung auf mehrere Kinder — festgelegt: einmal auf die Summe (Abschnitt 3)
- [ ] Exakter Wohnkosten-Verteilschlüssel Eltern/Kinder (aktuell vereinfacht nach Kopfzahl) — mit realer SGB-II-Praxis abgleichen
- [ ] Vollständige Mindesteinkommens-/Vermögensfreibetrags-Tabelle für Haushalte mit mehr als 3 Personen / mehreren Kindern
- [x] Höchsteinkommensgrenze — **geklärt**: existiert nicht als Konstante, fällt aus der Abschmelzungsformel (Abschnitt 4.1)
- [x] Erwerbstätigenfreibeträge bei Elterneinkommen — **recherchiert** (§ 11b SGB II, Abschnitt 4.2); in die Berechnungslogik einzubauen
- [x] Anrechnungssatz Kindeseinkommen — **korrigiert** von 100 % auf 45 % (§ 6a Abs. 3 BKGG)
- [x] `VERMOEGENSFREIBETRAG_*` — **geprüft, und die Werte sind veraltet.** § 6a Abs. 1 BKGG verlangt, dass kein „erhebliches Vermögen" vorliegt, und definiert das **über § 12 SGB II** — nicht mit eigenen Beträgen. Die bisherigen Werte stammen erkennbar aus der Karenzzeit-Regelung: 55.000 € = 40.000 € (erste Person) + 15.000 €, 70.000 € = + noch eine Person, „+15.000 € je weiteres Kind" ist derselbe Zuschlag.

**Diese Karenzzeit ist zum 01.07.2026 ersatzlos entfallen** (siehe [buergergeld.md](buergergeld.md) 4.2). Seither gilt ab dem ersten Tag eine **altersgestaffelte Grenze pro Person**: 5.000 € bis 30 Jahre, 10.000 € ab 31, 12.500 € ab 41, 20.000 € ab 51; nicht ausgeschöpfte Freibeträge einzelner Mitglieder kommen den übrigen zugute.

Da § 6a BKGG auf § 12 SGB II verweist statt eigene Zahlen zu nennen, folgt der Kinderzuschlag dieser Änderung automatisch. Die Konstanten werden deshalb **gestrichen und durch den Verweis ersetzt**:

```
vermoegensfreibetrag = summe über alle Haushaltsmitglieder:
    alter <= 29 ? 5_000 : alter <= 40 ? 10_000 : alter <= 50 ? 12_500 : 20_000
// identisch mit der Berechnung in buergergeld.md — eine Implementierung,
// zwei Aufrufer. Nicht duplizieren.
```

Der Unterschied ist erheblich: Eine Familie mit zwei Erwachsenen um die 35 und zwei Kindern hatte nach der alten Rechnung 85.000 €, nach der neuen 30.000 €.

> **Vorbehalt**: Der Verweis von § 6a BKGG auf § 12 SGB II ist belegt, die Karenzzeit-Abschaffung ebenfalls. Keine der geprüften Quellen zieht die Folgerung für den Kinderzuschlag aber ausdrücklich — die Sekundärquellen führen noch die alten Zahlen. Vor dem Livegang gegen die **Durchführungsanweisung Kinderzuschlag (DA-KiZ)** der Bundesagentur prüfen, die den Vollzug verbindlich regelt
- [x] Verhalten bei gleichzeitigem Anspruch auf Neue Grundsicherung — gelöst durch zentrale § 6a BKGG-Vermeidungsprüfung im Orchestrator, siehe [docs/orchestrator.md](../orchestrator.md)
