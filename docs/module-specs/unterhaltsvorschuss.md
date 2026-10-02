# Modul-Spec: Unterhaltsvorschuss (UVG)

Teil von: [SPEC.md](../../SPEC.md) — Abschnitt 3/6
Berechnungstiefe: **detailliert** · Berechnungsart: `bedarfsdeckung` (Betrag pro Kind)
Quellen (Stand der recherchierten Werte: 2026, vor Umsetzung erneut prüfen):
- [unterhalt.net – Unterhaltsvorschuss 2026](https://www.unterhalt.net/kindesunterhalt/unterhaltsvorschuss/)
- [buerger-geld.org – geplante Reform Altersgrenze](https://www.buerger-geld.org/news/finanzen/unterhaltsvorschuss-prien-bestaetigt-kuerzung-auf-16-jahre-reform-soll-2027-kommen)

## 0. Wichtiger Hinweis: geplante Reform 2027

Aktuell (2026) gilt die Altersgrenze **bis zum 18. Geburtstag**. Eine Reform zur Absenkung auf 16 Jahre ist für **2027** angekündigt (noch kein Gesetzentwurf, Stand der Recherche). Für das MVP wird mit der aktuell geltenden Grenze (18 Jahre) gerechnet. Die Reform wird über die Rechtsstand-Versionierung abgebildet (siehe [SPEC.md 6.4](../../SPEC.md#64-rechtsstand-und-versionierung)): Sobald das Gesetz beschlossen ist, entsteht ein neues Konstanten-Set mit der geänderten `ALTERSGRENZE_JAHRE`, während gespeicherte Prüfungen mit altem Rechtsstand reproduzierbar bleiben.

## 1. Anspruchsvoraussetzungen (fachlich)

1. Kind ist minderjährig (aktuell: unter 18 Jahren, siehe Abschnitt 0) und lebt bei einem alleinerziehenden Elternteil.
2. Der andere Elternteil zahlt keinen oder nur unregelmäßig/unzureichend Unterhalt (bzw. ist verstorben oder unbekannt).
3. Ab dem 12. Geburtstag des Kindes: der betreuende Elternteil muss zusätzlich ein eigenes Bruttoeinkommen von mindestens 600 €/Monat erzielen ODER bestimmte Ausnahmetatbestände erfüllen (z. B. keine Mitwirkungspflicht-Verletzung) — im MVP vereinfacht als Ja/Nein-Frage.
4. Bürgergeld-/Neue-Grundsicherung-Bezug des betreuenden Elternteils steht dem Anspruch nicht entgegen (SGB-II-Leistungen werden bei der Einkommensprüfung nach Punkt 3 nicht berücksichtigt).
5. Wohnsitz in Deutschland.

## 2. Zusätzliche Inputfelder (`systemSpecificAnswers`)

```ts
interface UnterhaltsvorschussAnswers {
  andererElternteilZahltKeinenOderUnzureichendenUnterhalt: boolean;
  andererElternteilIstUnbekanntOderVerstorben?: boolean;
}
```

`geburtsdatum` des Kindes (Kernmodell) bestimmt Altersgruppe und Einkommensvoraussetzung.

**Haushaltstyp statt Personen-Flag** (Review-Befund C4): In v1 stand hier `istAlleinErziehend` als Feld auf `Haushaltsmitglied`. Seit SPEC v0.4 ist das durch das computed-Feld `haushaltstyp === 'alleinerziehend'` auf `Haushalt` ersetzt — das schließt den widersprüchlichen Zustand „alleinerziehend und mit Partner im Haushalt" aus. Der betreuende Elternteil ist der `istHauptantragsteller`.

**Einkommensbegriff**: Die Mindestgrenze ab Kind 12 ist eine **Brutto**-Grenze → `einkommen.bruttoMonatlich` des betreuenden Elternteils. Das Feld `eigenesBruttoEinkommenBetreuenderElternteil` in `systemSpecificAnswers` entfällt damit ersatzlos, es kommt aus dem Kernmodell.

## 3. Berechnungslogik (detailliert)

Der Anspruch besteht **je Kind** und ist altersabhängig unterschiedlich hoch. Bei mehreren Kindern in verschiedenen Altersgruppen entstehen deshalb verschiedene Beträge — das Modul gibt sie als `teilbetraege` zurück (Review-Befund B4).

```
// je Kind im Haushalt (istKind === true):
  alterKind = alterInJahren(kind.geburtsdatum, haushalt.pruefungsStichtag)

  anspruchsvoraussetzungKind =
    alterKind < ALTERSGRENZE_JAHRE AND
    (andererElternteilZahltKeinenOderUnzureichendenUnterhalt
     OR andererElternteilIstUnbekanntOderVerstorben)

  // Einkommensvoraussetzung greift erst ab dem 12. Geburtstag — BRUTTO
  einkommensvoraussetzungKind =
    alterKind < 12
      ? true
      : betreuenderElternteil.einkommen.bruttoMonatlich >= MINDESTEINKOMMEN_AB_12_JAHRE

  mindestunterhalt(alterKind) =
    alterKind <= 5  ? MINDESTUNTERHALT_0_5  :
    alterKind <= 11 ? MINDESTUNTERHALT_6_11 :
                      MINDESTUNTERHALT_12_17

  // volle Kindergeldanrechnung — Unterschied zum regulären Kindesunterhalt,
  // wo nur die Hälfte abgezogen wird. KINDERGELD_MONATLICH ist eine zentrale
  // Konstante (SPEC 6.2.5), nicht modul-lokal gepflegt.
  uvgBetrag(kind) = anspruchsvoraussetzungKind AND einkommensvoraussetzungKind
    ? max(0, mindestunterhalt(alterKind) - KINDERGELD_MONATLICH)
    : 0

// Ergebnis
voraussetzungenErfuellt = haushaltstyp === 'alleinerziehend'
                          AND mindestens ein Kind mit uvgBetrag > 0
betrag       = summe(uvgBetrag(kind) für alle Kinder)
teilbetraege = kinder
  .filter(k => uvgBetrag(k) > 0)
  .map(k => ({ personId: k.id, betrag: uvgBetrag(k),
               hinweis: `Altersgruppe ${altersgruppe(k)}` }))
```

## 4. Konstanten (TBD — vor Implementierung/jährlich zu verifizieren)

| Konstante | Wert ab 01.01.2026 | Quelle |
|---|---|---|
| `MINDESTUNTERHALT_0_5` | 486 €/Monat | § 1 MinUhV |
| `MINDESTUNTERHALT_6_11` | 558 €/Monat | § 1 MinUhV |
| `MINDESTUNTERHALT_12_17` | 653 €/Monat | § 1 MinUhV |
| `KINDERGELD_MONATLICH` | 259 €/Monat | § 66 EStG, systemweite Konstante im Set `2026-01` |
| `ALTERSGRENZE_JAHRE` | 18 (aktuell geltend, siehe Abschnitt 0) | UhVorschG |
| `MINDESTEINKOMMEN_AB_12_JAHRE` | 600 € brutto/Monat | UhVorschG |

Zahlbetrag nach § 2 UhVorschG (Mindestunterhalt minus volles Kindergeld): **227 / 299 / 394 €**. Eine frühere Fassung dieser Tabelle hatte die Zahlbeträge als Mindestunterhalt eingetragen; damit wäre die Formel in Abschnitt 3 für die erste Altersstufe auf 0 € gelaufen.

## 5. Ergebnis-Report (`naechsteSchritte`)

- `beschreibung`: "Unterhaltsvorschuss wird beim Jugendamt der Wohnortgemeinde beantragt. Der Vorschuss wird vom Staat beim unterhaltspflichtigen Elternteil zurückgefordert."
- `benoetigteUnterlagen`: Geburtsurkunde des Kindes, Nachweis über ausbleibende/unzureichende Unterhaltszahlungen, eigener Einkommensnachweis (bei Kindern ab 12 Jahren), Kindergeldbescheid.
- `zustaendigeStelle`: "Jugendamt / Unterhaltsvorschusskasse der Wohnortgemeinde."

## 6. Offene Punkte dieses Moduls

- [x] `KINDERGELD_MONATLICH` als systemweite Konstante — gelöst in SPEC v0.4, liegt im versionierten Konstanten-Set (SPEC 6.2.5/6.4)
- [ ] Verhalten bei geplanter Reform 2027 (Altersgrenze 16 statt 18 Jahre) — Konstante `ALTERSGRENZE_JAHRE` muss zentral und einfach aktualisierbar sein; Monitoring des Gesetzgebungsprozesses empfohlen
- [x] Mindesteinkommensgrenze ab 12 Jahren — **entschieden**: Die Grundregel rechnet mit (kein Bürgergeldbezug des Kindes **oder** mindestens 600 € Bruttoeinkommen des alleinerziehenden Elternteils). Die Ausnahmen davon werden **nicht** gerechnet, sondern im Report benannt: „Ab 12 Jahren gibt es Unterhaltsvorschuss nur unter zusätzlichen Bedingungen. Von denen gibt es Ausnahmen — etwa wenn der Vorschuss die Hilfebedürftigkeit gerade vermeiden würde. Frag im Zweifel beim Jugendamt nach." Begründung: Die Ausnahmen bräuchten mehrere Wizard-Fragen für wenige Fälle, und ein „nein" mit Hinweis kostet den Nutzer eine Nachfrage, ein falsches „nein" ohne Hinweis kostet ihn den Anspruch
- [x] Zusammenspiel mit Wohngeld — **spezifiziert**, siehe Abschnitt 7.

## 7. Anrechnung beim Wohngeld

**Rechtsgrundlage: § 14 Abs. 2 Nr. 21 WoGG** nennt „die Leistungen nach dem Unterhaltsvorschussgesetz" ausdrücklich unter den Einnahmen, die zum wohngeldrechtlichen Jahreseinkommen zählen.

```ts
{
  id: 'uvg-als-einkommen-wohngeld',
  quelle: 'unterhaltsvorschuss',
  ziel: 'wohngeld',
  anteil: 1.0,
  beschreibung: '§ 14 Abs. 2 Nr. 21 WoGG — Leistungen nach dem UhVorschG zählen zum Jahreseinkommen',
}
```

**Anteil: 100 %.** Das Gesetz nennt keine Kürzung und keinen Freibetrag für diese Position.

**Bemessungsgrundlage**: der tatsächlich gezahlte Monatsbetrag je Kind, mal zwölf, als Einkommen **des Kindes**. Es ist Einkommen eines Haushaltsmitglieds, nicht des Antragstellers — das ist bei der Zuordnung im Datenmodell wichtig.

Zwei Punkte, die beim Einbau leicht falsch laufen:

- **Keine pauschalen Abzüge nach § 16 WoGG.** Die je 10 % für Steuern, Kranken- und Rentenversicherung setzen voraus, dass diese Zahlungen anfallen. Auf Unterhaltsvorschuss fallen sie nicht an, also wird der Betrag ungekürzt angesetzt.
- **Kein Freibetrag nach § 17 Nr. 4 WoGG.** Der Freibetrag bis 1.200 € gilt für eigene Einkünfte des Kindes **aus Erwerbstätigkeit**. Unterhaltsvorschuss ist keine.

**Zyklusfreiheit**: Der Unterhaltsvorschuss hängt selbst von keiner anderen Leistung ab — er kennt nur Kindergeld, und das ist eine Konstante. Die Kante `unterhaltsvorschuss → wohngeld` bleibt damit azyklisch, `validiereAnrechnungsRules()` läuft durch ([orchestrator.md](../orchestrator.md) Abschnitt 6).

> **Nebenbefund für später**: § 14 Abs. 2 nennt zwei weitere Positionen, die dieses Modell noch nicht kennt — Nr. 20a den Unterhalt vom geschiedenen oder dauernd getrennt lebenden Ehegatten, Nr. 27 Ausbildungsleistungen zur Hälfte (also BAföG). Beide erhöhen das Wohngeld-Einkommen und fehlen bislang.
