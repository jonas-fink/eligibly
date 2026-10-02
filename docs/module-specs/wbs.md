# Modul-Spec: Wohnberechtigungsschein (WBS)

Teil von: [SPEC.md](../../SPEC.md) — Abschnitt 3/6
Berechnungstiefe: **detailliert** · Berechnungsart: `berechtigung` (kein Geldbetrag)
Quellen (Stand der recherchierten Werte: 2026, vor Umsetzung erneut prüfen):
- [sozialrecht-lotse.de – Info Wohnberechtigungsschein](https://sozialrecht-lotse.de/info-wohnberechtigungsschein.html)
- [berlinecho.de – WBS-Einkommensgrenzen Berlin 2026](https://berlinecho.de/wbs-einkommensgrenzen-berlin/)

## 0. Wichtiger Hinweis: Ländersache

Wohnraumförderung — und damit die konkreten Einkommensgrenzen für den WBS — ist **Ländersache** (Wohnraumförderungsgesetz, WoFG, gibt nur Basiswerte vor; die meisten Bundesländer/Städte haben davon abweichende, meist höhere Grenzen). Beispiel Berlin 2026 vs. andere Bundesländer zeigt Abweichungen von mehreren Tausend Euro. Dieses Modul kann im MVP **nicht** bundesweit einheitlich rechnen, ohne eine Tabelle mit Einkommensgrenzen für alle 16 Bundesländer (bzw. teils sogar kommunale Abweichungen) zu pflegen — das ist der größte offene Punkt dieses Moduls.

## 1. Anspruchsvoraussetzungen (fachlich)

1. Haushaltseinkommen (nach Abzug von Pauschalen/Freibeträgen, siehe Abschnitt 3) unterhalb der landesspezifischen Einkommensgrenze.
2. Wohnsitz/Wohnungssuche im jeweiligen Bundesland/der jeweiligen Kommune, für die der WBS gilt.
3. Kein Ausschlussgrund (z. B. bereits ausreichender eigener Wohnraum) — im MVP nicht geprüft.

## 2. Zusätzliche Inputfelder (`systemSpecificAnswers`)

```ts
interface WbsAnswers {
  // optional, falls das Bundesland kommunale Sonderregeln hat (z. B. Berlin, München):
  gemeindeOderBezirk?: string;
}
```

`bundesland` liegt seit SPEC v0.4 im Kernmodell (`wohnsituation.bundesland`) und wird hier nicht mehr separat abgefragt.

**Einkommensbegriff** (Review-Befund B1, gelöst): Die WBS-Berechnung basiert auf einem bereinigten **Brutto-Jahreseinkommen**. Mit dem überarbeiteten Kernmodell ist das ableitbar: `summe(mitglieder[].einkommen.bruttoMonatlich) * 12`. Ein eigenes Feld ist nicht mehr nötig.

**Offen bleibt**: ob Monatswert × 12 ausreicht oder ob Sonderzahlungen (13. Gehalt, Boni) separat erfasst werden müssen — bei einer Jahresgrenze fallen die stärker ins Gewicht als bei monatlichen Prüfungen.

## 3. Berechnungslogik (detailliert, aber landesabhängig)

```
// 1. Bereinigtes Jahreseinkommen ermitteln (vereinfacht nach WoFG-Grundprinzip)
bruttoJahreseinkommenHaushalt = summe(person.einkommen.bruttoMonatlich für alle Mitglieder) * 12
abzugPauschale = bruttoJahreseinkommenHaushalt * ABZUGSPAUSCHALE_PROZENT // ca. 30% für Steuern/Sozialabgaben
werbungskostenabzug = anzahlErwerbstaetigerPersonen * WERBUNGSKOSTENPAUSCHALE_JAEHRLICH
kinderfreibetrag = anzahlKinder * landDaten.kinderfreibetragJaehrlich

bereinigtesEinkommen = bruttoJahreseinkommenHaushalt - abzugPauschale - werbungskostenabzug - kinderfreibetrag
// Kindergeld und Wohngeld zählen laut Recherche nicht als Einkommen

// 2. Landesdaten laden — im MVP nur BE, NW, BY, HH (siehe 4.2)
landDaten = WBS_DATEN[bundesland]

// Datenlücke ist KEIN 'vielleicht' (Review-Befund C2)
if (landDaten == null):
    return { voraussetzungenErfuellt: false, betrag: 0,
             datenluecken: [`Einkommensgrenzen für ${bundesland} noch nicht hinterlegt`] }
    // → Report zeigt eligible: 'nicht_pruefbar', nicht 'vielleicht'

// 3. Höchste Stufe ermitteln, für die der Haushalt qualifiziert
erreichteStufe = letzte Stufe aus landDaten.stufen mit
                 bereinigtesEinkommen <= grenzeFuer(stufe, anzahlPersonen, anzahlKinder)

voraussetzungenErfuellt = erreichteStufe != null
betrag                  = 0                  // WBS ist eine Berechtigung, kein Geldbetrag
betragsart              = 'keineGeldleistung'  // UI zeigt nie "0 €", siehe SPEC 6.5.4
berechtigungsumfang     = { stufe: erreichteStufe.name, personen: anzahlPersonen }
```

## 4. Konstanten

### 4.1 Bundesweit einheitliche Pauschalen

| Konstante | Recherchierter Wert (2026) | Quelle/Stand |
|---|---|---|
| `ABZUGSPAUSCHALE_PROZENT` | bis zu 30 % (Steuern, Kranken-/Rentenversicherung) | sozialrecht-lotse.de, 2026 |
| `WERBUNGSKOSTENPAUSCHALE_JAEHRLICH` | mind. 1.230 € pro erwerbstätiger Person | sozialrecht-lotse.de, 2026 |
| Gültigkeitsdauer WBS | i. d. R. 1 Jahr; Bestandsschutz nach Anmietung auch bei späterem höherem Einkommen | sozialrecht-lotse.de, 2026 |

### 4.2 Einkommensgrenzen je Bundesland — und warum es keine gemeinsame Struktur gibt

Die Recherche zeigt: Die vier abgedeckten Länder unterscheiden sich nicht nur in den Beträgen, sondern in der **Struktur**. Berlin kennt WBS-Typen (100/140/160), NRW Einkommensgruppen (A/B), Bayern drei Förderstufen, Hamburg drei Förderwege. Ein einzelnes Feld `einkommensgrenze` je Land bildet das nicht ab.

**Festlegung**: Jedes Land liefert eine Liste benannter Stufen. Das Ergebnis nennt die **höchste Stufe, für die der Haushalt qualifiziert** — das ist die Information, mit der ein Nutzer eine Wohnung suchen kann.

```ts
interface WbsStufe {
  name: string;                 // wie das Land sie nennt, z. B. "WBS 140", "Einkommensgruppe A"
  grenze1Person: number;        // Jahresbetrag
  grenze2Personen: number;
  zuschlagJeWeiterePerson: number;
  zuschlagJeKind: number;       // zusätzlich zum Personenzuschlag
}
type WbsLandDaten = { stufen: WbsStufe[]; kinderfreibetragJaehrlich: number } | null;  // null = nicht_pruefbar
```

**Berlin** (berlinecho.de, 2026) — Kinderfreibetrag 1.000 €/Kind

| Stufe | 1 Person | 2 Personen | je weitere Person |
|---|---|---|---|
| WBS 100 | 18.200 € | 26.600 € | + 5.800 € |

> Berlin kennt zusätzlich WBS 140 und 160 mit höheren Grenzen für andere Wohnungssegmente; deren Werte sind noch nicht erhoben (siehe Offene Punkte).

**Nordrhein-Westfalen** (wohnberechtigungsschein.net, Stand 04/2026; Werte gelten seit 01.01.2025) — Kinderfreibetrag 860 €/Kind

| Stufe | 1 Person | 2 Personen | je weitere Person |
|---|---|---|---|
| Einkommensgruppe A | 23.540 € | 28.350 € | + 6.530 € |
| Einkommensgruppe B | +40 % auf Gruppe A | +40 % | +40 % |

> Zusätzlich: 4.000 € Freibetrag für Zwei-Personen-Haushalte, Ehepaare und eingetragene Lebenspartnerschaften.

**Bayern** (wohnberechtigungsschein.net, Stand 04/2026, Art. 11 BayWoFG)

| Stufe | 1 Person | 2 Personen | je weitere Person | je Kind zusätzlich |
|---|---|---|---|---|
| Stufe I | 17.500 € | 27.500 € | + 5.000 € | + 1.300 € |
| Stufe II | 22.900 € | 35.350 € | + 7.850 € | + 2.250 € |
| Stufe III | 28.300 € | 43.200 € | + 10.700 € | + 3.200 € |

> Zusätzliche Freibeträge für GdB ab 50 sowie für Ehepaare und Lebenspartnerschaften in den ersten sieben Jahren — Beträge noch nicht erhoben.

**Hamburg** (wohnberechtigungsschein.net nach Stadt Hamburg, 2026) — Nettobeträge

| Stufe | 1 Person | 2 Personen | je weitere Person |
|---|---|---|---|
| 1. Förderweg | 19.200 € | 28.800 € | + ca. 8.100 € |
| 2. Förderweg | 24.000 € | 36.000 € | + ca. 12.200 € |
| 3. Förderweg | 28.800 € | 43.200 € | + ca. 12.200 € |

> **Achtung**: Hamburg nennt **Netto**beträge, die anderen drei Länder Bruttobeträge. Die Abzugspauschale aus 4.1 darf bei Hamburg deshalb nicht noch einmal angewendet werden. Vor Implementierung mit der Primärquelle (IFB Hamburg / Behörde für Stadtentwicklung und Wohnen) zu bestätigen — die Zuschläge sind in der Quelle zudem als „ca."-Werte angegeben.

### 4.3 Alle übrigen zwölf Bundesländer

`WbsLandDaten = null` → das Modul liefert `voraussetzungenErfuellt: false`, `betrag: 0` und einen `datenluecken`-Eintrag, der Report zeigt `nicht_pruefbar` (SPEC 6.5.1). Bewusste MVP-Entscheidung, kein Versehen: Die Quellenlage je Land ist sehr unterschiedlich, und ein geratener Grenzwert ist schlechter als eine ehrliche Datenlücke.

## 5. Ergebnis-Report (`naechsteSchritte`)

- `beschreibung`: "Der Wohnberechtigungsschein wird beim Wohnungsamt der Wohnortgemeinde beantragt und gilt meist 1 Jahr. Nach erfolgreicher Anmietung einer geförderten Wohnung besteht Bestandsschutz auch bei späterem höherem Einkommen."
- `benoetigteUnterlagen`: Einkommensnachweise aller Haushaltsmitglieder (letzte 12 Monate), Meldebescheinigung, ggf. Nachweis über Kinder/Unterhalt.
- `zustaendigeStelle`: "Wohnungsamt der Wohnortgemeinde bzw. zuständige Landesbehörde."

## 6. Offene Punkte dieses Moduls

- [x] Einkommensgrenzen-Tabelle — **entschieden und recherchiert (2026-09-07)**: MVP deckt Berlin, Nordrhein-Westfalen, Bayern und Hamburg ab (4.2); die übrigen zwölf Länder liefern `nicht_pruefbar` (4.3)
- [x] WBS-Typen/-Stufen — **abgebildet**: jedes Land liefert eine Liste benannter Stufen, das Ergebnis nennt die höchste erreichte (4.2). Die Struktur ist je Land verschieden (Typen / Einkommensgruppen / Förderstufen / Förderwege) und lässt sich nicht vereinheitlichen
- [x] Verhalten für Bundesländer ohne recherchierte Daten — gelöst über den Status `nicht_pruefbar` mit `datenluecken` (SPEC 6.5.1); UI-Formulierung entschieden in SPEC 6.5.3
- [x] Darstellung eines Ergebnisses ohne Geldbetrag in der UI — **entschieden (SPEC v0.5, 6.5.4)**: `betragsart: 'keineGeldleistung'`, Berechtigungsumfang statt Betrag
- [x] Brutto-Einkommensfeld im Kernmodell — gelöst in SPEC v0.4 (`einkommen.bruttoMonatlich`)
- [ ] **Hamburg ist strukturell anders erfasst, als die Tabelle in 4.2 annimmt.** Die IFB Hamburg beschreibt die Förderwege nicht über eigene Beträge, sondern als **prozentuale Überschreitung einer Grundgrenze nach § 8 HmbWoFG**: 1. Förderweg bis 60 %, 2. Förderweg bis 100 %, 3. Förderweg bis 140 % über der Grenze. Die absoluten Zahlen in 4.2 sind demnach abgeleitete Darstellungen, nicht die Norm.
  Nötig sind daher: die **Grundgrenze nach § 8 HmbWoFG** je Haushaltsgröße, die Bezugsgröße (brutto oder netto) und die Abzugsregeln. Bis dahin bleibt Hamburg besser bei `nicht_pruefbar`, als mit Zahlen zu rechnen, deren Bezugssystem unklar ist — ein Prozentband auf eine unbekannte Grundgrenze anzuwenden ergibt keinen belastbaren Wert
- [ ] Berlin WBS 140 und 160: Grenzen erheben (bisher nur WBS 100)
- [ ] Landesspezifische Zusatzfreibeträge erheben: NRW 4.000 € für Zwei-Personen-Haushalte und Ehepaare; Bayern GdB ab 50 sowie Ehe/Lebenspartnerschaft in den ersten sieben Jahren
- [ ] Berechtigte Wohnungsgröße je Haushaltsgröße (m²/Zimmer) je Land erheben — das ist der Inhalt, den die Ergebniskarte nach SPEC 6.5.4 anstelle eines Betrags anzeigt. Ohne diese Werte bleibt die Karte inhaltsleer
- [x] Kommunale Sonderregeln — **entschieden**: Der MVP rechnet mit den **landesweiten Werten** und zeigt in Gemeinden mit bekannten Sonderregeln einen Hinweis: „In [Gemeinde] gelten eigene Einkommensgrenzen, die von den Landeswerten abweichen können. Frag beim Wohnungsamt nach." Die Gemeinde ist ohnehin bekannt, weil Wohngeld sie erhebt ([wohngeld.md](wohngeld.md) 4.4) — der Hinweis kostet also nur eine Liste betroffener Gemeindeschlüssel, keinen zweiten Datensatz
- [ ] Liste der Gemeinden mit bekannten WBS-Sonderregeln anlegen (mindestens München und Hamburg) — als `gemeinden-mit-sonderregeln.json` neben den übrigen Referenzdaten
- [x] Sonderzahlungen im Jahreseinkommen — **entschieden**: eigenes optionales Feld statt Monatswert × 12. Der Wizard fragt „Bekommst du Weihnachts-, Urlaubsgeld oder Boni? (ungefähr im Jahr)"; der Betrag wird auf das Jahreseinkommen addiert.

```
jahresBrutto = bruttoMonatlich * 12 + (sonderzahlungenJaehrlich ?? 0)
```

Begründung: Der WBS rechnet mit Jahresbeträgen, und die Einkommensgrenzen sind Schwellen — ein 13. Gehalt kann allein über die Grenze heben. Ein zu niedrig geschätztes Jahreseinkommen erzeugt genau den Fehler, der am meisten schadet: ein „ja", das beim Amt zum „nein" wird. Neues Feld: `sonderzahlungenJaehrlich?: number`
- [ ] Post-MVP: weitere Bundesländer nach Nutzernachfrage ergänzen; die Datenstruktur aus 4.2 ist dafür ausgelegt
