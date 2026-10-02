# Modul-Spec: Elterngeld

Teil von: [SPEC.md](../../SPEC.md) — Abschnitt 3/6
Berechnungstiefe: **detailliert** · Berechnungsart: `lohnersatz` (kein Bedarf, personenbezogen)
Quellen (Stand der recherchierten Werte: 2026, vor Umsetzung erneut prüfen):
- [ordio.com – Elterngeld Lexikon 2026](https://www.ordio.com/insights/lexikon/elterngeld)
- [elterngeld-rechner.info – Änderungen 2026](https://www.elterngeld-rechner.info/blog/elterngeld-2026-aenderungen/)

## 0. Modellierungs-Hinweis

Wie beim BAföG-Modul wird eine Bemessungsgröße benötigt, die im Kernmodell nicht direkt existiert: das **Nettoeinkommen der letzten 12 Monate vor der Geburt** (nicht das aktuelle `einkommen.nettoMonatlich`, das den Zustand nach der Geburt/während des Elterngeldbezugs abbildet) sowie das **zu versteuernde Jahreseinkommen** für die Einkommensgrenzenprüfung. Beide werden separat über `systemSpecificAnswers` erfasst.

## 1. Anspruchsvoraussetzungen (fachlich)

1. Wohnsitz/gewöhnlicher Aufenthalt in Deutschland, Kind lebt im selben Haushalt und wird selbst betreut.
2. Elternteil arbeitet während des Bezugs nicht mehr als 32 Wochenstunden (bei ElterngeldPlus/Partnerschaftsbonus abweichende Regeln, siehe Abschnitt 3).
3. Zu versteuerndes Einkommen im Kalenderjahr vor der Geburt unter 175.000 € (Paare und Alleinerziehende gleichermaßen).
4. Geburt liegt innerhalb des Anspruchszeitraums (aktuelle Reformregeln gelten ab Geburten ab 1.4.2025, weitere Verschärfung ab 2026 beim Parallelbezug, siehe Abschnitt 4).

## 2. Zusätzliche Inputfelder (`systemSpecificAnswers`)

```ts
interface ElterngeldAnswers {
  geburtsdatumKind: Date;
  nettoeinkommenVorGeburtMonatlich: number; // Durchschnitt der letzten 12 Monate vor Mutterschutz/Geburt
  zuVersteuerndesEinkommenVorjahr: number; // für 175.000-€-Grenze, Haushalts-/Paar-Summe
  wochenstundenWaehrendBezug: number; // Prüfung der 32-Stunden-Grenze
  istAlleinerziehend: boolean; // beeinflusst Bezugsdauer (14 statt 12 Monate)
  anzahlWeitererKinderUnter3Jahren: number; // für Geschwisterbonus
  hatKindMitBehinderung: boolean; // für Geschwisterbonus
  istMehrlingsgeburt: boolean;
  anzahlKinderBeiMehrlingsgeburt?: number;
  gewaehlteVariante: 'basis' | 'elterngeldPlus';
  nutztPartnerschaftsbonus: boolean;
}
```

`unterhaltErhalten`/`unterhaltGezahlt` aus dem Kernmodell sind für dieses Modul nicht relevant.

## 3. Berechnungslogik (detailliert)

```
// 1. Einkommensgrenzen-Check
eligible_grundsaetzlich = zuVersteuerndesEinkommenVorjahr <= EINKOMMENSGRENZE

// 2. Ersatzrate bestimmen (gestaffelt nach Elterngeldnetto)
ersatzrate =
  nettoeinkommenVorGeburtMonatlich < 1000 ? staffelGeringverdiener(nettoeinkommenVorGeburtMonatlich) // 67–100%, linear interpoliert
  : nettoeinkommenVorGeburtMonatlich <= 1200 ? 0.67
  : nettoeinkommenVorGeburtMonatlich <= 1240 ? staffelAbschmelzung(nettoeinkommenVorGeburtMonatlich) // 65–67%
  : 0.65

basisbetrag = clamp(nettoeinkommenVorGeburtMonatlich * ersatzrate, MINDESTBETRAG_BASIS, HOECHSTBETRAG_BASIS)

// 3. Zuschläge
geschwisterbonus = (anzahlWeitererKinderUnter3Jahren >= 2 || hatKindMitBehinderung)
  ? max(basisbetrag * 0.10, GESCHWISTERBONUS_MINDESTBETRAG)
  : 0

mehrlingszuschlag = istMehrlingsgeburt ? (anzahlKinderBeiMehrlingsgeburt - 1) * MEHRLINGSZUSCHLAG_PRO_KIND : 0

monatsbetrag = basisbetrag + geschwisterbonus + mehrlingszuschlag

// 4. Variante & Bezugsdauer
auszahlungsbetrag = gewaehlteVariante === 'elterngeldPlus' ? monatsbetrag / 2 : monatsbetrag

// Bezugsdauer als eigene Funktion mit expliziten Fällen (Review-Befund A5).
// Grundregel: Basis-Elterngeld gibt es für 12 Lebensmonate. Auf 14 verlängert es sich
// NICHT durch "alleinerziehend sein" allein, sondern dadurch, dass ein zweiter
// Elternteil mindestens 2 Monate übernimmt (Partnermonate) — oder dass eine
// alleinerziehende Person beide Anteile auf sich vereint.
basisMonate(haushaltstyp, partnerBeteiligtSichMitMindestens2Monaten):
  haushaltstyp === 'alleinerziehend'               -> 14
  partnerBeteiligtSichMitMindestens2Monaten        -> 14   // aufgeteilt auf beide Elternteile
  sonst                                            -> 12   // Anteil eines Elternteils: max. 12

bezugsmonate(variante):
  variante === 'basis'         -> basisMonate(...)
  variante === 'elterngeldPlus'-> basisMonate(...) * 2
                                  + (nutztPartnerschaftsbonus ? PARTNERSCHAFTSBONUS_MONATE : 0)

// 5. Wochenstunden-Grenze
verletztStundengrenze = wochenstundenWaehrendBezug > 32

// 6. Ergebnis (ModuleCalculation, berechnungsart 'lohnersatz' — kein bedarf/bedarfsluecke)
voraussetzungenErfuellt =
  zuVersteuerndesEinkommenVorjahr <= EINKOMMENSGRENZE AND
  !verletztStundengrenze
betrag           = auszahlungsbetrag        // monatlich, für bezugsmonate Monate
betrifftPersonId = id des beziehenden Elternteils
```

**Personenbezug**: Elterngeld ist eine personenbezogene Leistung — beide Elternteile können jeweils eigene Ansprüche haben, die sich in Variante und Dauer unterscheiden. Das Ergebnis trägt deshalb `betrifftPersonId`. Für den MVP wird pro Prüflauf **ein** Elternteil betrachtet (der Hauptantragsteller); die Aufteilung zwischen beiden Elternteilen ist ein offener Punkt.

**Keine Bedarfsrechnung**: Anders als bei Grundsicherung, Wohngeld oder Kinderzuschlag gibt es hier keinen „Bedarf" und keine Bedürftigkeitsprüfung — der Betrag folgt aus der Ersatzrate. Deshalb `berechnungsart: 'lohnersatz'`; die Felder `bedarf`/`bedarfsluecke` bleiben leer und das Modul wird von der Vorrangprüfung des Orchestrators nicht angefasst.

### 3.1 Ersatzrate — exakte Formeln (§ 2 Abs. 2 BEEG)

Beide Platzhalter aus v1 sind aufgelöst. Das Gesetz arbeitet nicht mit einer linearen Interpolation, sondern mit **diskreten 2-Euro-Schritten**:

```ts
/** E = maßgebliches Nettoeinkommen vor der Geburt, monatlich. */
function ersatzrate(E: number): number {
  if (E < 1000) {
    // § 2 Abs. 2 Satz 1: je volle 2 Euro Unterschreitung +0,1 Prozentpunkte
    return Math.min(100, 67 + Math.floor((1000 - E) / 2) * 0.1);
  }
  if (E > 1200) {
    // § 2 Abs. 2 Satz 2: je volle 2 Euro Überschreitung -0,1 Prozentpunkte
    return Math.max(65, 67 - Math.floor((E - 1200) / 2) * 0.1);
  }
  return 67;   // 1.000 bis 1.200 Euro: unverändert
}
```

Daraus folgen die Eckpunkte:

| Einkommensbereich | Ersatzrate |
|---|---|
| bis 340 € | 100 % (Deckel erreicht) |
| 340 – 1.000 € | 67 % + 0,1 pp je 2 € unter 1.000 €, steigend bis 100 % |
| 1.000 – 1.200 € | 67 % |
| 1.200 – 1.240 € | 67 % − 0,1 pp je 2 € über 1.200 €, fallend bis 65 % |
| ab 1.240 € | 65 % (Boden erreicht) |

> Die Vermutung aus v1, der Übergangsbereich ende bei 1.240 €, ist damit bestätigt: von 67 % auf 65 % sind 2 Prozentpunkte, also 20 Schritte à 0,1 pp, also 40 € über der Grenze von 1.200 €. Ebenso ergibt sich der 100-%-Punkt rechnerisch bei 340 € (33 pp = 330 Schritte = 660 € unter 1.000 €) — er ist keine eigene Konstante, sondern fällt aus der Formel.

**Rundung**: Das Gesetz spricht von „je 2 Euro" — angebrochene 2-Euro-Schritte zählen nicht, deshalb `Math.floor`. Das ist explizit zu testen (E = 999 € ergibt 67 %, nicht 67,05 %).

## 4. Konstanten (TBD — vor Implementierung/jährlich zu verifizieren)

| Konstante | Recherchierter Wert (2026) | Quelle/Stand |
|---|---|---|
| `MINDESTBETRAG_BASIS` | 300 €/Monat | § 2 Abs. 4 BEEG, bestätigt 09/2026 |
| `MINDESTBETRAG_PLUS` | 150 €/Monat | ordio.com, 2026 |
| `HOECHSTBETRAG_BASIS` | 1.800 €/Monat | § 2 Abs. 1 BEEG, bestätigt 09/2026 |
| `HOECHSTBETRAG_PLUS` (ohne Teilzeit) | 900 €/Monat | ordio.com, 2026 |
| `EINKOMMENSGRENZE` | 175.000 € zu versteuerndes Einkommen/Jahr (Paare & Alleinerziehende gleich) | elterngeld-rechner.info, 2026 |
| `GESCHWISTERBONUS_MINDESTBETRAG` | 75 € (Basis) | ordio.com, 2026 |
| Geschwisterbonus-Satz | +10 % vom Basisbetrag | ordio.com, 2026 |
| `MEHRLINGSZUSCHLAG_PRO_KIND` | 300 € (Basis), je weiterem Kind bei Mehrlingsgeburt | ordio.com, 2026 |
| `PARTNERSCHAFTSBONUS_MONATE` | 2–4 zusätzliche ElterngeldPlus-Monate (24–32 Wochenstunden beider Elternteile) | ordio.com, 2026 |
| Basis-Bezugsdauer | 12 Monate (14 mit Partnermonaten/als Alleinerziehende) | ordio.com, 2026 |
| **Reform 2026**: Parallelbezug Basiselterngeld beider Eltern | nur noch 1 Monat gemeinsam (Ausnahmen: Mehrlinge, Frühgeburt, Behinderung) | elterngeld-rechner.info, 2026 |

## 5. Ergebnis-Report (`naechsteSchritte`)

- `beschreibung`: "Elterngeld wird bei der zuständigen Elterngeldstelle (je nach Bundesland unterschiedlich organisiert) beantragt, rückwirkend nur für die letzten 3 Monate möglich."
- `benoetigteUnterlagen`: Geburtsurkunde, Einkommensnachweise der letzten 12 Monate vor Geburt, Steuerbescheid, Erklärung zur Arbeitszeit während des Bezugs.
- `zustaendigeStelle`: "Elterngeldstelle des Bundeslandes/der Region (z. B. Landesamt für Familie, je nach Bundesland unterschiedlich benannt)."

## 6. Offene Punkte dieses Moduls

- [x] Exakte Formel der Geringverdienerkomponente (§ 2 Abs. 2 BEEG) — **recherchiert**: +0,1 pp je volle 2 € unter 1.000 €, gedeckelt bei 100 % (Abschnitt 3.1)
- [x] Aufteilung zwischen beiden Elternteilen — **entschieden**: Der MVP rechnet **nur für den Hauptantragsteller** und sagt das im Report ausdrücklich: „Wir rechnen deinen Anspruch. Wie ihr die Monate zwischen euch aufteilt, ändert die Gesamtsumme — Partnermonate, ElterngeldPlus und der Partnerschaftsbonus hängen daran." Begründung: Eine vollständige Rechnung bräuchte Einkommen und geplante Bezugsmonate beider Eltern, also einen eigenen Wizard-Schritt. Ein halb gerechnetes Paar-Ergebnis wäre schlechter als ein klar begrenztes Einzel-Ergebnis
- [ ] Erfassung der Partnerbeteiligung (`partnerBeteiligtSichMitMindestens2Monaten`) als Wizard-Frage formulieren — bleibt nötig, weil sie die **Bezugsdauer** des Hauptantragstellers beeinflusst (12 statt 14 Monate). Das ist die einzige Partner-Angabe, die der MVP braucht
- [x] Exakte Abschmelzungsformel im Übergangsbereich — **recherchiert**: −0,1 pp je volle 2 € über 1.200 €, Boden 65 %, erreicht bei exakt 1.240 € (Abschnitt 3.1)
- [x] `HOECHSTBETRAG_BASIS` und `MINDESTBETRAG_BASIS` — **gegen § 2 BEEG bestätigt**: 1.800 € Höchstbetrag, 300 € Mindestbetrag, Ersatzrate 67 %, Bemessungsgrenze 2.770 € für das Einkommen vor der Geburt. Auch die Stufenregeln stimmen: +0,1 Prozentpunkte je 2 € unter 1.000 € bis maximal 100 %, −0,1 Prozentpunkte je 2 € über 1.200 € bis mindestens 65 %. Damit ist die Ersatzratenformel aus Abschnitt 3.1 vollständig belegt
- [ ] Detailregeln zum verkürzten Parallelbezug (Reform 2026) und deren Ausnahmen (Mehrlinge, Frühgeburt, Behinderung) vollständig abbilden
- [ ] Zuständige Stelle ist bundeslandabhängig unterschiedlich organisiert — evtl. PLZ-basierte Zuordnung für den Report ergänzen
- [ ] Zusammenspiel mit Mutterschaftsgeld (wird auf Elterngeld angerechnet) — im MVP nicht abgebildet
