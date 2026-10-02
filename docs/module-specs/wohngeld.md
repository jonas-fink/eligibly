# Modul-Spec: Wohngeld (Miet- bzw. Lastenzuschuss)

Teil von: [SPEC.md](../../SPEC.md) — Abschnitt 3/6
Berechnungstiefe: **detailliert** (exakte Formel nach § 19 WoGG) · Berechnungsart: `bedarfsdeckung`
Stand: v6 (2026-09-07) — Inselregel abgebildet (32 Gemeinden), damit sind die Referenzdaten des Moduls vollständig
Vorher: v5 — Mietstufen-Nachschlagetabelle vollständig: PLZ→Gemeinde→Mietstufe für alle 10.712 Gemeinden, 100 % Abdeckung, gegen neun bekannte Werte stichprobengeprüft
Vorher: v4 — Mietstufen-Datensatz beschafft und aufbereitet (4.4, [data/README.md](../../data/README.md)); Nachschlagereihenfolge festgelegt
Vorher: v3 (2026-09-07) — Restlücken geschlossen: Anlage 2 und 3 vollständig (1–12 Mitglieder), Rechenschritte und Rundung nach Anlage 3, Bagatellgrenze § 21, Lastenzuschuss, Datenquellen. Formel gegen ein veröffentlichtes Beispiel verifiziert (Abschnitt 6).
Vorher: v2 — Hochstufung von `grob` auf `detailliert`, Anlage 1 korrigiert, Heiz-/Klimakomponente korrigiert

> **Änderung gegenüber v1**: Das Modul war als `grob` mit einer Tabellen-Heuristik und einem noch zu recherchierenden `einkommensRichtwert` geplant. Mit den vollständigen Anlagen 1, 2 und 3 ist die gesetzliche Formel direkt implementierbar — sie ist nicht aufwendiger als die Heuristik, aber exakt. Der Richtwert entfällt damit ersatzlos, ebenso die Betragsspanne.

Quellen (Stand der recherchierten Werte: 2026):
- [wohngeld.org – Wohngeld-Höchstbeträge (Anlage 1 WoGG)](https://www.wohngeld.org/wohnkosten/)
- [sozialrat.org – Wohngeld-Höhe, Formel § 19 WoGG und Anlage 2](https://sozialrat.org/wohngeld-hoehe-berechnung-formel-2026/)
- [dejure.org – § 12 WoGG (Höchstbeträge, Heizkosten- und Klimakomponente)](https://dejure.org/gesetze/WoGG/12.html)
- [dejure.org – § 16 WoGG (Abzugsbeträge)](https://dejure.org/gesetze/WoGG/16.html)
- [dejure.org – § 17 WoGG (Freibeträge)](https://dejure.org/gesetze/WoGG/17.html)
- [wohngeld.org – Mietstufen und ihre Festlegung](https://www.wohngeld.org/mietstufe/)
- [dejure.org – Anlage 2 WoGG (Werte a, b, c)](https://dejure.org/gesetze/WoGG/Anlage_2.html) — Fassung 01.01.2025
- [dejure.org – Anlage 3 WoGG (Rechenschritte und Rundungen)](https://dejure.org/gesetze/WoGG/Anlage_3.html) · [sozialgesetzbuch-sgb.de – Anlage 3](https://www.sozialgesetzbuch-sgb.de/wogg/anlage-3.html)
- [dejure.org – § 19 WoGG](https://dejure.org/gesetze/WoGG/19.html) · [§ 21 WoGG](https://dejure.org/gesetze/WoGG/21.html)
- [wohngeld.org – § 10 WoGG (Belastung)](https://www.wohngeld.org/wohngeldgesetz-wogg/paragraph10/) · [lxgesetze.de – § 13 WoGV](https://lxgesetze.de/wogv/13)
- [Destatis – Gemeindeverzeichnis GV-ISys](https://www.destatis.de/DE/Themen/Laender-Regionen/Regionales/Gemeindeverzeichnis/_inhalt.html)
- Gegenprobe: [smart-rechner.de – Wohngeld-Beispielrechnung](https://www.smart-rechner.de/wohngeld/beispiel.php)

## 1. Anspruchsvoraussetzungen (fachlich)

1. Wohnsitz in Deutschland, Miet- oder Eigentumsverhältnis (Mietzuschuss für Mieter, Lastenzuschuss für Eigentümer selbstgenutzten Wohnraums).
2. **Ausschluss-/Vorrangregel (cross-modul, zentral im Orchestrator)**: Wer bereits die Neue Grundsicherung, Grundsicherung im Alter/bei Erwerbsminderung, Übergangsgeld, Verletztengeld oder Hilfe zum Lebensunterhalt bezieht — und dabei die Unterkunftskosten bereits in dieser Leistung berücksichtigt werden — hat **keinen** zusätzlichen Wohngeldanspruch (§ 7 WoGG). Diese Regel wird **nicht** im Wohngeld-Modul selbst geprüft, sondern zentral im Orchestrator angewendet (siehe [docs/orchestrator.md](../orchestrator.md)) — das Modul berechnet seinen Anspruch immer unabhängig, der Orchestrator setzt ihn danach ggf. auf 0.
3. Bedürftigkeit ergibt sich aus dem Verhältnis von Miete/Belastung, Einkommen und Haushaltsgröße (siehe Formel unten).

## 2. Zusätzliche Inputfelder (`systemSpecificAnswers`)

```ts
interface WohngeldAnswers {
  /** Amtlicher Gemeindeschlüssel; die Mietstufe wird daraus abgeleitet (siehe Abschnitt 4.4). */
  gemeindeschluessel?: string;
  /** Fallback, wenn die Gemeinde nicht auflösbar ist — dann Status nicht_pruefbar. */
  mietstufe?: 1 | 2 | 3 | 4 | 5 | 6 | 7;

  /** § 17 WoGG — Freibeträge; je Haushaltsmitglied zu erheben. */
  schwerbehindertGdB100?: string[];        // personIds
  opferNsVerfolgung?: string[];            // personIds

  /** Nur bei wohnverhaeltnis === 'eigentum' — Lastenberechnung, siehe 4.7. */
  zinsenUndTilgungMonatlich?: number;
  grundsteuerJaehrlich?: number;
  verwaltungskostenAnDritteJaehrlich?: number;
}
```

**`gebaeudeEnergetischSaniert` entfällt.** Die Klimakomponente nach § 12 Abs. 7 WoGG hängt nicht am Sanierungszustand des Gebäudes, sondern nur an der Haushaltsgröße — sie ist ein pauschaler Zuschlag zum Höchstbetrag für alle (siehe 4.2). Das Feld beruhte auf einer Fehlannahme in v1.

`wohnverhaeltnis` liegt seit SPEC v0.4 im Kernmodell (`wohnsituation.wohnverhaeltnis`) und wird hier nicht mehr separat abgefragt — es wird auch von anderen Modulen gebraucht.

Kein Feld für den Bezug anderer Leistungen — das prüft der Orchestrator anhand der tatsächlich berechneten Ergebnisse (siehe [docs/orchestrator.md](../orchestrator.md)), nicht als Nutzereingabe.

Aus dem Kernmodell: `warmmiete` (computed), `wohnflaeche` (für Heiz-/Klimakomponente), `gesamtEinkommenBruttoMonatlich`.

**Einkommensbegriff**: Das WoGG hat einen eigenen bereinigten Einkommensbegriff (§§ 13–18 WoGG). Er wird jetzt vollständig abgebildet (siehe 4.5) und geht vom **Bruttoeinkommen** aus: `einkommen.bruttoMonatlich` je Haushaltsmitglied, davon pauschale Abzüge nach § 16 und Freibeträge nach § 17.

`wohnflaeche` wird für die Berechnung **nicht** mehr gebraucht — weder Heiz- noch Klimakomponente bemessen sich nach Quadratmetern (siehe 4.2).

## 3. Berechnungslogik (detailliert)

```
// Datenlücke zuerst: ohne Mietstufe ist keine Aussage möglich
if (mietstufe weder angegeben noch aus der Gemeinde ableitbar):
    return { voraussetzungenErfuellt: false, betrag: 0,
             datenluecken: ['Mietstufe für diesen Wohnort nicht hinterlegt'] }
    // → Report zeigt eligible: 'nicht_pruefbar', NICHT 'nein' (SPEC 6.5.1)

n = anzahlZuBeruecksichtigenderHaushaltsmitglieder

// 1. Zu berücksichtigende Miete M (§ 11, § 12 WoGG)
hoechstbetrag = ANLAGE_1[n][mietstufe]
              + HEIZKOSTENKOMPONENTE[n]
              + KLIMAKOMPONENTE[n]
M = min(bruttokaltmiete, hoechstbetrag)     // Bruttokaltmiete = Kaltmiete + kalte Nebenkosten
M = max(M, ANLAGE_3_MINDEST_M[n])           // Mindestwert

// 2. Gesamteinkommen Y (§§ 13-18 WoGG, siehe 4.5)
Y = max(bereinigtesGesamteinkommen(), ANLAGE_3_MINDEST_Y[n])

// 3. Wohngeld (§ 19 WoGG, Rechenschritte und Rundung nach Anlage 3 — siehe 4.6)
W = berechneNachAnlage3(n, M, Y)      // liefert bereits auf volle Euro gerundet

// 4. § 19 Abs. 3: mehr als 12 Haushaltsmitglieder
if (n > 12) W = min(W + 65 * (n - 12), M)

// 5. § 21 Nr. 1 WoGG — Bagatellgrenze
betrag = W >= BAGATELLGRENZE ? W : 0   // 10 €, ab 2027 voraussichtlich 15 €

voraussetzungenErfuellt = betrag > 0
imGrenzbereich          = betrag === 0 && W > 0   // Anspruch rechnerisch da, aber unter der Bagatellgrenze
bedarf                  = M
anrechenbaresEinkommen  = Y
bedarfsluecke           = betrag
```

**Kein `betragSpanne` mehr.** Mit `genauigkeit: 'detailliert'` gibt das Modul einen Punktbetrag aus. Die verbleibende Unsicherheit liegt nicht in der Formel, sondern in den Eingaben (Mietstufe, Einkommensbereinigung) — und die gehört in `datenluecken`, nicht in eine künstliche Spanne.

**Zur Bagatellgrenze**: Ein rechnerischer Anspruch zwischen 1 € und 9 € führt zu `betrag: 0`, aber nicht zu einem schlichten „nein". Der Haushalt liegt an der Anspruchsgrenze — das ist genau der Fall, für den `imGrenzbereich` gedacht ist (SPEC 6.3.1). Der Report sagt dann sinngemäß: „rechnerisch knapp über der Schwelle, der Anspruch liegt aber unter dem gesetzlichen Mindestbetrag von 10 €".

**Für Eigentum** greift statt der Miete die Belastung nach § 10 WoGG — siehe 4.7. Ab dort ist die Rechnung identisch.

## 4. Konstanten

### 4.1 Anlage 1 WoGG — Höchstbeträge für Miete und Belastung

Gültig für **2025 und 2026 unverändert**; die nächste Dynamisierung nach § 43 WoGG greift zum 01.01.2027 (zweijährig). Alle Beträge in Euro pro Monat.

| Haushaltsmitglieder | MS I | MS II | MS III | MS IV | MS V | MS VI | MS VII |
|---|---|---|---|---|---|---|---|
| 1 | 361 | 408 | 456 | 511 | 562 | 615 | 677 |
| 2 | 437 | 493 | 551 | 619 | 680 | 745 | 820 |
| 3 | 521 | 587 | 657 | 737 | 809 | 887 | 975 |
| 4 | 608 | 686 | 766 | 858 | 946 | 1.035 | 1.139 |
| 5 | 694 | 782 | 875 | 982 | 1.080 | 1.183 | 1.302 |
| 6 | 776 | 876 | 981 | 1.101 | 1.209 | 1.332 | 1.465 |
| je weiteres | +82 | +94 | +106 | +119 | +129 | +149 | +163 |

> **Korrektur gegenüber v1**: Die Tabelle in v1 (404 € für MS I / 1 Person usw.) war falsch — vermutlich ein Vor-2025-Stand. Die Werte hier stammen aus zwei unabhängigen Quellen, die exakt übereinstimmen, und sind gegen § 12 Abs. 6/7 gegengerechnet (siehe 4.2).

### 4.2 § 12 Abs. 6 und 7 WoGG — Heizkosten- und Klimakomponente

> **Korrektur gegenüber v1**: v1 setzte `HEIZKOSTENKOMPONENTE = 2 €/m²` und `KLIMAKOMPONENTE = 0,40 €/m²`, letztere nur für energetisch sanierte Gebäude. Beides ist falsch. Beide Komponenten sind **pauschale Zuschläge zum Höchstbetrag, gestaffelt nach Haushaltsgröße** — die Wohnfläche spielt keine Rolle, und die Klimakomponente hängt nicht am Sanierungszustand.

| Haushaltsmitglieder | Heizkostenkomponente (§ 12 Abs. 6) | Klimakomponente (§ 12 Abs. 7) |
|---|---|---|
| 1 | 110,40 € | 19,20 € |
| 2 | 142,60 € | 24,80 € |
| je weiteres | +27,60 € | +4,80 € |

Daraus abgeleitet: 3 Personen 170,20 / 29,60 €, 4 Personen 197,80 / 34,40 €, 5 Personen 225,40 / 39,20 €, 6 Personen 253,00 / 44,00 €.

**Konsistenzprüfung** (dient zugleich als Testfall): Anlage-1-Wert + beide Komponenten muss den in den Quellen ausgewiesenen Gesamt-Höchstbetrag ergeben. Beispiel 1 Person, Mietstufe I: 361 + 110,40 + 19,20 = 490,60 €. Das geht in allen 49 Zellen auf.

### 4.3 Anlage 2 WoGG — Koeffizienten a, b, c

Fassung vom 01.01.2025 (Zweite Verordnung zur Fortschreibung des Wohngeldes vom 21.10.2024). Vollständig für 1 bis 12 Haushaltsmitglieder.

| Mitglieder | a | b | c |
|---|---|---|---|
| 1 | 0,04000 | 0,0004797 | 0,0000408 |
| 2 | 0,03000 | 0,0003571 | 0,0000304 |
| 3 | 0,02000 | 0,0002917 | 0,0000245 |
| 4 | 0,01000 | 0,0002163 | 0,0000176 |
| 5 | 0 | 0,0001907 | 0,0000172 |
| 6 | −0,01000 | 0,0001722 | 0,0000166 |
| 7 | −0,02000 | 0,0001592 | 0,0000165 |
| 8 | −0,03000 | 0,0001583 | 0,0000165 |
| 9 | −0,04000 | 0,0001376 | 0,0000166 |
| 10 | −0,06000 | 0,0001249 | 0,0000166 |
| 11 | −0,09000 | 0,0001141 | 0,0000196 |
| 12 | −0,12000 | 0,0001107 | 0,0000221 |

**Mehr als 12 Haushaltsmitglieder** (§ 19 Abs. 3 WoGG): Die Anlage endet bei 12. Für jedes weitere Mitglied erhöht sich das Wohngeld um **65 €**, höchstens bis zur Höhe der berücksichtigten Miete oder Belastung. Gerechnet wird also mit den Werten für 12 und dem Zuschlag darüber.

> Damit entfällt die Zwischenlösung aus v2, Haushalte ab 7 Personen als `nicht_pruefbar` zu behandeln. Das Modul deckt jetzt jede Haushaltsgröße ab.

### 4.3.1 Höchstbeträge über 6 Haushaltsmitglieder

Anlage 1 (4.1) endet bei 6 Personen und nennt einen Mehrbetrag je weiterer Person. Für n > 6 gilt:

```
grundbetrag(n, ms) = ANLAGE_1[6][ms] + MEHRBETRAG[ms] * (n - 6)
```

Die Heiz- und Klimakomponenten aus 4.2 setzen ihre Staffelung ebenfalls linear fort (+27,60 € bzw. +4,80 € je weiterem Mitglied), sind also ohne Sonderregel fortschreibbar.

### 4.4 Mietstufe — Ermittlung über die Gemeinde

Die amtliche Zuordnung steht in der **Anlage zur Wohngeldverordnung (WoGV)**; das BMWSB veröffentlicht sie zusätzlich als PDF. Sie ist nach Gemeinde und Kreis gegliedert, nicht nach Postleitzahl. Eine PLZ kann mehrere Gemeinden umfassen, und die Mietstufe kann zwischen ihnen abweichen.

**Festlegung**: Der Wizard erhebt die PLZ, löst daraus über einen gebündelten PLZ→Gemeinde-Datensatz die in Frage kommenden Gemeinden auf und lässt den Nutzer wählen, wenn es mehr als eine gibt. Aus dem amtlichen Gemeindeschlüssel folgt die Mietstufe. Eine direkte PLZ→Mietstufe-Abbildung wird bewusst nicht gebaut: Sie müsste bei mehrdeutigen PLZ raten, und ein Fehler dort schlägt über den Höchstbetrag unmittelbar auf den Betrag durch.

**Die Nachschlagetabelle liegt vollständig vor.** [`data/mietstufen-lookup.json`](../../data/mietstufen-lookup.json) bildet den amtlichen Gemeindeschlüssel auf die Mietstufe ab, [`data/plz-index.json`](../../data/plz-index.json) die Postleitzahl auf die Gemeindeschlüssel.

| Kennzahl | Wert |
|---|---|
| Gemeinden mit Mietstufe | 10.712 von 10.712 (**100 %**) |
| Postleitzahlen | 8.159 |
| davon mehrdeutig (mehrere Gemeinden) | 1.465 (18 %) |
| davon mit **abweichender** Mietstufe | **255 (3,1 %)** |
| nicht zugeordnete Einträge aus dem BMWSB-PDF | 0 |

Erzeugt aus [`data/mietstufen-2023.json`](../../data/mietstufen-2023.json) (1.601 Gemeinden und 279 Kreise aus dem BMWSB-PDF) und `data/plz-gemeinden.csv` (OpenPLZ). Aufbau, Fallstricke und die Skripte zur reproduzierbaren Erzeugung: [data/README.md](../../data/README.md).

**Nur bei 255 von 8.159 Postleitzahlen muss der Wizard nach der Gemeinde fragen** — nämlich dort, wo sich die Mietstufe zwischen den Gemeinden einer Postleitzahl unterscheidet. Bei den übrigen 97 % genügt die Postleitzahl allein. Die Rückfrage aus Abschnitt 2 ist damit ein seltener Sonderfall und kein Regelschritt im Wizard.

**Verbindliche Nachschlagereihenfolge:**

```
1. Insel ohne Festlandanschluss           -> Mietstufe 5   (Sonderregel, 32 Gemeinden)
2. geprüfte Override-Liste                -> dortige Mietstufe (59 Gemeinden, 6 Kreise)
3. Gemeinde in laender[land].gemeinden    -> deren Mietstufe
4. Kreis der Gemeinde                     -> dessen Mietstufe
5. sonst                                  -> nicht_pruefbar mit datenluecken
```

Tatsächliche Verteilung über alle 10.712 Gemeinden: 32 über die Inselregel, 59 über Overrides, 1.548 über einen eigenen Gemeindeeintrag, 9.073 über den Kreis.

**Die Inselregel ist keine Randnotiz.** Von 32 Inselgemeinden hat genau eine einen eigenen Eintrag im BMWSB-PDF (die Gemeinde Sylt, ohnehin Stufe V). Alle übrigen liegen unter der 10.000-Einwohner-Schwelle und würden ohne die Regel den ländlichen Kreiswert erben: die ostfriesischen Inseln und Föhr/Amrum Stufe I statt V, Helgoland IV statt V, Hiddensee II statt V. Vier Stufen Unterschied schlagen beim Höchstbetrag voll durch. Details und Abgrenzungsfälle: [data/README.md](../../data/README.md).

Schritt 3 ist keine Notlösung, sondern die Regel des Quelldokuments: „Soweit die zu einem Kreis gehörenden Gemeinden in den Tabellen nicht gesondert aufgeführt sind, gilt die Mietenstufe des Kreises für diese Gemeinden." Nur rund 1.600 der etwa 11.000 Gemeinden sind einzeln aufgeführt — der Kreis-Fallback ist damit der **häufigere** Pfad, nicht der Ausnahmefall. Er setzt voraus, dass zu jeder Gemeinde ihr Kreis bekannt ist; das leistet erst der PLZ→Gemeinde-Datensatz.

**Schritt 4 rät nicht.** Kein Mittelwert, keine Nachbargemeinde, kein Landesdurchschnitt. Die Mietstufe geht linear in den Höchstbetrag und damit in den Auszahlbetrag ein; eine geratene Stufe erzeugt eine Zahl, die nach Präzision aussieht und keine ist.

> **Namensabgleich war der kritische Punkt.** Das BMWSB-PDF und das amtliche Gemeindeverzeichnis benutzen unterschiedliche Namenskonventionen: „Kassel, Stadt" gegen „Kassel, documenta-Stadt", München ganz ohne Zusatz, Stuttgart als „Landeshauptstadt". Gelöst über einen normalisierten Vergleichsschlüssel, vier Matching-Durchgänge und eine geprüfte Zuordnungsliste für 59 Gemeinden und 6 Kreise, die kein Automatismus zuverlässig findet — Abkürzungen, sorbische Doppelnamen, Namensänderungen und zwei Tippfehler im PDF. Details in [data/README.md](../../data/README.md).

**Stichprobenprüfung** (alle korrekt): Kassel 3, München 7, Berlin 4, Hamburg 6, Stuttgart 6, Köln 6, Frankfurt am Main 6 — sowie beide Weingarten in Baden-Württemberg, 88250 mit Stufe 5 und 76356 mit Stufe 3. Der Weingarten-Fall ist der Regressionstest für die Namensnormalisierung: Werden geografische Zusätze wie Statuszusätze behandelt, verschmelzen die beiden stillschweigend zu einem Eintrag.

### 4.5 Einkommensermittlung (§§ 13–18 WoGG)

```
je Haushaltsmitglied:
  jahresBrutto = bruttoMonatlich * 12
  abzuege = 0
  if (zahlt Einkommensteuer)                   abzuege += 10 %
  if (zahlt Kranken-/Pflegeversicherung)       abzuege += 10 %
  if (zahlt gesetzliche Rentenversicherung)    abzuege += 10 %
  bereinigt = jahresBrutto * (1 - abzuege)     // max. 30 %

haushaltsEinkommenJahr = Summe(bereinigt) - freibetraege
Y = haushaltsEinkommenJahr / 12
```

**§ 16 WoGG — pauschale Abzüge**: je 10 % für Steuern, für Kranken-/Pflegeversicherung und für gesetzliche Rentenversicherung, kumulativ, also maximal 30 %. Maßgeblich ist, ob die jeweilige Zahlung im Bewilligungszeitraum **erwartet** wird — nicht ihre tatsächliche Höhe.

**§ 17 WoGG — Freibeträge** (Jahresbeträge):

| Freibetrag | Betrag/Jahr | Voraussetzung |
|---|---|---|
| Schwerbehinderung | 1.800 € | je Haushaltsmitglied mit GdB 100, oder geringerer GdB bei häuslicher Pflegebedürftigkeit (§ 14 SGB XI) |
| NS-Verfolgung | 750 € | je betroffenem Haushaltsmitglied |
| Alleinerziehende | 1.320 € | Haushaltsmitglied wohnt ausschließlich mit Kindern, mindestens eines unter 18 mit Kindergeldbezug |
| Kindeseinkommen | bis 1.200 € | je Kind unter 25 im Haushalt, in Höhe seiner eigenen Erwerbseinkünfte |

Der Alleinerziehenden-Freibetrag wird aus `haushaltstyp === 'alleinerziehend'` abgeleitet (SPEC 6.2.4), nicht separat erhoben.

### 4.6 Anlage 3 WoGG — Mindestwerte, Rechenschritte und Rundung

> **Korrektur gegenüber v2**: Anlage 3 heißt „Rechenschritte und Rundungen", nicht „Mindestwerte". Sie enthält die Mindestwerte **und** die verbindliche Reihenfolge der Rechenschritte samt Rundungsregeln. Letztere waren in v2 gar nicht erfasst — für ein Modul mit `genauigkeit: 'detailliert'` sind sie aber Teil der Rechtsnorm, nicht eine Implementierungsfreiheit.

**Mindestwerte** (Fassung 01.01.2025). Liegen M oder Y darunter, werden sie durch den Tabellenwert ersetzt:

| Mitglieder | M | Y |
|---|---|---|
| 1 | 54 € | 396 € |
| 2 | 67 € | 679 € |
| 3 | 79 € | 906 € |
| 4 | 92 € | 1.132 € |
| 5 | 103 € | 1.358 € |
| 6 | 103 € | 1.585 € |
| 7 | 115 € | 1.811 € |
| 8 | 128 € | 2.037 € |
| 9 | 140 € | 2.264 € |
| 10 | 152 € | 2.490 € |
| 11 | 187 € | 2.717 € |
| 12 | 298 € | 2.943 € |

Dass M für 5 und 6 Mitglieder identisch ist und bei 11 und 12 stark springt, ist **kein Übertragungsfehler** — beide geprüften Quellen zeigen dasselbe Muster, auch in der älteren Fassung.

> **Vorsicht bei Nachrecherche**: Zwei sonst brauchbare Quellen (wohngeld.org, buzer.de) führen noch die Fassung des Wohngeld-Plus-Gesetzes vom 01.01.2023 mit M = 52 € / Y = 350 € für eine Person. Das ist der **veraltete** Stand. Maßgeblich ist die Fassung ab 01.01.2025, hier belegt durch dejure.org und sozialgesetzbuch-sgb.de.

**Rechenschritte** — verbindliche Reihenfolge, als Festkommazahlen mit **zehn Nachkommastellen**:

```
z1 = a + b · M + c · Y
z2 = z1 · Y
z3 = M − z2
z4 = 1,15 · z3
```

**Rundung**: `z4` ist das ungerundete monatliche Wohngeld. Es wird bis unter 0,50 € auf den nächsten vollen Euro **abgerundet**, ab 0,50 € **aufgerundet** (kaufmännisch).

Implementierungshinweis: Zehn Nachkommastellen als Festkomma bedeutet eine Dezimal-Arithmetik (z. B. `decimal.js`), **kein** `number`. Bei IEEE-754-Gleitkomma kann ein Ergebnis knapp an der 0,50-Grenze in den falschen Euro kippen — bei einer Leistung, auf die Menschen angewiesen sind, ist das kein akzeptabler Rundungsfehler.

### 4.7 Lastenzuschuss — Belastung statt Miete (§ 10 WoGG, §§ 11–14 WoGV)

Bei `wohnverhaeltnis === 'eigentum'` tritt an die Stelle der Miete die **Belastung**. Ab dem Höchstbetragsvergleich ist die Rechnung identisch — es ist derselbe Wert `M`, nur anders ermittelt.

```
belastung = kapitaldienst + bewirtschaftungskosten

kapitaldienst          = Zinsen + Tilgung für Darlehen
                       + gestundete öffentliche Lasten, Renten und laufende Nebenleistungen
bewirtschaftungskosten = wohnflaeche * 36 € / 12          // § 13 WoGV, 36 €/m² und Jahr
                       + grundsteuer / 12
                       + verwaltungskosten an Dritte / 12  // nur tatsächlich gezahlte
```

**Nicht ansetzbar**: Abschreibungen auf den selbstgenutzten Wohnraum, Zinsen für Eigenleistungen, Prämien für Risiko-Lebensversicherungen, Heizkosten. Über die genannten Beträge hinaus dürfen Bewirtschaftungskosten nicht angesetzt werden (§ 13 Satz 3 WoGV).

**Die Abkürzung für den Regelfall**: Erreichen oder übersteigen bereits Zins und Tilgung allein den Höchstbetrag nach § 12, kann die vollständige Lastenberechnung entfallen — `M` ist dann ohnehin der Höchstbetrag. Für Eigentümer mit laufender Finanzierung ist das der Normalfall.

**Festlegung für den MVP**:

1. Zins und Tilgung erreichen den Höchstbetrag → `M = Höchstbetrag`, volle Berechnung, Ergebnis wie beim Mietzuschuss.
2. Sonst → vollständige Lastenberechnung nach der Formel oben, sofern Wohnfläche und Grundsteuer erhoben wurden.
3. Fehlt eine der Größen → `nicht_pruefbar` mit `datenluecken`, **nicht** `vielleicht` (SPEC 6.5.1).

Damit ist der Lastenzuschuss im praktisch häufigsten Fall vollständig abgedeckt, ohne dass der Wizard eine komplette Lastenberechnung abfragen muss. Nötige Zusatzfelder bei Eigentum: `zinsenUndTilgungMonatlich`, `grundsteuerJaehrlich`, `verwaltungskostenAnDritteJaehrlich`.

### 4.8 Benötigte Datensätze

| Datensatz | Quelle | Format | Aktualisierung |
|---|---|---|---|
| Gemeindeverzeichnis (amtlicher Gemeindeschlüssel, Gemeindenamen) | Destatis GV-ISys | Excel, GV100AD (Festformat) | monatlich / quartalsweise / jährlich |
| Mietstufe je Gemeinde | Anlage zur Wohngeldverordnung (WoGV) | Gesetzestext | periodisch neu festgesetzt |
| PLZ → Gemeinde + Kreis + AGS | [OpenPLZ API](https://www.openplzapi.org/) bzw. deren Rohdaten (`openpotato/openplzapi.data`) | REST/JSON, CSV | vierteljährlich (Post-Daten + Gemeindeleitdatei) |

Das amtliche Gemeindeverzeichnis GV-ISys reicht für die Richtung PLZ → Gemeinde **nicht**: Es führt nur die Postleitzahl des Verwaltungssitzes je Gemeinde. Die OpenPLZ-Daten leisten das (Lizenz ODbL) und liefern je Postleitzahl Gemeindename, AGS, Kreis und Land — genau die drei Felder, die der Mietstufen-Lookup braucht.

**Festlegung**: Die Daten werden **gebündelt**, nicht zur Laufzeit abgefragt. Gründe: kein Ausfallrisiko im Wizard, keine Abhängigkeit von einem fremden Dienst, und die Postleitzahl des Nutzers verlässt den Server nicht — bei einer Anwendung, die Einkommens- und Vermögensdaten verarbeitet, ist das mehr als eine Formalie (siehe [SPEC.md 9.2](../../SPEC.md#92-datenschutz--anonyme-nutzung-ist-zustandslos)).

Die Mietstufen-Zuordnung wird periodisch neu festgesetzt. Sie gehört deshalb in das versionierte Konstanten-Set (SPEC 6.4), nicht in eine einmalig eingespielte Tabelle — sonst rechnet eine gespeicherte Prüfung nach einer Neufestsetzung stillschweigend anders.



## 5. Formel (§ 19 WoGG)

```
W = 1,15 · (M − (a + b·M + c·Y) · Y)
```

- `W`: ungerundetes monatliches Wohngeld
- `M`: zu berücksichtigende Miete oder Belastung — gedeckelt durch den Höchstbetrag aus 4.1 zzgl. der Komponenten aus 4.2, nach unten begrenzt durch Anlage 3 (4.6)
- `Y`: monatliches bereinigtes Gesamteinkommen nach 4.5, nach unten begrenzt durch Anlage 3
- `a`, `b`, `c`: Koeffizienten nach Haushaltsgröße aus 4.3

Rechenschritte, Nachkommastellen und Rundung sind in Anlage 3 verbindlich geregelt (4.6). Ergibt die Formel ≤ 0 oder liegt das Ergebnis unter der Bagatellgrenze von 10 € (§ 21 Nr. 1 WoGG), besteht kein Anspruch.

### 5.1 Weitere Ausschlussgründe (§ 21 WoGG)

Neben der Bagatellgrenze schließt § 21 den Anspruch aus, wenn alle Haushaltsmitglieder nach §§ 7, 8 Abs. 1 ausgeschlossen sind (das ist der Vorrangfall, den der Orchestrator abbildet), und **soweit die Inanspruchnahme missbräuchlich wäre, insbesondere wegen erheblichen Vermögens**.

> Der Vermögensausschluss ist im Modell bisher nicht abgebildet — Wohngeld war das einzige bedarfsorientierte Modul ohne Vermögensprüfung. § 21 Nr. 3 nennt keine Grenze, sondern ist ein unbestimmter Rechtsbegriff; die Verwaltungsvorschrift zum WoGG konkretisiert ihn. Bis das recherchiert ist, bleibt der Fall offen (siehe Abschnitt 8) — er kann dazu führen, dass das Modul einen Anspruch meldet, den die Behörde wegen Vermögens ablehnt.

## 6. Verifikation der Formel

Die Implementierung ist gegen eine veröffentlichte Beispielrechnung geprüft (smart-rechner.de, Familie Roth, Stand 2026):

| Eingabe | Wert |
|---|---|
| Haushaltsmitglieder | 4 |
| Mietstufe | VI (Köln) |
| M (inkl. Heizkosten- und Klimakomponente) | 997,80 € |
| Y | 1.778,25 € |

Mit den exakten Koeffizienten aus 4.3 (a = 0,01000, b = 0,0002163, c = 0,0000176) ergibt sich ungerundet **621,6601 €**, gerundet **622 €**. Die Quelle nennt 621,66 € beziehungsweise 622 €. Damit sind Anlage 1, Anlage 2 und der Rechenweg gemeinsam bestätigt.

### 6.1 Testvektoren

Als Regressionstests zu übernehmen. Alle Werte mit der Implementierung aus dieser Spec gerechnet; die Bruttokaltmiete ist die Eingabe, `M` das Ergebnis nach Deckelung am Höchstbetrag.

| Personen | Mietstufe | Bruttokaltmiete | Y | Höchstbetrag | M | Wohngeld |
|---|---|---|---|---|---|---|
| 1 | IV | 600 € | 1.400 € | 640,60 € | 600,00 € | 70 € |
| 1 | II | 450 € | 1.100 € | 537,60 € | 450,00 € | 137 € |
| 2 | IV | 700 € | 1.800 € | 786,40 € | 700,00 € | 112 € |
| 3 | V | 950 € | 2.400 € | 1.008,80 € | 950,00 € | 110 € |
| 4 | III | 900 € | 2.600 € | 998,20 € | 900,00 € | 286 € |
| 4 | VI | 1.300 € | 3.000 € | 1.267,20 € | 1.267,20 € | 295 € |
| 6 | IV | 1.300 € | 3.400 € | 1.398,00 € | 1.300,00 € | 438 € |
| 1 | IV | 600 € | 2.600 € | 640,60 € | 600,00 € | 0 € |

Die vorletzte Zeile prüft die Deckelung am Höchstbetrag, die letzte den Fall ohne Anspruch.

> **Diese Vektoren sind Selbstkontrolle, keine Fremdverifikation.** Nur der Fall aus Abschnitt 6 ist gegen eine externe Quelle geprüft. Vor dem Livegang sind die Vektoren gegen den amtlichen Wohngeldrechner gegenzurechnen; Abweichungen deuten auf Fehler in Anlage 1 oder in der Einkommensermittlung nach 4.5 hin, nicht in der Formel.

## 7. Ergebnis-Report (`naechsteSchritte`)

- `beschreibung`: "Wohngeld wird bei der Wohngeldstelle der Wohnortgemeinde beantragt. Hinweis: Bezug der Neuen Grundsicherung oder von Grundsicherung im Alter/bei Erwerbsminderung schließt Wohngeld i. d. R. aus."
- `benoetigteUnterlagen`: Mietvertrag, aktuelle Nebenkostenabrechnung, Einkommensnachweise aller Haushaltsmitglieder, bei Eigentum: Nachweis der Belastung (Zins/Tilgung).
- `zustaendigeStelle`: "Wohngeldstelle / Wohngeldbehörde der Wohnortgemeinde."

## 8. Offene Punkte dieses Moduls

**Geschlossen in v3:**

- [x] Anlage 2 für 7–12 Haushaltsmitglieder — **recherchiert** (4.3); dazu § 19 Abs. 3 für mehr als 12 Mitglieder (+65 € je weiterem, gedeckelt auf M). Die Zwischenlösung „ab 7 Personen `nicht_pruefbar`" entfällt
- [x] Anlage 3 (Mindestwerte) für 2–12 — **recherchiert** (4.6), zusätzlich die in v2 übersehenen Rechenschritte und Rundungsregeln
- [x] Lastenzuschuss bei Eigentum — **spezifiziert** (4.7): § 10 WoGG + § 13 WoGV, mit der Vereinfachung für den Regelfall, dass Zins und Tilgung den Höchstbetrag bereits erreichen
- [x] Datenquellen — **identifiziert** (4.8): Destatis GV-ISys für den Gemeindeschlüssel, Anlage WoGV für die Mietstufen
- [x] Verifikation der Formel — **erledigt** (Abschnitt 6): reproduziert eine veröffentlichte Beispielrechnung auf den Cent
- [x] Bagatellgrenze § 21 Nr. 1 WoGG (10 €) — in die Berechnungslogik aufgenommen; ein Anspruch darunter führt zu `imGrenzbereich`, nicht zu einem stillen „nein"

**Offen:**

- [x] **Mietstufen maschinenlesbar** — **erledigt (v4)**: aus dem BMWSB-PDF extrahiert nach [`data/mietstufen-2023.json`](../../data/mietstufen-2023.json), 1.601 Gemeinden und 279 Kreise, reproduzierbar über die Skripte in `data/scripts/`
- [x] **PLZ → Gemeinde: Quelle geklärt** — OpenPLZ-Daten (ODbL), gebündelt statt Laufzeit-API (4.8)
- [x] **OpenPLZ-Daten geholt und Nachschlagetabelle erzeugt** — erledigt (v5): `plz-gemeinden.csv`, `mietstufen-lookup.json`, `plz-index.json`
- [x] **Abdeckungsbericht** — erledigt (v5): 100 % der Gemeinden zugeordnet, null nicht zugeordnete PDF-Einträge
- [ ] **Die 200 über Basisnamen zugeordneten Gemeinden stichprobenhaft prüfen** — der unsicherste der vier Matching-Durchgänge. Bisher geprüft: die im Bericht ausgegebenen ersten 15 Einträge
- [ ] **Aktualität der Mietstufen prüfen**: Die Einstufung stammt vom 01.01.2023 (Datengrundlage Wohngeldstatistik 2019/2020); eine neuere amtliche Fassung war nicht auffindbar. Vor dem Livegang bestätigen und den Neufestsetzungsrhythmus klären — die Tabelle gehört ins versionierte Konstanten-Set (SPEC 6.4), damit eine gespeicherte Prüfung nach einer Neufestsetzung nicht stillschweigend anders rechnet
- [ ] **§ 21 Nr. 3 WoGG — Vermögensausschluss**: „missbräuchlich, insbesondere wegen erheblichen Vermögens". Wohngeld ist bisher das einzige bedarfsorientierte Modul ohne Vermögensprüfung. Die Verwaltungsvorschrift zum WoGG konkretisiert den Begriff — recherchieren, sonst meldet das Modul Ansprüche, die die Behörde wegen Vermögens ablehnt
- [x] **Inselregel** — erledigt (v6): [`data/inseln-ohne-festlandanschluss.json`](../../data/inseln-ohne-festlandanschluss.json), 32 Gemeinden, als erster Durchgang im Lookup. Bekannte Lücke: Hallig Gröde fehlt im PLZ-Datensatz
- [ ] **Inselliste fachlich abnehmen** — welche Insel als „ohne Festlandanschluss" gilt, entscheidet die Wohngeldbehörde. Die Abgrenzungen (Nordstrand und Poel per Damm, Fehmarn per Brücke, Sylt trotz Hindenburgdamm enthalten) sind in der Datei begründet, aber nicht amtlich bestätigt
- [ ] **Bagatellgrenze ab 2027**: Nach ersten Meldungen steigt sie auf 15 €. Bestätigen und als neues Konstanten-Set vorbereiten (SPEC 6.4)
- [ ] **Anlage 3, dritte Quelle**: Die Fassung ab 01.01.2025 ist durch zwei Quellen belegt, zwei weitere führen noch den Stand von 2023. Vor dem Livegang gegen den Gesetzestext im Original prüfen — die Mindestwerte greifen bei genau den Haushalten mit sehr niedrigem Einkommen, für die das Ergebnis am wichtigsten ist
- [x] Erhebung der § 16-Voraussetzungen im Wizard — **entschieden**: Die drei Abzüge werden **aus `erwerbsstatusPrimaer` abgeleitet und zur Bestätigung angezeigt**, nicht einzeln abgefragt.

| Erwerbsstatus | Steuern | KV/PV | RV |
|---|---|---|---|
| angestellt | ja | ja | ja |
| selbstständig | ja | ja | nein (sofern nicht pflichtversichert) |
| Rente | nein | ja | nein |
| Bürgergeld / kein Einkommen | nein | nein | nein |
| Minijob | nein | nein | nein |
| Studium | nein | ja (sofern nicht familienversichert) | nein |

Der Wizard zeigt das als Satz mit Korrekturmöglichkeit: „Wir gehen davon aus, dass von deinem Lohn Steuern, Kranken- und Rentenversicherung abgehen. Stimmt das?" — mit einer Schaltfläche zum Ändern.

Begründung: Drei Einzelfragen sind drei Stellen zum Abbrechen, und „zahlst du Steuern?" ist für viele nicht eindeutig zu beantworten. Die Ableitung trifft den Regelfall, und die Bestätigung fängt die Ausnahmen. Die Tabelle gehört ins Konstanten-Set, nicht in die Modullogik — sie kann sich ändern
- [ ] Vorbelegung für Selbstständige und Studierende gegen die Praxis prüfen — beide Zeilen sind begründete Annahmen, keine recherchierten Werte
- [x] Anrechnung des Unterhaltsvorschusses — **spezifiziert** in [unterhaltsvorschuss.md](unterhaltsvorschuss.md) Abschnitt 7: § 14 Abs. 2 Nr. 21 WoGG, 100 %, als Einkommen des Kindes, ohne § 16-Abzüge und ohne § 17-Freibetrag
- [ ] Testvektoren aus 6.1 gegen den amtlichen Wohngeldrechner gegenrechnen
