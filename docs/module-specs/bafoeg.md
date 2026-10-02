# Modul-Spec: BAföG (Bundesausbildungsförderungsgesetz)

Teil von: [SPEC.md](../../SPEC.md) — Abschnitt 3/6
Berechnungstiefe: **grob** (Vorabschätzung, kein exakter Bescheid-Ersatz) · Berechnungsart: `bedarfsdeckung` (50 % Darlehen, personenbezogen)
Quellen (Stand der recherchierten Werte: 2026, vor Umsetzung erneut prüfen):
- [finanztip.de – BAföG 2026](https://www.finanztip.de/bafoeg/)
- [studierenplus.de – BAföG Freibeträge 2026](https://www.studierenplus.de/bafoeg/bafoeg-freibetraege/)
- [bafög.de – Altersgrenze](https://www.xn--bafg-7qa.de/bafoeg/de/das-bafoeg-alle-infos-auf-einen-blick/einzelfragen-der-foerderung/gibt-es-eine-altersgrenze/gibt-es-eine-altersgrenze.html)
- [meinbafoeg.de – Rückzahlung](https://www.meinbafoeg.de/bafoeg-rueckzahlung/)

## 0. Wichtiger Modellierungs-Hinweis

BAföG ist das erste Modul, bei dem das **Elterneinkommen unabhängig vom gemeinsamen Haushalt** relevant ist: Studierende, die BAföG beantragen, leben oft nicht mehr im Haushalt der Eltern, trotzdem zählt deren Einkommen für die Anspruchsprüfung. Das Kern-`Haushalt`-Modell (Abschnitt 6.2 der Haupt-Spec) bildet nur zusammenlebende Personen ab — für dieses Modul werden daher **zusätzliche, nicht haushaltsgebundene Elterndaten** über `systemSpecificAnswers` erfasst (siehe Abschnitt 2). Das ist ein Präzedenzfall, der beim BAföG-Modul erstmals auftritt und bei künftigen Modulen (z. B. Unterhaltsvorschuss) wiederkehren kann.

## 1. Anspruchsvoraussetzungen (fachlich)

1. Deutsche Staatsangehörigkeit oder rechtliche Gleichstellung (EU-Staatsangehörige, bestimmte Aufenthaltstitel) — Detailprüfung im MVP vereinfacht (siehe Offene Punkte).
2. Ausbildung an einer förderungsfähigen Einrichtung (Hochschule, Fachschule etc.), grundsätzlich Erstausbildung (Ausnahmen bei Zweitausbildung möglich, im MVP nicht abgebildet).
3. **Altersgrenze**: bei Ausbildungsbeginn unter 45 Jahre. Ausnahmen (z. B. zweiter Bildungsweg, Kindererziehung bis Kind 14 Jahre alt, gesundheitliche/familiäre Verzögerung) — im MVP als einfache Ja/Nein-Zusatzfrage abgebildet, keine Einzelfallprüfung.
4. Eignung für die gewählte Ausbildung (im MVP nicht geprüft, da nicht objektiv erfassbar).
5. Bedürftigkeit: eigenes Einkommen/Vermögen sowie das der Eltern (bzw. Ehepartner) deckt den Bedarf nicht.
6. Förderung nur innerhalb der Förderungshöchstdauer (i. d. R. Regelstudienzeit) — im MVP als Ja/Nein-Frage "noch innerhalb Regelstudienzeit?" abgebildet.

## 2. Zusätzliche Inputfelder (`systemSpecificAnswers`)

```ts
interface BafoegAnswers {
  ausbildungsbeginn: Date; // für Altersgrenzenprüfung
  istInnerhalbRegelstudienzeit: boolean;
  wohnform: 'beiEltern' | 'eigeneWohnung';
  hatAusnahmeVonAltersgrenze?: boolean; // z. B. zweiter Bildungsweg, Kindererziehung — Freitext-Begründung optional

  // Eltern-Daten unabhängig vom Kern-Haushaltsmodell (siehe Abschnitt 0)
  elternStatus: 'verheiratetZusammenlebend' | 'getrenntLebend' | 'alleinerziehend';
  elternEinkommenNettoGesamt: number;
  anzahlWeitererUnterhaltsberechtigterKinderDerEltern: number;

}
```

**Aus dem Kernmodell** (seit SPEC v0.4 nicht mehr hier dupliziert, Review-Befund B1/B3):
- eigenes Bruttoeinkommen der studierenden Person → `person.einkommen.bruttoMonatlich`
- eigenes Vermögen → `person.vermoegen` (personenbezogen, nicht `vermoegenGesamt`)

In v1 standen hier zusätzliche Felder `eigenesBruttoEinkommenMonatlich` und `eigenesVermoegen` mit dem Kommentar „ggf. identisch zu `vermoegenGesamt`" — zwei Felder für dieselbe Größe ohne Regel, welches gilt. Das ist mit dem überarbeiteten Kernmodell aufgelöst.

Nicht auflösbar über das Kernmodell und deshalb weiterhin hier: die **Elterndaten**, weil die Eltern typischerweise nicht im Haushalt der studierenden Person leben (siehe Abschnitt 0).

## 3. Berechnungslogik (grob)

```
// 1. Bedarf (Höchstsatz je nach Wohnform)
bedarf = wohnform === 'beiEltern' ? BEDARFSSATZ_BEI_ELTERN : BEDARFSSATZ_EIGENE_WOHNUNG

// 2. Elterneinkommen-Freibetrag
elternFreibetrag =
  elternStatus === 'verheiratetZusammenlebend' ? FREIBETRAG_ELTERN_VERHEIRATET :
  FREIBETRAG_ELTERN_ALLEINERZIEHEND
  + anzahlWeitererUnterhaltsberechtigterKinderDerEltern * FREIBETRAG_JE_WEITERES_KIND

elternUeberschuss = max(0, elternEinkommenNettoGesamt - elternFreibetrag)
anrechenbaresElterneinkommen = elternUeberschuss * (0.50 + 0.05 * anzahlWeitererUnterhaltsberechtigterKinderDerEltern)

// 3. Eigenes Einkommen/Vermögen des Studierenden
eigenesFreibetrag = EIGENER_EINKOMMENSFREIBETRAG_MONATLICH
anrechenbaresEigenesEinkommen = max(0, person.einkommen.bruttoMonatlich - eigenesFreibetrag)

vermoegensfreibetrag = alterUnter30(geburtsdatum) ? VERMOEGENSFREIBETRAG_U30 : VERMOEGENSFREIBETRAG_AB30
vermoegenUeberschreitet = person.vermoegen > vermoegensfreibetrag

// 4. Ergebnis
foerderbetrag = max(0, bedarf - anrechenbaresElterneinkommen - anrechenbaresEigenesEinkommen)

eligible =
  alterBeiAusbildungsbeginn(ausbildungsbeginn, geburtsdatum) >= 45 AND !hatAusnahmeVonAltersgrenze ? 'nein' :
  !istInnerhalbRegelstudienzeit ? 'nein' :
  vermoegenUeberschreitet ? 'nein' :
  foerderbetrag > 0 ? 'ja' :
  imGrenzbereich    ? 'vielleicht' :   // Abstand zum Bedarfssatz < max(50 EUR, 5 %), SPEC 6.3.1
  'nein'

betrag           = foerderbetrag   // monatlich
betragsart       = 'zuschussUndDarlehen'   // 50 % Zuschuss, 50 % zinsloses Darlehen
betragAufteilung = { zuschuss: betrag * 0.5, darlehen: betrag * 0.5 }   // Pflichtfeld, SPEC 6.5.4
betrifftPersonId = id der studierenden Person
```

## 4. Konstanten (TBD — vor Implementierung/jährlich zu verifizieren)

| Konstante | Recherchierter Wert (2026/27) | Quelle/Stand |
|---|---|---|
| `GRUNDBEDARF` | 475 €/Monat | studierenplus.de + bafoeg-aktuell.de, 2026 |
| `WOHNZUSCHLAG_BEI_ELTERN` | 59 €/Monat | studierenplus.de + bafoeg-aktuell.de, 2026 |
| `WOHNZUSCHLAG_EIGENE_WOHNUNG` | 380 €/Monat | studierenplus.de + bafoeg-aktuell.de, 2026 |
| `ZUSCHLAG_KRANKENVERSICHERUNG` | 102 €/Monat | studierenplus.de + bafoeg-aktuell.de, 2026 |
| `ZUSCHLAG_PFLEGEVERSICHERUNG` | 35 €/Monat | studierenplus.de + bafoeg-aktuell.de, 2026 |
| `FREIBETRAG_ELTERN_VERHEIRATET` | 2.540 €/Monat netto | studierenplus.de, 2026 |
| `FREIBETRAG_ELTERN_ALLEINERZIEHEND` | 1.690 €/Monat netto | studierenplus.de, 2026 |
| `FREIBETRAG_JE_WEITERES_KIND` | + 770 €/Monat | studierenplus.de, 2026 |
| Anrechnungssatz Elterneinkommen über Freibetrag | 50 % + 5 % je weiterem Kind | studierenplus.de, 2026 |
| `EIGENER_EINKOMMENSFREIBETRAG_MONATLICH` | 603 €/Monat brutto (steigt ab 01/2027 auf 633 €) | studierenplus.de, 2026 |
| `VERMOEGENSFREIBETRAG_U30` | 15.000 € | studierenplus.de, 2026 |
| `VERMOEGENSFREIBETRAG_AB30` | 45.000 € | studierenplus.de, 2026 |
| `VERMOEGENSFREIBETRAG_JE_KIND_ODER_EHEPARTNER` | + 2.300 € | studierenplus.de, 2026 |
| `ALTERSGRENZE_JAHRE` | 45 (bei Ausbildungsbeginn) | bafög.de, 2026 |
| Zuschuss-/Darlehen-Split | 50 % Zuschuss (nicht rückzahlbar) / 50 % zinsloses Staatsdarlehen | meinbafoeg.de, 2026 |
| `DARLEHENSDECKEL` (max. Rückzahlungssumme gesamt) | 10.010 € | meinbafoeg.de, 2026 |

### 4.1 Bedarfssatz — Zusammensetzung und die KV/PV-Falle

Der Bedarfssatz ist keine einzelne Konstante, sondern eine Summe. **Die KV/PV-Zuschläge sind separat und werden nur gewährt, wenn die studierende Person selbst beitragspflichtig kranken- und pflegeversichert ist.** Besteht eine beitragsfreie Familienversicherung über Eltern oder Partner, entfallen sie.

| Wohnsituation | ohne eigene KV/PV | mit eigener KV/PV |
|---|---|---|
| bei den Eltern wohnend | **534 €** | **671 €** |
| eigene Wohnung | **855 €** | **992 €** |

> **Damit ist eine offene Frage dieses Moduls beantwortet und zugleich ein Rechenfehler abgewendet**: Der oft zitierte „Höchstsatz 992 €" gilt nur für Studierende mit eigenem Hausstand *und* eigener Versicherung. Familienversicherte — bis 25 Jahre der Regelfall — liegen 137 € darunter. Ein Modul, das pauschal mit 992 € rechnet, überschätzt den Bedarf systematisch und meldet Ansprüche, die es nicht gibt.

Das Datenmodell braucht dafür ein zusätzliches Feld:

```ts
/** true = eigene beitragspflichtige KV/PV; false = beitragsfreie Familienversicherung */
eigeneKrankenUndPflegeversicherung: boolean;
```

Vorbelegung im Wizard: unter 25 Jahren und ohne eigenes Einkommen über der Familienversicherungsgrenze → `false`, sonst `true`; in beiden Fällen bestätigungspflichtig.

**Darstellung des Betrags**: BAföG ist zur Hälfte ein Darlehen. Ein reiner Monatsbetrag wäre irreführend — das Ergebnis trägt deshalb `betragsart: 'zuschussUndDarlehen'` (siehe [SPEC.md 6.5](../../SPEC.md#65-ergebnis-report-output)), und die Aufteilung im Pflichtfeld `betragAufteilung` (SPEC 6.5.4). Die UI muss den Darlehensanteil sowie den Rückzahlungsdeckel von 10.010 € sichtbar machen.

Weil BAföG `genauigkeit: 'grob'` ist, wird der Betrag als Spanne ausgegeben (`Unschaerfe { relativ: 0.20, absolutMin: 30 }`, SPEC 6.5.2). Die 50/50-Aufteilung gilt dann für beide Enden der Spanne, nicht für einen Punktwert.

## 5. Ergebnis-Report (`naechsteSchritte`)

- `beschreibung`: "BAföG wird beim zuständigen Amt für Ausbildungsförderung (BAföG-Amt) beantragt. Hinweis: 50 % der Förderung sind ein nicht rückzahlbarer Zuschuss, 50 % ein zinsloses Staatsdarlehen (gedeckelt auf insgesamt 10.010 €, Rückzahlung beginnt 5 Jahre nach Ende der Regelstudienzeit)."
- `benoetigteUnterlagen`: Immatrikulationsbescheinigung, Einkommensnachweise der Eltern (Steuerbescheid), eigene Einkommensnachweise, Nachweis über Wohnform (Mietvertrag bei eigener Wohnung).
- `zustaendigeStelle`: "Amt für Ausbildungsförderung (BAföG-Amt) der Hochschule/Region."

## 6. Offene Punkte dieses Moduls

- [x] `BEDARFSSATZ_BEI_ELTERN` — **recherchiert**: 671 € mit eigener KV/PV, 534 € ohne (Abschnitt 4.1)
- [x] Kranken-/Pflegeversicherungszuschlag — **geklärt**: separat, nur bei eigener Beitragspflicht; neues Feld `eigeneKrankenUndPflegeversicherung` (Abschnitt 4.1)
- [ ] Detailregeln zu Staatsangehörigkeit/Gleichstellung (§ 8 BAföG) — im MVP vereinfacht als Ja/Nein-Frage geplant, Formulierung TBD
- [ ] Bezugsgröße für `imGrenzbereich` ist der Bedarfssatz der Ausbildungsstätte (SPEC 6.3.1) — konkret zu setzen, sobald `BEDARFSSATZ_BEI_ELTERN` recherchiert ist
- [ ] Zweitausbildung-Ausnahmen — im MVP nicht abgebildet, ggf. Post-MVP
- [x] Getrennt lebende Eltern — **entschieden**: **zwei getrennte Felder** statt eines Summenfelds. `elternEinkommenNettoGesamt` wird ersetzt durch:

```ts
elternteil1EinkommenNetto: number;
elternteil2EinkommenNetto?: number;   // entfällt, wenn nur ein Elternteil unterhaltspflichtig ist
elternLebenGetrennt: boolean;
```

Begründung: Das BAföG-Amt betrachtet beide Elternteile getrennt und gewährt je eigene Freibeträge — bei Getrenntlebenden gilt für jeden der Alleinerziehenden-Freibetrag statt einmal der für Verheiratete. Ein Summenfeld unterschätzt den Freibetrag dann systematisch und meldet zu wenig oder gar keinen Anspruch. Der Mehraufwand ist ein Feld
- [ ] Neue Partner der getrennt lebenden Eltern: deren Einkommen kann mitzählen — im MVP nicht erhoben, im Report als möglicher Faktor benennen
- [x] Schüler-BAföG — **entschieden: im MVP mit abgebildet**. Der Wizard fragt nach der Ausbildungsart, daraus folgen andere Bedarfssätze und — anders als beim Studierenden-BAföG — **kein Darlehensanteil**: Schüler-BAföG ist Vollzuschuss. `betragsart` ist dann `zuschuss`, nicht `zuschussUndDarlehen`, und `betragAufteilung` entfällt. Recherchierte Höchstsätze: ohne abgeschlossene Berufsausbildung ab Klasse 10 keine Förderung bei den Eltern / 803 € auswärts; Berufsfachschule (ab 2 Jahre) 413 € / 803 €; mit Berufsausbildung (Fachoberschule, Abendrealschule) 635 € / 912 €; Abendgymnasium und Kolleg 638 € / 959 € (studierenplus.de, Stand 08/2026)
- [ ] Nächste Erhöhung der Bedarfssätze zum 01.04.2027 angekündigt — als neues Konstanten-Set vorbereiten (SPEC 6.4)
