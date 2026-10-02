# Spec-Review: Lücken, Widersprüche und Ambiguität

Review-Datum: 2026-09-06
Geprüfte Dokumente: `SPEC.md` (v0.3), `docs/orchestrator.md`, alle 8 Sub-Specs unter `docs/module-specs/`
Fokus: **innere Widersprüche und Modellierungslücken** — nicht die bereits bekannten offenen Punkte (fehlende Konstanten, Tabellen, Recherchelücken). Die sind pro Modul dokumentiert und bewusst offen.

Befunde sind nach Schweregrad sortiert. Jeder Befund nennt eine konkrete Korrektur.

---

## Bearbeitungsstand

**Alle Befunde wurden in SPEC v0.4 und Orchestrator v2 eingearbeitet** (Stand: 2026-09-06). Zwei Befunde sind nur teilweise geschlossen — der Mechanismus steht, ein Detail bleibt offen:

- **B6** (Leistung als Einkommen): Kategorie und Auflösungsstrategie sind im Orchestrator definiert, die konkrete Unterhaltsvorschuss-Wohngeld-Regel ist noch zu spezifizieren.
- **C5** (Unschärfe grober Module): `betragSpanne` ist im Ergebnismodell verankert, die Breite der Spanne ist noch festzulegen.

Dieses Dokument bleibt als Begründungs-Historie bestehen: Es dokumentiert, *warum* das Modell so aussieht, wie es aussieht. Die Code-Beispiele in den Befunden zeigen jeweils den **alten**, fehlerhaften Stand — die korrigierte Fassung steht in SPEC.md bzw. docs/orchestrator.md.

Legende: ✅ vollständig eingearbeitet · 🟡 Mechanismus eingearbeitet, Detail offen

---

## A. Rechenfehler — führen zu falschen Ergebnissen, wenn 1:1 implementiert

### ✅ A1. § 6a-BKGG-Vermeidungsprüfung vergleicht die falschen Größen (Orchestrator)

`docs/orchestrator.md`, Abschnitt 4, Schritt 2:

```ts
const vermeidungspaket = kinderzuschlag.anspruch + wohngeld.anspruch;
const vermeidetBeduerftigkeit = vermeidungspaket >= rohberechnungen.buergergeld.bedarf;
```

Hier wird ein **Leistungsbetrag** gegen den **Gesamtbedarf** verglichen. Das Einkommen des Haushalts fehlt auf der linken Seite komplett.

Beispiel Familie mit 2 Erwachsenen + 2 Kindern: Bedarf ≈ 506+506+390+357 + 1.000 € Warmmiete ≈ **2.759 €**. Maximales Vermeidungspaket: 2×297 € KiZ + ca. 300 € Wohngeld ≈ **894 €**. `vermeidetBeduerftigkeit` ist damit praktisch **immer false** — die Vermeidungsprüfung schlägt in jedem realistischen Fall fehl und der Else-Zweig nullt den Kinderzuschlag. Das kehrt genau die Logik um, die eingebaut werden sollte.

**Korrektur**: Verglichen werden muss gegen die verbleibende Bedarfslücke, nicht gegen den Gesamtbedarf. Da `anspruch = bedarf − anrechenbaresEinkommen` bereits die Lücke ist:

```ts
const vermeidetBeduerftigkeit = vermeidungspaket >= rohberechnungen.buergergeld.anspruch;
```

Zusätzlich fehlt das Kindergeld in der Rechnung — es ist bei der Neuen Grundsicherung anrechenbares Einkommen, beim Vermeidungsszenario aber Teil der Deckung. Sauberer wäre eine explizite Gegenüberstellung beider Szenarien statt der Kurzform.

### ✅ A2. Brutto/Netto-Verwechslung an mehreren Stellen

Das Kernmodell kennt nur `einkommenNetto`. Mehrere Module rechnen damit gegen **Brutto**-Grenzen:

- **Kinderzuschlag**: Die Mindesteinkommensgrenzen sind laut eigener Konstantentabelle explizit „600 € **brutto**/Monat" bzw. „900 € **brutto**/Monat". Die Berechnungslogik macht aber `elternEinkommen = summe(einkommenNetto der Eltern)` und vergleicht das direkt gegen diese Grenze. Bei einem Nettoeinkommen knapp unter 900 € wird Anspruch verneint, obwohl brutto deutlich darüber liegen kann.
- **Neue Grundsicherung**: Die §-11b-Freibetragsstaffelung (100 € / 20 % / 30 % / 10 %) bemisst sich am Bruttoeinkommen, der Pseudocode rechnet mit `einkommenNetto`. Die Stufengrenzen (520 €, 1.000 €, 1.200 €/1.500 €) sind dadurch systematisch verschoben.
- **Unterhaltsvorschuss**: braucht `eigenesBruttoEinkommenBetreuenderElternteil` — hat sich das Feld deshalb selbst in `systemSpecificAnswers` gebaut.
- **BAföG** und **WBS**: dito, beide haben eigene Brutto-Felder ergänzt bzw. als offenen Punkt vermerkt.

**Korrektur**: Siehe B1 — das gehört ins Kernmodell, nicht in fünf Einzellösungen.

### ✅ A3. Kinderzuschlag: `anteiligeAbschmelzung()` ist undefiniert — Faktor-n-Unsicherheit

```
kizProKind = max(0, HOECHSTBETRAG_KIZ - fuerKindAnrechenbaresEinkommen - anteiligeAbschmelzung(abschmelzungElternanteil))
```

Nirgends steht, wie der Elternüberschuss auf mehrere Kinder verteilt wird. Bei 3 Kindern und 300 € Abschmelzungsbetrag: je 100 € abziehen (Verteilung) oder je 300 € (voller Abzug pro Kind)? Das ist ein Unterschied von 600 €/Monat im Ergebnis. Steht auch nicht auf der Offene-Punkte-Liste des Moduls.

**Korrektur**: Verteilungsregel explizit festlegen. Sachlich naheliegend: Der Abschmelzungsbetrag wird einmal vom Gesamt-KiZ abgezogen, nicht pro Kind — also `gesamtKiz = max(0, summe(kizProKindOhneAbschmelzung) − abschmelzungElternanteil)`.

### ✅ A4. Kinderzuschlag: toter/unvollständiger Code in der Spec

```
kizProKindVorAbschmelzung = min(HOECHSTBETRAG_KIZ, ...) // Höchstbetrag ist bereits die Obergrenze
```

Die Zeile ist syntaktisch unvollständig (`...`) und wird danach nirgends verwendet. Ersatzlos streichen, sonst rät die Implementierung.

### ✅ A5. Elterngeld: Bezugsdauer-Logik ist nicht durchdacht

```
bezugsmonate =
  gewaehlteVariante === 'basis'
    ? (istAlleinerziehend ? 14 : 12) + (nutztPartnerschaftsbonus ? 0 : 0)
    : ((istAlleinerziehend ? 14 : 12) * 2) + (nutztPartnerschaftsbonus ? PARTNERSCHAFTSBONUS_MONATE : 0)
```

Zwei Probleme:
1. `+ (nutztPartnerschaftsbonus ? 0 : 0)` addiert in jedem Fall 0 — sinnfreier Term, vermutlich Platzhalter.
2. Die 14 Monate entstehen erst durch die **Partnermonate** (beide Elternteile beteiligen sich); ein Elternteil allein bekommt max. 12. Die Spec behandelt 14 als Eigenschaft von „alleinerziehend", was nur einen von zwei Wegen zu 14 Monaten abbildet. Und `* 2` auf die 14 anzuwenden unterstellt, dass alle Monate in ElterngeldPlus umgewandelt werden.

**Korrektur**: Bezugsdauer als eigene, benannte Funktion mit expliziten Fällen spezifizieren (Elternteil allein / mit Partnermonaten / alleinerziehend / Plus-Umwandlung / Partnerschaftsbonus) statt als verschachtelten Ternary.

### ✅ A6. Orchestrator: Ausschluss-Trigger prüft nur `anspruch > 0`

```ts
if (rohberechnungen[regel.wennEligible]?.anspruch > 0 && ...)
```

Ein Modul kann `anspruch > 0` liefern **und gleichzeitig** `voraussetzungenErfuellt === false` (z. B. Neue Grundsicherung mit rechnerischer Bedarfslücke, aber Vermögen über Freibetrag). Dann schließt der Orchestrator Wohngeld aus, obwohl gar kein Anspruch auf die vorrangige Leistung besteht — der Nutzer verliert grundlos ein Ergebnis.

**Korrektur**: `istAnspruchsberechtigt(calc) = calc.voraussetzungenErfuellt && calc.anspruch > 0` als gemeinsame Hilfsfunktion, überall verwenden.

### ✅ A7. Orchestrator: `else`-Zweig nullt KiZ auch ohne Bürgergeld-Auswahl

`istRelevant(...)` wird nicht definiert. Ist eines der drei Systeme nicht im Prüflauf, greift entweder ein Laufzeitfehler (`rohberechnungen.buergergeld.bedarf` auf `undefined`) oder der Else-Zweig streicht den Kinderzuschlag, obwohl der Nutzer die Neue Grundsicherung nie geprüft haben wollte.

**Korrektur**: Vorbedingung explizit: Vermeidungsprüfung nur ausführen, wenn `buergergeld` **und** mindestens eines von `kinderzuschlag`/`wohngeld` berechnet wurden. Sonst Schritt überspringen.

---

## B. Strukturelle Modelllücken — das Kernmodell trägt die Module nicht

### ✅ B1. Es gibt keinen definierten Einkommensbegriff

`einkommenNetto: number` ist der einzige Einkommensbegriff im Kernmodell. Tatsächlich gebraucht werden mindestens fünf verschiedene:

| Begriff | Gebraucht von |
|---|---|
| Netto monatlich (aktuell) | Grundsicherung, Neue Grundsicherung |
| Brutto monatlich | KiZ (Mindestgrenze), Neue Grundsicherung (Freibetragsstaffelung), UVG, BAföG |
| Brutto jährlich | WBS |
| Netto-Durchschnitt der letzten 12 Monate | Elterngeld |
| Zu versteuerndes Jahreseinkommen | Elterngeld (175.000-€-Grenze) |

Drei Module haben sich deshalb bereits eigene Felder in `systemSpecificAnswers` gebaut (`eigenesBruttoEinkommenMonatlich`, `nettoeinkommenVorGeburtMonatlich`, `eigenesBruttoEinkommenBetreuenderElternteil`), zwei rechnen still falsch (siehe A2). Ergebnis: derselbe Sachverhalt wird an vier Stellen unterschiedlich abgefragt, der Nutzer gibt sein Einkommen mehrfach ein, und Widersprüche zwischen den Feldern sind nicht erkennbar.

**Korrektur**: Ein strukturiertes Einkommensobjekt pro Person im Kernmodell, z. B.:

```ts
interface Einkommen {
  bruttoMonatlich: number;
  nettoMonatlich: number;
  artenDerEinkuenfte: {           // für modulspezifische Anrechnungsregeln
    erwerbstaetigkeit: number;    // § 11b-Freibeträge gelten nur hierauf
    rente: number;                // im SGB XII voll anrechenbar
    kapitalertraege: number;
    sonstige: number;
  };
}
```

Die Sonderfälle mit Zeitbezug (Elterngeld-Vorjahreseinkommen, BAföG-Elterneinkommen außerhalb des Haushalts) bleiben zu Recht in `systemSpecificAnswers` — aber Brutto/Netto gehört ins Kernmodell.

### ✅ B2. Kindergeld fehlt vollständig im Datenmodell

Drei Module rechnen mit Kindergeld:
- Neue Grundsicherung: `anrechenbaresKindergeld = kindergeldGesamt - 250` — `kindergeldGesamt` existiert nirgends
- Unterhaltsvorschuss: zieht `KINDERGELD_MONATLICH` (259 €) vom Mindestunterhalt ab
- Kinderzuschlag: setzt Kindergeldbezug voraus (`kindergeldWirdBezogen`)

Im UVG-Modul ist das als „systemweite Konstante definieren" vermerkt, aber es ist nicht nur eine Konstante: Es ist eine **Tatsachenfrage pro Kind** (wird es bezogen?), die den Berechnungsweg beeinflusst.

**Korrektur**: `kindergeldWirdBezogen: boolean` pro Kind ins Kernmodell (`Haushaltsmitglied` mit `istKind === true`), der Betrag als zentrale Konstante in einem gemeinsamen `src/eligibility/constants.ts`.

### ✅ B3. Vermögen nur haushaltsweit, obwohl Freibeträge personenbezogen sind

`vermoegenGesamt: number` liegt auf `Haushalt`. Aber:
- **Neue Grundsicherung** hat **altersabhängige** Freibeträge pro Person (5.000 / 10.000 / 12.500 / 20.000 €). Die Summe der Freibeträge lässt sich zwar bilden, aber die tatsächliche Zuordnung „wem gehört welches Vermögen" fehlt — bei einem 25-Jährigen mit 18.000 € und einem 55-jährigen Partner mit 0 € ist die Summenbetrachtung zu großzügig.
- **BAföG** braucht das Vermögen **des Studierenden allein** und hat deshalb `eigenesVermoegen` in `systemSpecificAnswers` dupliziert — mit dem ausdrücklichen Kommentar „ggf. identisch zu `vermoegenGesamt`". Zwei Felder für dieselbe Größe, ohne Regel welches gilt.

**Korrektur**: `vermoegen: number` auf `Haushaltsmitglied` verschieben, `vermoegenGesamt` als computed-Feld beibehalten.

### ✅ B4. Das Ergebnismodell ist haushaltsbezogen, mehrere Leistungen sind es nicht

`EligibilityResult` hat genau ein `system` und einen `geschaetzterBetrag`. Tatsächlich:

- **Unterhaltsvorschuss**: Betrag ist **pro Kind** und altersabhängig unterschiedlich (227/299/394 €). Bei drei Kindern in drei Altersgruppen: drei Beträge, ein Feld. Die Spec schreibt selbst „monatlich, pro Kind" — aber das Interface kann das nicht abbilden.
- **BAföG**: personenbezogen — für welches Haushaltsmitglied gilt das Ergebnis?
- **Elterngeld**: personenbezogen, und beide Elternteile können separat beziehen.
- **Grundsicherung/Neue Grundsicherung**: Bei gemischten Haushalten (ein Partner über der Altersgrenze, einer darunter) fallen die Personen in **unterschiedliche** Systeme. Der Pseudocode mischt das bereits: `regelsatz(person) + anteiligeUnterkunftskosten(person, ...)` ist personenbezogen, `vermoegenGesamt(haushalt)` haushaltsbezogen, das Ergebnis dann wieder ein einzelner Wert.

**Korrektur**: `EligibilityResult` um einen optionalen Bezug erweitern:

```ts
betrifftPersonId?: string;        // bei personenbezogenen Leistungen
teilbetraege?: Array<{ personId: string; betrag: number; hinweis?: string }>;
```

### ✅ B5. `ModuleCalculation` passt nur auf bedarfsorientierte Systeme

Das im Orchestrator eingeführte Interface (`bedarf`, `anrechenbaresEinkommen`, `anspruch`) beschreibt eine Bedarfsdeckungsrechnung. Drei Module funktionieren aber anders:

- **Elterngeld** ist eine Lohnersatzleistung — es gibt keinen „Bedarf", der Betrag folgt aus einer Ersatzrate. `bedarf` wäre ein Pflichtfeld ohne Bedeutung.
- **BAföG** hat zwar einen Bedarfssatz, aber die Hälfte ist Darlehen — `geschaetzterBetrag` als eine Zahl verschweigt, dass davon nur 50 % Zuschuss sind.
- **WBS** hat überhaupt keinen Betrag (`geschaetzterBetrag = undefined`), sondern liefert eine Berechtigung.

**Korrektur**: `ModuleCalculation` als Union-Type oder mit optionalen Feldern + `berechnungsart: 'bedarfsdeckung' | 'lohnersatz' | 'berechtigung'`. Die UI braucht diese Unterscheidung ohnehin, um Beträge korrekt zu beschriften (z. B. „davon 50 % Darlehen").

### 🟡 B6. Leistungen als Einkommen anderer Leistungen sind nicht modelliert

Der Orchestrator berechnet alle Module unabhängig auf demselben Ausgangseinkommen und wendet danach nur Ausschlüsse an. Das trägt nicht, wenn eine Leistung bei der Berechnung einer anderen als Einkommen zählt:

- Unterhaltsvorschuss wird beim Wohngeld angerechnet (im UVG-Modul selbst als offener Punkt vermerkt, im Orchestrator nicht adressiert)
- Kinderzuschlag beeinflusst das für Wohngeld maßgebliche Einkommen
- Kindergeld ist bei der Neuen Grundsicherung Einkommen, beim WBS ausdrücklich nicht

Das ist keine Vorrangregel, sondern eine **Berechnungsabhängigkeit** — und sie ist teils zirkulär (Wohngeld hängt von KiZ ab, KiZ-Vorrangentscheidung hängt von Wohngeld ab).

**Korrektur**: Als eigene Kategorie neben `PrecedenceRule` einführen, z. B. `EinkommensanrechnungsRule` (welche Leistung zählt bei welcher als Einkommen), und im Orchestrator einen definierten Auflösungsweg festlegen — pragmatisch: eine feste Berechnungsreihenfolge plus maximal eine Iteration, mit dokumentierter Konvergenzannahme. Ohne diese Entscheidung wird die Implementierung die Reihenfolge willkürlich wählen.

### ✅ B7. Kein Zeit-/Rechtsstandbezug

Alle Konstanten sind „2026". Gleichzeitig sollen Haushalte **dauerhaft gespeichert** werden (1 User : n Haushalte mit Prüfverlauf). Ein 2026 gespeichertes Ergebnis ist 2027 falsch, ohne dass es irgendwo markiert wäre. Es fehlt außerdem ein „Stichtag der Prüfung" — Elterngeld und BAföG brauchen Zeiträume, die Neue Grundsicherung braucht ein Bezugsbeginn-Datum für die Eigenheim-Schutzfrist.

**Korrektur**: `rechtsstandVersion: string` (z. B. `"2026-01"`) an jedem gespeicherten Prüfergebnis, plus UI-Hinweis „berechnet nach Rechtsstand X — neu berechnen". Konstanten entsprechend in versionierten Sets ablegen statt als lose Datei-Konstanten.

---

## C. Semantische Ambiguität — technisch lauffähig, für Nutzer irreführend

### ✅ C1. `eligible: 'nein'` kann drei völlig verschiedene Dinge bedeuten

Der Orchestrator setzt bei Ausschluss `voraussetzungenErfuellt = false`, was zu `'nein'` führt. Damit ist im Ergebnis nicht mehr unterscheidbar:

1. „Du erfüllst die Grundvoraussetzungen nicht" (z. B. zu jung, nicht erwerbsfähig)
2. „Du hättest Anspruch, aber eine vorrangige Leistung greift" (Wohngeld bei Bezug der Neuen Grundsicherung)
3. „Rechnerisch bleibt kein Betrag übrig" (Einkommen deckt den Bedarf)

Für den Nutzer sind das drei grundverschiedene Handlungsempfehlungen. Fall 2 heißt eigentlich: „Beantrage stattdessen X". Mit dem aktuellen Modell steht dort aber die generische `naechsteSchritte`-Beschreibung des ausgeschlossenen Systems — also eine Aufforderung, genau die Leistung zu beantragen, die gerade ausgeschlossen wurde.

**Korrektur**: Status erweitern, z. B. `eligible: 'ja' | 'nein' | 'vielleicht' | 'nachrangig'` plus `ausgeschlossenDurch?: SystemKey`. Und: `PrecedenceRule.effekt` muss einen Begründungstext mitliefern können — aktuell arbeitet `effekt` auf `ModuleCalculation`, die Begründungen entstehen aber erst später in `toResult()`, sodass die Ausschlussbegründung strukturell verloren geht.

### ✅ C2. Datenlücke und fachliche Unsicherheit teilen sich `'vielleicht'`

Das WBS-Modul liefert `'vielleicht'`, wenn für ein Bundesland **keine Daten hinterlegt** sind — dieselbe Ausgabe wie „du liegst im Grenzbereich". Der Nutzer kann nicht unterscheiden zwischen „knapp dran, lohnt sich zu prüfen" und „wir wissen es für deine Region schlicht nicht".

**Korrektur**: Eigener Status `nicht_pruefbar` mit Grund, oder ein `datenlage: 'vollstaendig' | 'unvollstaendig'`-Flag am Ergebnis. Betrifft perspektivisch auch Wohngeld (Mietstufen-Tabelle unvollständig) und alle Module mit TBD-Konstanten.

### ✅ C3. Erwerbsstatus-Booleans sind weder exklusiv noch vollständig

`isEmployed`, `isSelfEmployed`, `isStudent`, `isRetired`, `isUnemployed` sind fünf unabhängige Booleans. Ungeklärt:

- Werkstudent: `isStudent && isEmployed` — welche Regel gewinnt bei BAföG/Neuer Grundsicherung?
- Alle fünf `false`: Elternzeit, Hausarbeit, Krankheit, Kind unter 15 — ein völlig normaler Zustand, für den keine Semantik definiert ist
- `isRetired && isEmployed` (Rentner mit Minijob) — für die SGB-XII-Einkommensanrechnung relevant, da Rente voll, Erwerbseinkommen teilweise angerechnet wird

Die Module leiten daraus aber Kernentscheidungen ab.

**Korrektur**: Entweder erlaubte Kombinationen als Validierungsregel (Zod-Refinement) explizit festhalten, oder ein zusätzliches `erwerbsstatusPrimaer`-Enum als eindeutige Hauptzuordnung neben den Detail-Booleans.

### ✅ C4. `isAlleinErziehend` widerspricht `istPartnerDesHauptantragstellers`

`isAlleinErziehend` liegt auf `Haushaltsmitglied`, beschreibt aber eine Eigenschaft der Haushaltskonstellation. Ein Haushalt mit `istPartnerDesHauptantragstellers === true` und gleichzeitig `isAlleinErziehend === true` ist widersprüchlich, wird aber vom Modell zugelassen.

Zusätzlich verwendet das KiZ-Modul `mindesteinkommensgrenze(haushaltstyp)` — `haushaltstyp` ist **nirgends definiert**. Das UVG-Modul nutzt stattdessen `istAlleinErziehend(hauptantragsteller)`. Zwei Module, zwei Begriffe für dieselbe Unterscheidung.

**Korrektur**: `haushaltstyp: 'alleinstehend' | 'alleinerziehend' | 'paar' | 'paarMitKindern'` als computed-Feld auf `Haushalt` ableiten und überall verwenden; `isAlleinErziehend` auf Personenebene streichen.

### 🟡 C5. „Grob" liefert trotzdem einen Punktbetrag

`SPEC.md` 6.3 definiert grobe Vorabschätzung als „ohne exakten Betrag **oder mit grober Spanne**". Alle vier groben Module liefern aber `geschaetzterBetrag` als einzelne Zahl. Ein Nutzer, der „543 €" liest, hält das für belastbar — obwohl bei Wohngeld die zugrundeliegende Heuristik ausdrücklich als Platzhalter markiert ist.

**Korrektur**: Bei groben Modulen entweder eine Spanne (`betragVon`/`betragBis`) oder ein Genauigkeits-Flag am Ergebnis, das die UI zwingt, die Unschärfe sichtbar zu machen.

### ✅ C6. Regelbedarfsstufe lässt sich aus `regelsatz(person)` nicht bestimmen

Ob jemand Stufe 1 (alleinstehend, 563 €) oder Stufe 2 (Partner, 506 €) bekommt, hängt von der Haushaltskonstellation ab. Die Signatur `regelsatz(person)` hat diesen Kontext nicht. Bei Kindern kommt die Altersstaffelung (Stufen 4–6) dazu, die aus `geburtsdatum` ableitbar ist — die Erwachsenen-Unterscheidung aber nicht.

**Korrektur**: `regelsatz(person, haushalt)` und die Zuordnungsregel explizit dokumentieren.

---

## D. Prozess- und Architekturkonflikte

### ✅ D1. Wizard-Auswahl kollidiert mit dem Orchestrator-Bedarf

`SPEC.md` Abschnitt 5: In Schritt 2 wählt der Nutzer aus, welche Systeme geprüft werden; in Schritt 3 kommen die systemspezifischen Fragen **nur für die gewählten Systeme**.

Der Orchestrator braucht für die Vermeidungsprüfung aber die Ergebnisse **aller drei** beteiligten Systeme — und damit auch deren Zusatzfragen (z. B. `kannMindestens3StundenTaeglichArbeiten` für die Neue Grundsicherung). Wählt der Nutzer nur Wohngeld, fehlen diese Daten und die Vorrangprüfung kann nicht laufen. Der offene Punkt im Orchestrator („prüft intern trotzdem mit") ist mit dem Wizard-Flow so nicht umsetzbar.

**Korrektur** (Vorschlag): Die Auswahl in Schritt 2 steuert nur, **was angezeigt wird**, nicht was gerechnet wird. Alternativ: verbundene Systeme als Gruppe behandeln („Grundsicherung, Wohngeld und Kinderzuschlag hängen zusammen und werden gemeinsam geprüft") — das ist ehrlicher und erspart Nachfragen mitten im Ergebnis.

### ✅ D2. Reihenfolge innerhalb der `PRECEDENCE_RULES` ist undefiniert

Der Orchestrator iteriert linear über das Array. Als offener Punkt ist nur die Reihenfolge „§ 6a vor generischen Regeln" erfasst — nicht, was passiert, wenn Regel A ein System nullt, das Regel B als Gewinner voraussetzt. Das Ergebnis hinge dann von der Array-Reihenfolge ab, was für eine „deklarative" Regeltabelle das zentrale Versprechen bricht.

**Korrektur**: Entweder Regeln als azyklischen Graph auflösen (topologisch sortieren) oder explizit dokumentieren, dass die Reihenfolge signifikant ist und einen Test dagegen halten.

### ✅ D3. Keine Validierungs- und Plausibilitätsregeln

Zod ist im Stack gesetzt, aber nirgends steht, was gültige Eingaben sind: negative Einkommen, Miete über Einkommen (häufig legitim!), Geburtsdatum in der Zukunft, Kind älter als Elternteil, plausible Obergrenzen für Haushaltsgröße. Ohne definierte Grenzen rät jede Implementierung anders, und Grenzwerte tauchen erst als Bugs auf.

**Korrektur**: Ein eigener Abschnitt „Validierungsregeln" in `SPEC.md` mit harten Grenzen (Ablehnung) und weichen Warnungen (Rückfrage im Wizard).

### ✅ D4. DSGVO: Logging-Policy und anonymer Datenweg fehlen

Abschnitt 8 regelt Verschlüsselung at-rest sauber, lässt aber zwei praktisch relevantere Punkte offen:

- **Logging**: Einkommens-, Vermögens- und Mietdaten dürfen nicht in Application-Logs, Fehler-Stacktraces oder APM-Traces landen. Das ist der häufigste reale DSGVO-Verstoß in solchen Anwendungen und aktuell nirgends geregelt.
- **Anonyme Nutzung**: „Keine dauerhafte Speicherung ohne Einwilligung" — aber wo liegen die Daten während der Session? Läuft die Berechnung serverseitig (wovon die Architektur ausgeht), gehen vollständige Finanzdaten über die Leitung und liegen im Server-RAM. Ob es dafür eine Session-Persistenz gibt (Redis? Server-Session? nur Request/Response?) ist nicht spezifiziert — und genau das entscheidet, ob die Zusage „keine Speicherung" hält.

**Korrektur**: Beides als explizite Anforderungen in Abschnitt 8: Log-Redaction-Regel (Feldliste) und „anonyme Prüfung ist zustandslos: Request rein, Ergebnis raus, keine Persistenz".

---

## Priorisierungsvorschlag

**Vor jeder Implementierung zu klären** (verändern das Datenmodell oder die Kernlogik):
B1 (Einkommensbegriff), B2 (Kindergeld), B3 (Vermögen pro Person), B4 (personenbezogene Ergebnisse), A1 (§-6a-Vergleich), A2 (Brutto/Netto)

**Vor Implementierung des Orchestrators**:
B5 (`ModuleCalculation`-Passung), B6 (Leistung als Einkommen), C1 (Status „nachrangig"), A6/A7 (Trigger-Logik), D1 (Wizard-Konflikt)

**Vor dem ersten echten Nutzer**:
B7 (Rechtsstand-Versionierung), C2 (Datenlücke sichtbar machen), C5 (Unschärfe grober Module), D3 (Validierung), D4 (Logging/DSGVO)

**Beim Ausarbeiten des jeweiligen Moduls**:
A3, A4, A5, C3, C4, C6, D2
