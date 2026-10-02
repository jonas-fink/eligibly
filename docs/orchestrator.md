# Architektur: Cross-Modul-Orchestrierung & Vorrangregeln

Teil von: [SPEC.md](../SPEC.md) — Abschnitt 6.1 (Architekturprinzip)
Stand: v3 (Architektur-Entscheidungen aus SPEC.md Abschnitt 11 eingearbeitet: Grenzbereichs-Kollision 4.3, Nachrangigkeitsgrund 4.2, Azyklizität der Anrechnung 6)
Vorher: v2 (überarbeitet nach [docs/spec-review.md](spec-review.md), Befunde A1, A6, A7, B5, B6, C1, D2)
Betrifft aktuell: [Grundsicherung](module-specs/grundsicherung.md), [Neue Grundsicherung](module-specs/buergergeld.md), [Wohngeld](module-specs/wohngeld.md), [Kinderzuschlag](module-specs/kinderzuschlag.md), [Unterhaltsvorschuss](module-specs/unterhaltsvorschuss.md)

## 1. Problem

Zwischen den Hilfesystemen bestehen **drei** verschiedene Arten von Abhängigkeit. Sie brauchen unterschiedliche Mechanismen und dürfen nicht vermischt werden:

| Art | Beispiel | Mechanismus |
|---|---|---|
| **Harter Ausschluss** | Neue Grundsicherung oder Grundsicherung (SGB XII) → Wohngeld entfällt (§ 7 WoGG) | deklarative Regeltabelle (Abschnitt 5) |
| **Vermeidungsprüfung** | Kinderzuschlag + Wohngeld haben Vorrang vor der Neuen Grundsicherung, *wenn* sie zusammen die Bedürftigkeit vermeiden (§ 6a BKGG) | benannter Sonderschritt (Abschnitt 4) |
| **Leistung als Einkommen** | Unterhaltsvorschuss wird beim Wohngeld angerechnet | Anrechnungsregeln vor der Berechnung (Abschnitt 6) |
| **Abgrenzung (kein Vorrang)** | Grundsicherung SGB XII vs. Neue Grundsicherung SGB II — entschieden über Alter/Erwerbsfähigkeit | in den Modulen selbst über `voraussetzungenErfuellt` |

Würde jedes Modul das selbst lösen (z. B. Wohngeld fragt „beziehst du bereits Neue Grundsicherung?" als Nutzereingabe), entstünde doppelte, inkonsistente Logik — und die Antwort müsste der Nutzer selbst wissen, obwohl genau das die Frage ist, die die App beantworten soll.

## 2. Architekturentscheidung

1. **Module bleiben pur**: Jede `calculate()`-Funktion kennt ausschließlich `Haushalt` + eigene `systemSpecificAnswers`. Kein Modul ruft ein anderes auf oder bekommt fremde Ergebnisse als Input.
2. **Eine Orchestrierungs-Schicht** (`packages/eligibility/src/orchestrator.ts`) kennt als einzige die Beziehungen zwischen Systemen.
3. **Harte Ausschlüsse deklarativ** als `PrecedenceRule`-Liste; **Anrechnungen deklarativ** als `EinkommensanrechnungsRule`-Liste.
4. Die **§-6a-Vermeidungsprüfung** ist kein „A schließt B aus", sondern ein Szenarienvergleich über drei Systeme — sie steht als eigener, benannter und kommentierter Schritt im Code, nicht in einer generischen Regeltabelle.
5. Der Orchestrator rechnet immer die **ganze Systemgruppe** (siehe [SPEC.md 5.1](../SPEC.md#51-auswahl-steuert-die-anzeige-nicht-die-berechnung)), nicht nur die vom Nutzer ausgewählten Systeme. Die Auswahl filtert erst die Anzeige.

## 3. Gemeinsame Hilfsfunktionen

`ModuleCalculation` ist in [SPEC.md 6.3](../SPEC.md#63-berechnungsergebnis-eines-moduls) definiert und nach `berechnungsart` differenziert — nur bedarfsorientierte Module liefern `bedarf`/`anrechenbaresEinkommen`/`bedarfsluecke`. Der Orchestrator darf diese Felder deshalb nur nach Prüfung der `berechnungsart` verwenden.

```ts
/** Einzige zulässige Prüfung auf "hat tatsächlich Anspruch". */
function istAnspruchsberechtigt(calc?: ModuleCalculation): boolean {
  return !!calc && calc.voraussetzungenErfuellt && calc.betrag > 0;
}
```

`istAnspruchsberechtigt()` ist bewusst **streng**: `imGrenzbereich` (siehe [SPEC.md 6.3.1](../SPEC.md#631-grenzbereich-und-schwellenwert_vielleicht)) macht daraus kein `true`. Ein Grenzbereichs-Ergebnis löst also nie einen Ausschluss aus — die Begründung dafür steht in 4.3.

> **Wichtig (Review-Befund A6)**: Ein Modul kann `betrag > 0` liefern **und** `voraussetzungenErfuellt === false` (z. B. rechnerische Bedarfslücke, aber Vermögen über dem Freibetrag). Ein Ausschluss darf nie allein am Betrag hängen — sonst verliert der Nutzer ein Ergebnis wegen einer vorrangigen Leistung, auf die er gar keinen Anspruch hat. Überall `istAnspruchsberechtigt()` verwenden, nie `calc.betrag > 0` direkt.

## 4. Ablauf im Orchestrator

```ts
function evaluateHaushalt(
  haushalt: Haushalt,
  interessierendeSysteme: SystemKey[],
  answers: Partial<Record<SystemKey, unknown>>
): Record<SystemKey, EligibilityResult> {

  // 0. Systemgruppen auflösen: es wird immer die ganze Gruppe gerechnet (SPEC.md 5.1)
  const zuBerechnen = expandiereZuSystemgruppen(interessierendeSysteme);

  // 1. Anrechnungsreihenfolge bestimmen und Module berechnen (siehe Abschnitt 6)
  const rohberechnungen = berechneMitAnrechnung(haushalt, zuBerechnen, answers);

  // 2. § 6a BKGG — Vermeidungsprüfung (siehe 4.1)
  wendeVermeidungspruefungAn(rohberechnungen);

  // 3. Harte Ausschlüsse (siehe Abschnitt 5)
  wendePrecedenceRulesAn(rohberechnungen);

  // 3b. Nicht entscheidbare Vorrangverhältnisse markieren (siehe 4.3)
  markiereUnklarenVorrang(rohberechnungen);

  // 4. In Report-Einträge umwandeln, dann auf die interessierenden Systeme filtern
  return mapUndFiltere(rohberechnungen, interessierendeSysteme);
}
```

Die Reihenfolge 2 → 3 ist **signifikant**: Erst muss feststehen, ob die Neue Grundsicherung überhaupt greift, danach kann der davon abhängige Wohngeld-Ausschluss angewendet werden. Umgekehrt würde Wohngeld ausgeschlossen, bevor geklärt ist, ob es die Bedürftigkeit gerade vermeidet. Dafür gibt es einen expliziten Regressionstest (Abschnitt 8).

### 4.1 § 6a BKGG — Vermeidungsprüfung

```ts
function wendeVermeidungspruefungAn(calcs: Record<SystemKey, ModuleCalculation>): void {
  const ng  = calcs.buergergeld;
  const kiz = calcs.kinderzuschlag;
  const wg  = calcs.wohngeld;

  // Vorbedingung: ohne Neue Grundsicherung im Prüflauf gibt es nichts zu vermeiden.
  // Ebenso wenig, wenn weder KiZ noch Wohngeld gerechnet wurden.
  if (!ng || ng.berechnungsart !== 'bedarfsdeckung') return;
  if (!kiz && !wg) return;
  if (!istAnspruchsberechtigt(ng)) return;   // NG greift ohnehin nicht — nichts zu vermeiden
  if (ng.imGrenzbereich) return;             // Grundlage zu unsicher für eine Verdrängung (4.3)

  // Die zu schließende Lücke ist der ungedeckte Bedarf, NICHT der Gesamtbedarf.
  const zuSchliessendeLuecke = ng.bedarfsluecke ?? 0;

  const vermeidungspaket =
    (istAnspruchsberechtigt(kiz) ? kiz!.betrag : 0) +
    (istAnspruchsberechtigt(wg)  ? wg!.betrag  : 0);

  /** Die tatsächlich am Vermeidungspaket beteiligten Systeme — nur sie werden im Report genannt. */
  const verdraengendeSysteme = (): SystemKey[] => [
    ...(istAnspruchsberechtigt(kiz) ? ['kinderzuschlag' as SystemKey] : []),
    ...(istAnspruchsberechtigt(wg)  ? ['wohngeld' as SystemKey]       : []),
  ];

  if (vermeidungspaket >= zuSchliessendeLuecke) {
    // KiZ + Wohngeld decken die Lücke: sie haben Vorrang, NG wird nicht benötigt
    calcs.buergergeld = alsNachrangig(ng, verdraengendeSysteme(), 'vermeidung');
  } else if (kiz) {
    // Lücke bleibt offen: NG greift, KiZ tritt zurück
    calcs.kinderzuschlag = alsNachrangig(kiz, ['buergergeld'], 'vermeidung');
  }
}
```

> **Review-Befund A1 (korrigiert)**: In v1 wurde `vermeidungspaket >= ng.bedarf` verglichen — ein Leistungsbetrag gegen den *Gesamtbedarf*, ohne das Einkommen des Haushalts. Beispiel Familie mit 2 Erwachsenen + 2 Kindern: Bedarf ≈ 2.759 €, maximales Paket ≈ 894 €. Die Bedingung wäre praktisch immer `false` gewesen und hätte den Kinderzuschlag in jedem realistischen Fall gestrichen — das Gegenteil der beabsichtigten Wirkung. Maßgeblich ist die **Bedarfslücke** (`bedarf − anrechenbaresEinkommen`), nicht der Bedarf.

**Zum Kindergeld**: Es ist bei der Neuen Grundsicherung anrechenbares Einkommen und damit bereits in `ng.bedarfsluecke` berücksichtigt. Es darf im `vermeidungspaket` **nicht** noch einmal auftauchen — sonst wird es doppelt gezählt. Die Modul-Spec der Neuen Grundsicherung muss deshalb sicherstellen, dass Kindergeld in `anrechenbaresEinkommen` enthalten ist.

**Grenzfall Gleichstand**: Bei `vermeidungspaket === zuSchliessendeLuecke` gewinnt das Vermeidungspaket (`>=`). Das entspricht dem gesetzlichen Zweck, Hilfebedürftigkeit zu vermeiden. Explizit getestet (Abschnitt 8).

**Warum `istAnspruchsberechtigt(ng)` und nicht `ng.voraussetzungenErfuellt`** (v3): Die reine Voraussetzungsprüfung lässt den Fall durch, dass die Eingangsvoraussetzungen erfüllt sind, die Bedarfslücke aber bereits geschlossen ist (`betrag === 0`, z. B. Lücke −20 €). Dann wäre `zuSchliessendeLuecke` null oder negativ, die Bedingung `vermeidungspaket >= 0` trivial wahr — und die Neue Grundsicherung würde als „nachrangig, verdrängt durch Kinderzuschlag und Wohngeld" ausgewiesen, obwohl sie ohnehin nicht greift. Der Nutzer bekäme eine Verdrängungserklärung für eine Leistung, die er schlicht nicht braucht. Der zweite Guard schließt denselben Fall für den Grenzbereich: Ist die Lücke nur knapp geschlossen, ist die Grundlage für eine Verdrängungsaussage zu dünn (siehe 4.3).

### 4.2 Nachrangigkeit statt Streichung

```ts
type NachrangigGrund = 'ausschluss' | 'vermeidung';

function alsNachrangig(
  calc: ModuleCalculation,
  durch: SystemKey[],           // Mehrzahl: das § 6a-Vermeidungspaket besteht aus zwei Leistungen
  grund: NachrangigGrund,
): ModuleCalculation {
  return {
    ...calc,
    betrag: 0,
    nachrangigDurch: durch,       // steuert später EligibilityStatus 'nachrangig'
    nachrangigGrund: grund,       // steuert den Report-Text (SPEC.md 6.5.3)
    // voraussetzungenErfuellt bleibt UNVERÄNDERT
  };
}
```

**Warum `durch` ein Array ist**: Beim harten Ausschluss gibt es genau ein vorrangiges System. Bei der § 6a-Vermeidungsprüfung verdrängen Kinderzuschlag **und** Wohngeld gemeinsam die Neue Grundsicherung — keines der beiden allein. Ein Einzelwert würde den Report zwingen, willkürlich eines der beiden zu nennen, und die Aussage „diese zwei zusammen decken deinen Bedarf" ginge verloren.

**Warum `grund` gebraucht wird**: Die beiden Nachrangigkeitsarten sind für den Nutzer inhaltlich gegensätzlich. Ein harter Ausschluss ist eine Einschränkung („daneben gibt es kein Wohngeld"), die Vermeidungsprüfung eine gute Nachricht („dein Bedarf ist bereits gedeckt"). Ohne dieses Feld kann `toResult()` sie nicht unterscheiden und müsste beide gleich formulieren.

> **Review-Befund C1 (korrigiert)**: In v1 wurde beim Ausschluss `voraussetzungenErfuellt = false` gesetzt. Damit war im Ergebnis nicht mehr unterscheidbar, ob jemand die Voraussetzungen nicht erfüllt oder ob eine vorrangige Leistung greift — und der Report hätte die generische „so beantragst du X"-Anleitung für genau die Leistung angezeigt, die gerade ausgeschlossen wurde. `voraussetzungenErfuellt` bleibt jetzt unangetastet und beschreibt weiterhin nur die fachlichen Eingangsvoraussetzungen; die Nachrangigkeit ist ein eigenes Feld, aus dem `toResult()` den Status `'nachrangig'` und `ausgeschlossenDurch` ableitet (siehe [SPEC.md 6.5](../SPEC.md#65-ergebnis-report-output)).

Der Report zeigt bei `'nachrangig'` nicht die Antragsanleitung des ausgeschlossenen Systems, sondern einen Verweis auf die vorrangige Leistung („In deiner Situation greift stattdessen X — dort findest du die nächsten Schritte").

### 4.3 Vorrangentscheidung bei unsicherer Grundlage

Eine Vorrangregel verlangt eine harte Ja/Nein-Aussage, kann aber auf einem Grenzbereichs-Ergebnis stehen (`imGrenzbereich`, [SPEC.md 6.3.1](../SPEC.md#631-grenzbereich-und-schwellenwert_vielleicht)). Was dann?

**Festlegung: Es wird kein Ausschluss auf unsicherer Grundlage ausgesprochen.** `istAnspruchsberechtigt()` bleibt streng — ein Grenzbereichs-Ergebnis zählt nicht als „berechtigt", die Regel greift nicht, beide Ergebnisse bleiben im Report stehen.

Begründung: Der Schaden ist asymmetrisch. Eine zu Unrecht angezeigte Leistung kostet den Nutzer einen unnötigen Antrag. Eine zu Unrecht verschwiegene Leistung kostet ihn Geld, auf das er einen Anspruch hat — und die App würde genau das Ergebnis unterdrücken, für das er sie geöffnet hat. Bei gleicher Unsicherheit fällt die Entscheidung deshalb zugunsten der Sichtbarkeit.

Damit der Nutzer die Unsicherheit sieht statt zwei sich widersprechende Ergebnisse:

```ts
/** Markiert Systeme, deren Vorrangverhältnis nicht belastbar entschieden werden konnte. */
function markiereUnklarenVorrang(calcs: Record<SystemKey, ModuleCalculation>): void {
  for (const regel of PRECEDENCE_RULES) {
    const gewinner = calcs[regel.wennBerechtigt];
    const verlierer = calcs[regel.dannNachrangig];
    if (!gewinner || !verlierer) continue;
    // Der Gewinner ist nicht klar berechtigt, liegt aber im Grenzbereich —
    // der Ausschluss hätte greifen können, ist aber nicht entscheidbar.
    if (!istAnspruchsberechtigt(gewinner) && gewinner.imGrenzbereich) {
      verlierer.vorrangUnklar = [...(verlierer.vorrangUnklar ?? []), regel.wennBerechtigt];
    }
  }
}
```

Der Aufruf gehört als Schritt 3b hinter `wendePrecedenceRulesAn()`. `toResult()` überträgt das Feld in den Report, wo es den Hinweissatz aus [SPEC.md 6.5.3](../SPEC.md#653-statusdarstellung-im-report) auslöst.

Für die § 6a-Vermeidungsprüfung gilt dasselbe Prinzip, aber sie braucht dafür einen **eigenen** Guard: `imGrenzbereich` und `voraussetzungenErfuellt` sind unabhängig voneinander — die Eingangsvoraussetzungen der Neuen Grundsicherung (Alter, Erwerbsfähigkeit) können erfüllt sein, während die Bedarfslücke im Grenzbereich liegt. `wendeVermeidungspruefungAn()` prüft deshalb `istAnspruchsberechtigt(ng)` **und** `!ng.imGrenzbereich`, bevor sie irgendetwas verdrängt (siehe 4.1). Andernfalls bliebe die Neue Grundsicherung mit einer Verdrängungserklärung stehen, obwohl gar nicht sicher ist, dass sie überhaupt gegriffen hätte.

## 5. Harte Ausschlüsse — deklarative Regeltabelle

```ts
interface PrecedenceRule {
  id: string;
  beschreibung: string;              // Gesetzesverweis, erscheint in der Begründung
  wennBerechtigt: SystemKey;         // Gewinner-System
  dannNachrangig: SystemKey;         // Verlierer-System
  begruendungFuerNutzer: string;     // Klartext für den Report
}

const PRECEDENCE_RULES: PrecedenceRule[] = [
  {
    id: 'wohngeld-ausschluss-neue-grundsicherung',
    beschreibung: '§ 7 WoGG — Bezug der Neuen Grundsicherung schließt Wohngeld aus',
    wennBerechtigt: 'buergergeld',
    dannNachrangig: 'wohngeld',
    begruendungFuerNutzer:
      'Weil die Unterkunftskosten bereits in der Neuen Grundsicherung enthalten sind, ' +
      'gibt es daneben kein Wohngeld.',
  },
  {
    id: 'wohngeld-ausschluss-grundsicherung-sgb-xii',
    beschreibung: '§ 7 WoGG — Bezug von Grundsicherung im Alter/bei Erwerbsminderung schließt Wohngeld aus',
    wennBerechtigt: 'grundsicherung',
    dannNachrangig: 'wohngeld',
    begruendungFuerNutzer:
      'Weil die Unterkunftskosten bereits in der Grundsicherung enthalten sind, ' +
      'gibt es daneben kein Wohngeld.',
  },
];

function wendePrecedenceRulesAn(calcs: Record<SystemKey, ModuleCalculation>): void {
  for (const regel of PRECEDENCE_RULES) {
    if (istAnspruchsberechtigt(calcs[regel.wennBerechtigt]) && calcs[regel.dannNachrangig]) {
      calcs[regel.dannNachrangig] = alsNachrangig(
        calcs[regel.dannNachrangig], [regel.wennBerechtigt], 'ausschluss',
      );
    }
  }
}
```

Die Regel trägt ihren Begründungstext selbst — sonst geht beim Übergang von `ModuleCalculation` zu `EligibilityResult` verloren, *warum* ausgeschlossen wurde, und der Nutzer sieht ein „nein" ohne Erklärung.

**Grundsicherung (SGB XII) vs. Neue Grundsicherung (SGB II)** ist bewusst *keine* Regel in dieser Tabelle: Die beiden Systeme grenzen sich über Alter und Erwerbsfähigkeit ab, nicht über Vorrang. Das gehört in die Eingangsvoraussetzungen der jeweiligen Module (`voraussetzungenErfuellt`).

### 5.1 Reihenfolge und Zyklen

> **Review-Befund D2**: Die Schleife iteriert linear über das Array — das Ergebnis hinge damit von der Array-Reihenfolge ab, was das Versprechen einer deklarativen Tabelle bricht.

Verbindliche Regeln für diese Tabelle:

1. **Kein System darf gleichzeitig Gewinner und Verlierer sein.** Formal: der Graph über `wennBerechtigt → dannNachrangig` muss azyklisch sein und die Tiefe 1 haben.
2. Diese Invariante wird beim Start durch eine Assertion geprüft (`validierePrecedenceRules()`), nicht nur dokumentiert. Verletzt eine neu hinzugefügte Regel sie, schlägt der Test fehl.
3. Wird eine Regel gebraucht, die diese Invariante verletzt (Kette über mehrere Stufen), gehört sie **nicht** in diese Tabelle, sondern als benannter Sonderschritt in den Orchestrator — wie die § 6a-Prüfung.

Unter dieser Invariante ist das Ergebnis reihenfolgeunabhängig, weil `alsNachrangig()` nur den Verlierer verändert und Verlierer nie Gewinner einer anderen Regel sind.

## 6. Leistung als Einkommen einer anderen Leistung

> **Review-Befund B6**: In v1 fehlte diese Kategorie vollständig. Sie ist kein Vorrangverhältnis, sondern eine **Berechnungsabhängigkeit** — und teils zirkulär.

Bekannte Fälle:

| Leistung | zählt als Einkommen bei | Status |
|---|---|---|
| Unterhaltsvorschuss | Wohngeld (100 %) | **ausdetailliert**: § 14 Abs. 2 Nr. 21 WoGG, siehe [unterhaltsvorschuss.md](module-specs/unterhaltsvorschuss.md) Abschnitt 7 |
| Unterhaltsvorschuss | Kinderzuschlag (als Kindeseinkommen, **45 %**) | § 6a Abs. 3 BKGG; in der KiZ-Modul-Spec abgebildet (v1 hatte fälschlich 100 %) |
| Kindergeld | Neue Grundsicherung (anrechenbar), Kinderzuschlag (Voraussetzung) | im Kernmodell ergänzt (SPEC 6.2.5) |
| Kindergeld / Wohngeld | WBS: ausdrücklich **kein** Einkommen | in der WBS-Modul-Spec abgebildet |

```ts
interface EinkommensanrechnungsRule {
  id: string;
  quelle: SystemKey;        // Leistung, die als Einkommen zählt
  ziel: SystemKey;          // Leistung, deren Berechnung sie beeinflusst
  anteil: number;           // 1.0 = volle Anrechnung
  beschreibung: string;
}
```

### Auflösungsstrategie (MVP) — entschieden, v3

**Der Anrechnungsgraph muss azyklisch sein. Das wird beim Start geprüft, nicht approximiert.**

```ts
/** Analog zu validierePrecedenceRules(): Verstoß = Startup-Fehler, nicht stille Näherung. */
function validiereAnrechnungsRules(regeln: EinkommensanrechnungsRule[]): void {
  // wirft, wenn der Graph quelle -> ziel einen Zyklus enthält
}
```

Ablauf:

1. `validiereAnrechnungsRules()` beim Start — schlägt fehl, wenn eine neu hinzugefügte Regel einen Zyklus erzeugt.
2. Die Regeln werden topologisch sortiert; die Quell-Leistung wird vor der Ziel-Leistung berechnet.
3. Das Ergebnis der Quelle wird dem Ziel als reiner Betrag übergeben (`zusaetzlichesEinkommen?: Partial<Record<SystemKey, number>>` im `EligibilityInput`), nicht als Modul-Referenz — die Module bleiben pur. Jedes Zielmodul deklariert in seiner Sub-Spec, welche Quellen es entgegennimmt und wie es sie verrechnet.

**Warum die Zwei-Runden-Näherung aus v2 entfällt**: Der heute bekannte Graph ist azyklisch — Unterhaltsvorschuss speist Wohngeld und Kinderzuschlag, hängt selbst aber an keiner anderen Leistung (nur am Kindergeld, und das ist eine Konstante). Die Rückkopplung von Wohngeld und Kinderzuschlag auf die Neue Grundsicherung ist eine **Vorrangentscheidung** (§ 6a, Abschnitt 4.1), keine Einkommensanrechnung, und läuft deshalb nicht über diese Tabelle.

Eine implementierte Näherung wäre damit ein Codepfad, den kein Testfall erreicht — und der im Ernstfall einen Fehler unbekannter Größe erzeugt, den nur ein `datenluecken`-Eintrag andeutet. Eine Assertion macht denselben Fall sichtbar und zwingt zur bewussten Entscheidung.

**Fallback für den Tag, an dem eine zyklische Regel gebraucht wird** (dokumentiert, nicht implementiert): erste Runde ohne Anrechnung, zweite Runde mit den Beträgen der ersten, kein weiteres Iterieren, Vermerk in `datenluecken`. Das wird dann bewusst eingebaut und getestet — nicht vorsorglich mitgeschleppt.

Bis die UVG-Wohngeld-Anrechnung ausdetailliert ist (siehe [SPEC.md 11](../SPEC.md#11-offene-punkte-tbd-liste)), ist die Regeltabelle leer und dieser gesamte Mechanismus inaktiv.

## 7. Auswirkung auf die Modul-Specs

- **[wohngeld.md](module-specs/wohngeld.md)**: kein Feld für den Bezug anderer Leistungen; Modul rechnet immer unabhängig.
- **[kinderzuschlag.md](module-specs/kinderzuschlag.md)**: liefert den vollen, unkorrigierten Anspruch; Vorrangentscheidung trifft der Orchestrator.
- **[buergergeld.md](module-specs/buergergeld.md)**: muss Kindergeld in `anrechenbaresEinkommen` enthalten (siehe 4.1), damit die Vermeidungsprüfung nicht doppelt zählt.
- **[unterhaltsvorschuss.md](module-specs/unterhaltsvorschuss.md)**: Anrechnung beim Wohngeld ist hier zu spezifizieren, nicht im Wohngeld-Modul.

## 8. Teststrategie

Pflicht-Testfälle für den Orchestrator (jeder als eigener Unit-Test):

1. Vermeidungspaket deckt die Lücke → Neue Grundsicherung wird `nachrangig`, Wohngeld bleibt bestehen
2. Vermeidungspaket deckt die Lücke **nicht** → Kinderzuschlag wird `nachrangig`, Neue Grundsicherung bleibt, Wohngeld wird durch die Precedence-Rule `nachrangig`
3. Grenzfall `vermeidungspaket === bedarfsluecke` → Vermeidungspaket gewinnt
4. Nur Wohngeld ausgewählt → Systemgruppe wird trotzdem gerechnet, Report zeigt nur Wohngeld
5. Neue Grundsicherung mit `betrag > 0`, aber `voraussetzungenErfuellt === false` (Vermögen zu hoch) → Wohngeld wird **nicht** ausgeschlossen (Befund A6)
6. Reihenfolge-Regression: § 6a-Prüfung läuft vor den Precedence-Rules
7. `validierePrecedenceRules()` schlägt bei einer zyklischen Testregel fehl
8. Ein Modul mit `berechnungsart !== 'bedarfsdeckung'` (Elterngeld) wird von der Vermeidungsprüfung nicht angefasst
9. Gewinner-System `imGrenzbereich === true`, aber nicht berechtigt → **kein** Ausschluss, Verlierer bekommt `vorrangUnklar` (4.3)
10. § 6a-Paket aus beiden Leistungen → `nachrangigDurch === ['kinderzuschlag', 'wohngeld']`, `nachrangigGrund === 'vermeidung'`
11. Harter Ausschluss → `nachrangigDurch.length === 1`, `nachrangigGrund === 'ausschluss'`
12. Nur Kinderzuschlag ist berechtigt, Wohngeld nicht → `nachrangigDurch === ['kinderzuschlag']` (kein System nennen, das gar nichts beisteuert)
13. `validiereAnrechnungsRules()` schlägt bei einer zyklischen Testregel fehl (Abschnitt 6)
14. Neue Grundsicherung mit `voraussetzungenErfuellt === true`, aber `betrag === 0` (Lücke bereits geschlossen) → Vermeidungsprüfung greift **nicht**, NG wird nicht als `nachrangig` ausgewiesen (4.1)
15. Neue Grundsicherung `imGrenzbereich === true` → Vermeidungsprüfung greift nicht, Kinderzuschlag und Wohngeld bleiben unverändert

## 9. Offene Punkte

- [x] `SCHWELLENWERT_VIELLEICHT` — **entschieden (SPEC v0.5)**: einheitlicher Default im Konstanten-Set, pro Modul überschreibbare Bezugsgröße, neues Feld `imGrenzbereich` auf `ModuleCalculation` ([SPEC.md 6.3.1](../SPEC.md#631-grenzbereich-und-schwellenwert_vielleicht))
- [x] Report-Text für `'nachrangig'` — **entschieden (v3)**: reiner Verweis ohne Betragsvergleich, zwei Textvarianten über `nachrangigGrund` (4.2, [SPEC.md 6.5.3](../SPEC.md#653-statusdarstellung-im-report))
- [x] Verhalten, wenn zwei Systeme derselben Gruppe beide im Grenzbereich liegen — **entschieden (v3)**: kein Ausschluss auf unsicherer Grundlage, `vorrangUnklar` im Report (4.3)
- [x] Zyklen in der Einkommensanrechnung — **entschieden (v3)**: Azyklizität als geprüfte Invariante, Näherung entfällt (Abschnitt 6)
- [x] Unterhaltsvorschuss-Anrechnung beim Wohngeld — **ausdetailliert** (§ 14 Abs. 2 Nr. 21 WoGG, 100 %, als Einkommen des Kindes): [unterhaltsvorschuss.md](module-specs/unterhaltsvorschuss.md) Abschnitt 7. Damit ist die Regeltabelle aus Abschnitt 6 nicht mehr leer — und sie ist azyklisch, die Assertion läuft durch
- [ ] Zwei weitere Einkommenspositionen beim Wohngeld erfassen, die § 14 Abs. 2 WoGG nennt und das Modell noch nicht kennt: Nr. 20a Unterhalt vom geschiedenen oder getrennt lebenden Ehegatten, Nr. 27 Ausbildungsförderung zur Hälfte
