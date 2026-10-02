# EligibilityCheck — Spec Sheet

Status: Draft v0.18
Zuletzt aktualisiert: 2026-09-09

Änderungen gegenüber v0.17: Werkzeugkette konkretisiert (Abschnitt 10) — Laufzeitversionen, Routing, State, Datenzugriff, Entwicklungsdatenbank, Geldarithmetik. Referenzdaten erreichen die Fachlogik über einen injizierten Port statt über Dateizugriff ([docs/architektur.md](docs/architektur.md) 8.3). Datenquellen-Seite als Pflichtbestandteil der UI festgelegt (5.2, ODbL-Namensnennung); Lizenzen geklärt — MIT für den Code, ODbL 1.0 für die abgeleiteten Datensätze ([data/LIZENZ.md](data/LIZENZ.md)). Neue Arbeitsdokumente: [PROJEKT.md](PROJEKT.md), [SESSIONS.md](SESSIONS.md), [README.md](README.md), [docs/konventionen.md](docs/konventionen.md).

Änderungen gegenüber v0.16: Die Unterhaltsvorschuss-Anrechnung beim Wohngeld ist ausdetailliert (§ 14 Abs. 2 Nr. 21 WoGG) — damit ist die Anrechnungstabelle des Orchestrators nicht mehr leer. Beim WBS Hamburg zeigt sich, dass die erfasste Struktur nicht der Norm entspricht: § 8 HmbWoFG arbeitet mit einer Grundgrenze plus Prozentbändern, nicht mit drei Betragstabellen.

Änderungen gegenüber v0.15: Elterngeld-Beträge gegen § 2 BEEG bestätigt. Beim Kinderzuschlag ein weiterer Fehler gefunden: Die Vermögensfreibeträge (55.000/70.000 €) waren die zum 01.07.2026 abgeschaffte Karenzzeit-Regelung; § 6a BKGG verweist auf § 12 SGB II und folgt der Reform automatisch.

Änderungen gegenüber v0.14: Drei blockierende Recherchen abgeschlossen — Mehrbedarfssätze § 21 SGB II, Regelaltersgrenzen-Staffelung § 235 SGB VI (der bisherige Fixwert 67 war für alle vor 1964 Geborenen falsch), und § 11 SGB II im Volltext: Es gibt keinen Kindergeld-Freibetrag, aber auch keine Vollanrechnung — Kindergeld zählt nur, soweit das Kind es für seinen Lebensunterhalt braucht.

Änderungen gegenüber v0.13: Vier weitere Erhebungs- und Scope-Entscheidungen — Unterhaltsvorschuss-Grundregel ab 12 mit Ausnahmehinweis, eigenes Feld für WBS-Sonderzahlungen, zwei getrennte Elterneinkommensfelder beim BAföG, Wohngeld-Abzüge aus dem Erwerbsstatus abgeleitet statt einzeln erfragt.

Änderungen gegenüber v0.12: Neun MVP- und Betriebsentscheidungen getroffen — Mehrbedarfe rechnen mit, Unterkunftskosten ohne Angemessenheitsprüfung, Selbstständige als `nicht_pruefbar` statt still falsch, Elterngeld nur für den Hauptantragsteller, Schüler-BAföG im MVP, WBS mit Landeswerten plus Großstadt-Hinweis, Betrieb als Privatperson, Fehler-Tracking mit strenger Redaction, Druckansicht statt PDF.

Änderungen gegenüber v0.11: Design System ergänzt ([docs/design-system.md](docs/design-system.md)) samt Tokens und Komponenten in [`apps/web/src/index.css`](apps/web/src/index.css), Tailwind v4 CSS-first. Barrierefreiheits-Zielniveau festgelegt: WCAG 2.1 AA verbindlich, alle Kontraste nachgerechnet.

Änderungen gegenüber v0.10: Systemarchitektur als eigenes Dokument ergänzt ([docs/architektur.md](docs/architektur.md)). Damit entschieden: Repo- und Ordnerstruktur, API-Schnitt, Field-Level-Encryption samt Schlüsselverwaltung, Aufbewahrungs- und Löschkonzept, Hosting, `User`-Schema-Details, Auth-Verfahren, Teststrategie, Rechtsstands-Pflegeprozess. Zwei Festlegungen aus v0.3 wurden dabei korrigiert: bcrypt → Argon2id und JWT im Speicher → httpOnly-Cookie mit Refresh-Rotation.

Änderungen gegenüber v0.9: Inselregel abgebildet (32 Gemeinden auf Mietstufe V). Damit sind die Referenzdaten des Wohngeld-Moduls vollständig — es ist implementierbar.

Änderungen gegenüber v0.8: Wohngeld-Referenzdaten vollständig. PLZ→Gemeinde→Mietstufe für alle 10.712 Gemeinden, 100 % Abdeckung, gegen neun bekannte Werte stichprobengeprüft. Damit ist das Wohngeld-Modul implementierbar — es fehlen nur noch die Inselregel und eine Stichprobe der unsichersten Matching-Stufe.

Änderungen gegenüber v0.7: Mietstufen-Datensatz beschafft, extrahiert und ins Repo aufgenommen (`data/`, 1.601 Gemeinden + 279 Kreise). Nachschlagereihenfolge inkl. Kreis-Fallback und Inselregel festgelegt. PLZ→Gemeinde-Quelle entschieden (OpenPLZ, gebündelt statt Laufzeit-API).

Änderungen gegenüber v0.6: Wohngeld-Restlücken geschlossen — Anlage 2 und 3 vollständig (1–12 Mitglieder), Rechenschritte und Rundung nach Anlage 3, Bagatellgrenze § 21, Lastenzuschuss bei Eigentum, Datenquellen benannt. Die Formel ist gegen eine veröffentlichte Beispielrechnung verifiziert. Neu erkannt: § 21 Nr. 3 WoGG kennt einen Vermögensausschluss, den das Modell bisher nicht abbildet.

Änderungen gegenüber v0.5: Fachrecherche durchgeführt. Wohngeld von `grob` auf `detailliert` hochgestuft (Anlagen 1–3 vollständig). Vier Sachfehler in Modul-Specs korrigiert: Wohngeld-Höchstbeträge, Heiz-/Klimakomponente, Schonvermögen SGB XII, KiZ-Anrechnungssatz Kindeseinkommen. BAföG-Bedarfssätze, Elterngeld-Ersatzratenformel und KiZ-Erwerbstätigenfreibeträge ergänzt. WBS auf vier Bundesländer festgelegt.

Änderungen gegenüber v0.4: Architektur- und UX-Entscheidungen aus der TBD-Liste getroffen — Grenzbereichs-Schwelle (6.3.1), Betragsspannen pro Modul (6.5.2), Statusdarstellung im Report (6.5.3), Betragsart statt Betrag (6.5.4), Sichtbarkeit nicht ausgewählter Gruppensysteme (5.1), Prüfzeitraum (8.3). Ergebnismodell entsprechend erweitert. Orchestrator auf v3 gezogen.

Änderungen gegenüber v0.3: Kernmodell überarbeitet (Einkommensbegriff, Vermögen pro Person, Kindergeld, Haushaltstyp, Erwerbsstatus), Ergebnismodell erweitert (Nachrangigkeit, Personenbezug, Datenlage, Unschärfe), Wizard-Logik geklärt, Validierungsregeln und Logging-Policy ergänzt. Grundlage: [docs/spec-review.md](docs/spec-review.md).

## 1. Zweck & Kontext

Full-Stack-Webanwendung (MERN + TypeScript), mit der Privatpersonen im Self-Service prüfen können, ob sie für bestimmte staatliche/finanzielle Hilfesysteme in Deutschland anspruchsberechtigt sind, und eine Einschätzung zur Höhe der Leistung erhalten.

Dieses Dokument definiert Features, Datenmodelle und Verhalten so präzise wie möglich, um spätere Ambiguität in der Umsetzung zu vermeiden. Alles was hier nicht explizit steht, gilt als offen/TBD und muss vor Umsetzung geklärt werden.

## 2. Zielgruppe

- Primäre Nutzer: Privatpersonen, die selbst (ohne Berater/Amt) prüfen wollen, ob sich ein Antrag lohnt.
- Keine Rolle für Sozialberater/Ämter im MVP (kein separates Beratermodul, keine Multi-Mandanten-Verwaltung).

## 3. Abgedeckte Hilfesysteme (MVP-Scope)

| # | System | Code-Key | Berechnungstiefe (MVP) | Leistungsart |
|---|---|---|---|---|
| 1 | Grundsicherung nach SGB XII | `grundsicherung` | grob | Bedarfsdeckung |
| 2 | Wohngeld | `wohngeld` | detailliert | Bedarfsdeckung |
| 3 | Kinderzuschlag (KiZ) | `kinderzuschlag` | detailliert | Bedarfsdeckung |
| 4 | Neue Grundsicherung (SGB II, vormals „Bürgergeld“) | `buergergeld` | grob | Bedarfsdeckung |
| 5 | BAföG | `bafoeg` | grob | Studierende: Bedarfsdeckung (50 % Darlehen) · Schüler: Vollzuschuss |
| 6 | Elterngeld | `elterngeld` | detailliert | Lohnersatz |
| 7 | Unterhaltsvorschuss | `unterhaltsvorschuss` | detailliert | Bedarfsdeckung (pro Kind) |
| 8 | Wohnberechtigungsschein (WBS) | `wbs` | detailliert | Berechtigung (kein Geldbetrag) |

Begründung der Tiefen-Aufteilung: Systeme mit komplexen Bedarfsberechnungen und vielen Ausnahmen (Grundsicherung, Neue Grundsicherung, BAföG) starten als grobe Vorabschätzung; Systeme mit klar strukturierten Formeln/Tabellen (Kinderzuschlag, Elterngeld, Unterhaltsvorschuss, WBS) werden direkt detailliert berechnet.

**Wohngeld war in v0.3–v0.5 als `grob` geplant und wurde in v0.6 hochgestuft.** Grund: Die Recherche hat Anlage 1 (Höchstbeträge), Anlage 2 (Koeffizienten a/b/c) und die Einkommensermittlung nach §§ 16/17 WoGG vollständig erschlossen. Damit ist die gesetzliche Formel des § 19 WoGG direkt implementierbar — sie ist nicht aufwendiger als die geplante Heuristik, aber exakt, und der dafür nötige `einkommensRichtwert` entfällt ersatzlos. Details: [wohngeld.md](docs/module-specs/wohngeld.md).

Die Spalte **Leistungsart** ist neu und steuert, welche Berechnungsstruktur ein Modul liefert (siehe 6.1) und wie die UI den Betrag beschriftet — eine Lohnersatzleistung hat keinen „Bedarf", der WBS überhaupt keinen Betrag.

Jedes System ist ein eigenständiges Prüfmodul mit eigener Sub-Spec unter `docs/module-specs/`.

**Namenskonvention**: Seit der Reform zum 01.07.2026 heißt das frühere Bürgergeld amtlich „Neue Grundsicherung". Die UI verwendet durchgängig diesen aktuellen Begriff. Der interne Code-Key bleibt aus historischen/technischen Gründen `buergergeld` (siehe Modul-Spec).

## 4. Out of Scope (MVP)

- **Keine Rechtsberatung/Garantie**: Die App liefert ausschließlich eine unverbindliche Einschätzung, keine rechtsverbindliche Aussage. Sie ersetzt keine Beratung durch Amt, Anwalt oder Sozialberatungsstelle. Ein entsprechender Disclaimer muss an jeder Ergebnisanzeige sichtbar sein.
- **Keine Antragstellung**: Die App füllt keine echten Antragsformulare aus und reicht nichts bei Ämtern ein. Sie zeigt lediglich an, welche nächsten Schritte/Unterlagen nötig wären (siehe 6.5).
- Kein Beratermodul / keine Mandantenverwaltung.
- Keine tatsächliche Mehrsprachigkeit im MVP (Oberfläche bleibt vorerst nur Deutsch) — die Codebasis wird aber von Anfang an mit i18n-Grundgerüst (z. B. i18next) aufgebaut, damit weitere Sprachen später ohne Restrukturierung ergänzt werden können.

## 5. Nutzerfluss (UX)

**Geführter Wizard**: Schritt-für-Schritt-Fragebogen statt eines großen Formulars oder Dashboards.

- Schritt 1: Basisdaten Haushalt (Personen, Einkommen, Wohnsituation) — einmalig erfasst, systemübergreifend genutzt.
- Schritt 2: Auswahl der Hilfesysteme, die den Nutzer **interessieren** (Mehrfachauswahl).
- Schritt 3: Systemspezifische Zusatzfragen.
- Schritt 4: Ergebnis-Report (siehe 6.5).

Navigation: zurück/weiter zwischen Schritten möglich, Eingaben bleiben während der Session erhalten.

### 5.1 Auswahl steuert die Anzeige, nicht die Berechnung

Die Auswahl in Schritt 2 bestimmt, **was im Report angezeigt wird** — nicht, was intern gerechnet wird. Grund: Mehrere Systeme stehen in einem Vorrangverhältnis zueinander (siehe [docs/orchestrator.md](docs/orchestrator.md)). Eine korrekte Wohngeld-Aussage ist ohne Kenntnis des Neue-Grundsicherung-Anspruchs nicht möglich. Würde nur das ausgewählte System gerechnet, wäre das Ergebnis systematisch falsch.

Daraus folgt für Schritt 3: Systemspezifische Fragen werden nicht nur für die ausgewählten Systeme gestellt, sondern für alle Systeme derselben **Systemgruppe**.

**Systemgruppen** (Systeme innerhalb einer Gruppe beeinflussen sich gegenseitig und werden immer gemeinsam berechnet):

| Gruppe | Systeme | Grund |
|---|---|---|
| Existenzsicherung & Wohnen | `grundsicherung`, `buergergeld`, `wohngeld`, `kinderzuschlag`, `unterhaltsvorschuss` | Vorrang-/Ausschlussverhältnisse und wechselseitige Einkommensanrechnung |
| Ausbildungsförderung | `bafoeg` | eigenständig |
| Familienleistung | `elterngeld` | eigenständig |
| Wohnberechtigung | `wbs` | eigenständig (eigene Einkommenslogik, keine Wechselwirkung) |

Wählt der Nutzer ein System aus einer Gruppe, werden die Zusatzfragen der gesamten Gruppe gestellt. Die UI erklärt das an dieser Stelle in einem Satz („Diese Leistungen hängen zusammen — wir prüfen sie gemeinsam, damit das Ergebnis stimmt"), und im Report können nicht ausgewählte Systeme der Gruppe als aufklappbarer Zusatz angezeigt werden.

#### Sichtbarkeit nicht ausgewählter Gruppensysteme (entschieden, v0.5)

Ergebnisse nicht ausgewählter Systeme derselben Gruppe werden **gestaffelt nach Ergebnis** angezeigt:

| Status des nicht ausgewählten Systems | Darstellung |
|---|---|
| `ja`, `vielleicht` | in der Hauptliste, mit Marker „Das hattest du nicht ausgewählt — könnte trotzdem passen" |
| `nein`, `nachrangig`, `nicht_pruefbar` | im eingeklappten Block „Auch geprüft" am Ende des Reports |

Begründung: Der Kernzweck der App ist, dass Nutzer Ansprüche finden, von denen sie nichts wussten — ein positives Ergebnis hinter einem Klick zu verstecken wäre ein Produktfehler. Umgekehrt hebt eine ungefilterte Liste aller fünf Systeme den geführten Charakter des Wizards auf. Die Staffelung löst beides: sichtbar wird nur, was für den Nutzer eine Handlung auslöst.

Der eingeklappte Block trägt eine Zusammenfassung in der Kopfzeile („Auch geprüft: Wohngeld, Unterhaltsvorschuss — kein Anspruch"), damit der Nutzer nicht klicken muss, um zu wissen, ob sich das Aufklappen lohnt.

### 5.2 Datenquellen-Seite (entschieden, v0.18)

Eine eigene Seite `/datenquellen`, aus dem Footer jeder Seite verlinkt. Sie nennt für jeden verwendeten Datensatz Herausgeber, Stand, Rechtsgrundlage und Lizenz, dazu den geltenden Rechtsstand der Berechnung.

Das ist **keine Kür, sondern Pflicht**: Die Postleitzahl- und Gemeindedaten stehen unter der ODbL 1.0, die eine Namensnennung dort verlangt, wo die Daten öffentlich genutzt werden — der Betrieb der Anwendung ist eine solche Nutzung. Der wörtliche Hinweistext steht in [data/LIZENZ.md](data/LIZENZ.md) 4.

Der zweite Zweck ist fachlich: Die Mietstufe ist die eine Zahl, bei der Nutzer am ehesten widersprechen werden („meine Stadt ist doch teurer"). Eine nachvollziehbare Quelle ist dort die einzige belastbare Antwort.

## 6. Fachliche Logik

### 6.1 Architekturprinzip

Jedes Hilfesystem wird als eigenes **code-basiertes TypeScript-Modul** abgebildet. Jedes Modul liegt in einer eigenen Datei (`packages/eligibility/src/rules/<system>.rules.ts`) mit eigenen Unit-Tests — framework-frei, ohne Express und ohne Mongoose ([docs/architektur.md](docs/architektur.md) 3.2).

Jedes Modul exportiert zwei Funktionen:

- `calculate(input): ModuleCalculation` — die reine Rechnung, ohne Kenntnis anderer Systeme
- `toResult(calc, kontext): EligibilityResult` — der fertige, für den Nutzer aufbereitete Report-Eintrag

```ts
type SystemKey =
  | 'grundsicherung' | 'wohngeld' | 'kinderzuschlag' | 'buergergeld'
  | 'bafoeg' | 'elterngeld' | 'unterhaltsvorschuss' | 'wbs';

interface EligibilityInput {
  haushalt: Haushalt;
  systemSpecificAnswers?: Record<string, unknown>;
}
```

**Konstanten** (Regelsätze, Freibeträge, Mietstufen etc.) werden nicht als lose Datei-Konstanten gepflegt, sondern in **versionierten Sets** nach Rechtsstand (siehe 6.4). Damit bleibt eine gespeicherte Prüfung reproduzierbar, auch wenn sich die Werte zum Jahreswechsel ändern.

**Cross-Modul-Regeln**: Module bleiben strikt pur — sie kennen nur `Haushalt` + eigene Antworten und rufen sich nicht gegenseitig auf. Vorrang, Ausschluss und die wechselseitige Anrechnung von Leistungen als Einkommen werden zentral in `packages/eligibility/src/orchestrator.ts` aufgelöst. Details und Pseudocode: [docs/orchestrator.md](docs/orchestrator.md).

### 6.2 Datenmodell — Kern-Entität `Haushalt`

```ts
interface Haushalt {
  id: string;
  erstelltAm: Date;

  pruefungsStichtag: Date;      // Zeitpunkt, auf den sich die Prüfung bezieht (i. d. R. heute)
  rechtsstandVersion: string;   // z. B. "2026-01" — welches Konstanten-Set gilt (siehe 6.4)

  mitglieder: Haushaltsmitglied[];

  wohnsituation: {
    plz: string;
    wohnort: string;
    bundesland: Bundesland;                  // ISO-Kürzel, z. B. 'BE' — für WBS und regionale Grenzwerte
    wohnverhaeltnis: 'miete' | 'eigentum';   // Mietzuschuss vs. Lastenzuschuss beim Wohngeld
    kaltmiete: number;                       // bei Eigentum: monatliche Belastung (Zins + Tilgung)
    nebenkosten: number;
    heizkosten: number;
    wohnflaeche: number;
  };

  // ---- computed, nicht vom Nutzer eingegeben ----
  anzahlPersonen: number;
  anzahlKinder: number;
  haushaltstyp: 'alleinstehend' | 'alleinerziehend' | 'paarOhneKinder' | 'paarMitKindern';
  warmmiete: number;                         // kaltmiete + nebenkosten + heizkosten
  vermoegenGesamt: number;                   // Summe über mitglieder[].vermoegen
  gesamtEinkommenBruttoMonatlich: number;
  gesamtEinkommenNettoMonatlich: number;
}

interface Haushaltsmitglied {
  id: string;
  geburtsdatum: Date;

  istHauptantragsteller: boolean;
  istPartnerDesHauptantragstellers: boolean;
  istKind: boolean;

  erwerbsstatusPrimaer: ErwerbsstatusPrimaer;   // eindeutige Hauptzuordnung, siehe 6.2.2
  isEmployed: boolean;
  isSelfEmployed: boolean;
  isStudent: boolean;
  isRetired: boolean;
  isUnemployed: boolean;
  hasDisability: boolean;

  einkommen: Einkommen;
  vermoegen: number;                            // personenbezogen, siehe 6.2.3

  unterhaltErhalten?: number;
  unterhaltGezahlt?: number;

  kindergeldWirdBezogen?: boolean;              // nur relevant wenn istKind === true
}
```

#### 6.2.1 Einkommen — ein Begriff reicht nicht

Verschiedene Hilfesysteme rechnen mit unterschiedlichen Einkommensbegriffen. Die Mindesteinkommensgrenze beim Kinderzuschlag ist eine **Brutto**-Grenze, die Freibetragsstaffelung der Neuen Grundsicherung bemisst sich am **Brutto**, die Bedarfsrechnung im SGB XII am **Netto**, der WBS an einem bereinigten **Jahres**-Brutto. Ein einzelnes Feld `einkommenNetto` führt zwangsläufig zu falschen Vergleichen, deshalb:

```ts
interface Einkommen {
  bruttoMonatlich: number;
  nettoMonatlich: number;

  // Aufschlüsselung nach Einkunftsart — nötig, weil die Anrechnungsregeln je Art abweichen
  arten: {
    erwerbstaetigkeit: number;   // brutto; nur hierauf gelten die § 11b-Erwerbstätigenfreibeträge
    rente: number;               // im SGB XII (4. Kapitel) voll anrechenbar, keine Freibeträge
    kapitalertraege: number;
    sonstige: number;            // z. B. Vermietung, Elterngeld, Krankengeld
  };
}
```

Regeln:

- `arten.*` sind **Bruttowerte** und summieren sich zu `bruttoMonatlich` (Validierung, siehe 10).
- Ein Modul, das eine Grenze prüft, muss den in seiner Sub-Spec **explizit benannten** Begriff verwenden. Jede Konstante in einer Modul-Spec trägt dazu die Angabe brutto/netto.
- Einkommensgrößen mit Zeitbezug, die nicht den aktuellen Zustand beschreiben — Elterngeld braucht den Netto-Durchschnitt der 12 Monate **vor der Geburt**, BAföG das Einkommen der **nicht im Haushalt lebenden** Eltern — bleiben in `systemSpecificAnswers` des jeweiligen Moduls. Nur der Ist-Zustand des Haushalts gehört ins Kernmodell.

#### 6.2.2 Erwerbsstatus — Primärzuordnung plus Detail-Flags

Die fünf Booleans sind weder gegenseitig ausschließend noch vollständig: Ein Werkstudent ist `isStudent && isEmployed`, eine Person in Elternzeit ist keines von beidem. Weil Module daraus Kernentscheidungen ableiten (Erwerbsfähigkeit nach § 8 SGB II, Studierendenstatus für BAföG), gibt es zusätzlich eine eindeutige Hauptzuordnung:

```ts
type ErwerbsstatusPrimaer =
  | 'angestellt' | 'selbststaendig' | 'arbeitslos'
  | 'schulisch' | 'ausbildung' | 'studium'
  | 'rente' | 'elternzeit' | 'hausarbeitOderPflege' | 'sonstiges';
```

- `erwerbsstatusPrimaer` ist **die** maßgebliche Zuordnung für Modul-Logik. Die Booleans beschreiben ergänzende Tatsachen (ein Rentner mit Minijob: `erwerbsstatusPrimaer = 'rente'`, `isEmployed = true`).
- Die Booleans dürfen der Primärzuordnung nicht widersprechen (Validierung, siehe 10).
- Der Wizard erhebt die Primärzuordnung als einzelne Auswahlfrage und leitet daraus Vorbelegungen für die Booleans ab.

#### 6.2.3 Vermögen ist personenbezogen

Die Vermögensfreibeträge der Neuen Grundsicherung sind **altersabhängig pro Person** (5.000 € bis 20.000 €), und BAföG prüft ausschließlich das Vermögen der studierenden Person. Ein reines Haushalts-Summenfeld kann beides nicht korrekt abbilden. Deshalb liegt `vermoegen` auf `Haushaltsmitglied`; `vermoegenGesamt` bleibt als computed-Feld für die Module, die nur die Summe brauchen.

#### 6.2.4 Haushaltstyp statt Personen-Flag

`isAlleinErziehend` lag in v0.3 auf der Person, beschreibt aber eine Eigenschaft der Konstellation — und ließ den widersprüchlichen Zustand „alleinerziehend **und** mit Partner im Haushalt" zu. Ersetzt durch das computed-Feld `haushaltstyp` auf `Haushalt`, abgeleitet aus der Zusammensetzung von `mitglieder`:

| Zusammensetzung | `haushaltstyp` |
|---|---|
| 1 Erwachsener, keine Kinder | `alleinstehend` |
| 1 Erwachsener, ≥ 1 Kind | `alleinerziehend` |
| 2 Erwachsene (Partner), keine Kinder | `paarOhneKinder` |
| 2 Erwachsene (Partner), ≥ 1 Kind | `paarMitKindern` |

Alle Module verwenden ausschließlich `haushaltstyp` (Kinderzuschlag-Mindesteinkommen, Unterhaltsvorschuss-Voraussetzung, Elterngeld-Bezugsdauer).

#### 6.2.5 Kindergeld

Kindergeld wird von drei Modulen gebraucht (Anrechnung bei der Neuen Grundsicherung, Voraussetzung beim Kinderzuschlag, Abzug beim Unterhaltsvorschuss), war aber in v0.3 in keinem Datenmodell enthalten. Der **Bezug** ist eine Tatsachenfrage pro Kind (`kindergeldWirdBezogen`), der **Betrag** eine systemweite Konstante im versionierten Konstanten-Set (`KINDERGELD_MONATLICH`), nicht eine pro Modul gepflegte Zahl.

### 6.3 Berechnungsergebnis eines Moduls

```ts
type Berechnungsart = 'bedarfsdeckung' | 'lohnersatz' | 'berechtigung';

interface ModuleCalculation {
  system: SystemKey;
  berechnungsart: Berechnungsart;

  voraussetzungenErfuellt: boolean;   // reine Ja/Nein-Prüfung, unabhängig vom Betrag
  betrag: number;                     // errechnete monatliche Leistung, 0 wenn keine

  // nur bei berechnungsart === 'bedarfsdeckung' gesetzt:
  bedarf?: number;
  anrechenbaresEinkommen?: number;
  bedarfsluecke?: number;             // bedarf - anrechenbaresEinkommen; Basis der Vorrangprüfung

  imGrenzbereich: boolean;            // Ergebnis knapp an der Berechtigungsgrenze (siehe 6.3.1)

  // nur bei betragsart 'zuschussUndDarlehen' (BAföG):
  betragAufteilung?: { zuschuss: number; darlehen: number };

  // vom Orchestrator gesetzt, nicht vom Modul (siehe docs/orchestrator.md 4.2 und 4.3):
  nachrangigDurch?: SystemKey[];      // vorrangige Leistung(en); mehrere beim § 6a-Vermeidungspaket
  nachrangigGrund?: 'ausschluss' | 'vermeidung';
  vorrangUnklar?: SystemKey[];        // Vorrangverhältnis nicht belastbar entscheidbar

  datenluecken: string[];             // benannte fehlende Grundlagen, z. B. "Mietstufe für PLZ unbekannt"
  betrifftPersonId?: string;
  teilbetraege?: Array<{ personId: string; betrag: number; hinweis?: string }>;
}
```

Die Aufteilung nach `berechnungsart` ist nötig, weil nicht jedes System bedarfsorientiert rechnet: **Elterngeld** ist eine Lohnersatzleistung ohne „Bedarf", der **WBS** liefert überhaupt keinen Betrag, sondern eine Berechtigung. Ein einheitliches Bedarf/Einkommen/Anspruch-Schema würde für diese Module Pflichtfelder ohne Bedeutung erzwingen.

#### 6.3.1 Grenzbereich und `SCHWELLENWERT_VIELLEICHT`

Die letzten vier Felder schreibt ausschließlich der Orchestrator; ein Modul darf sie nie setzen. `toResult()` reicht sie unverändert an `EligibilityResult` durch (6.5) — dort tragen `nachrangigDurch` und `ausgeschlossenDurch` denselben Inhalt unter dem für den Report sprechenderen Namen.

`imGrenzbereich` bedeutet: Der Haushalt verfehlt die Berechtigung so knapp, dass die Ungenauigkeit unserer Eingangsdaten das Ergebnis kippen könnte — der Status im Report wird dann `'vielleicht'` statt `'nein'`.

Das Feld sitzt bewusst auf `ModuleCalculation` und nicht erst auf `EligibilityResult`: Der Orchestrator braucht die Information **vor** `toResult()`, um zu erkennen, dass eine Vorrangentscheidung auf unsicherer Grundlage stünde (siehe [docs/orchestrator.md](docs/orchestrator.md) 4.3).

**Default im versionierten Konstanten-Set:**

```ts
const SCHWELLENWERT_VIELLEICHT = {
  absolutEuro: 50,          // absolute Untergrenze
  relativZumBedarf: 0.05,   // 5 % der Bezugsgröße
};
```

Ein bedarfsorientiertes Modul setzt `imGrenzbereich = true`, wenn der Abstand zur Berechtigungsgrenze kleiner ist als `max(absolutEuro, relativZumBedarf × bedarf)`.

**Pro Modul überschreibbar** — nötig, weil nicht jedes Modul einen `bedarf` als Bezugsgröße hat:

| Modul | Bezugsgröße für den Grenzbereich |
|---|---|
| `grundsicherung`, `buergergeld`, `wohngeld`, `kinderzuschlag` | `bedarf` |
| `bafoeg` | Bedarfssatz der Ausbildungsstätte |
| `wbs` | Abstand zur Einkommensgrenze des Bundeslandes |
| `elterngeld` | **kein Grenzbereich** — die Formel ist exakt, `imGrenzbereich` bleibt immer `false` |
| `unterhaltsvorschuss` | **kein Grenzbereich** — reine Tatbestandsprüfung ohne Schwellenrechnung |

Ein einheitlicher Wert ohne Override wäre für Elterngeld und WBS bedeutungslos; rein modulweise definierte Werte wären ohne Not inkonsistent. Deshalb: gemeinsamer Default, benannte Ausnahmen.

**Zweite Quelle für `'vielleicht'`**: Bei groben Modulen kann die Betragsspanne die Null einschließen (siehe 6.5.2) — auch das führt zu `'vielleicht'`, unabhängig von dieser Schwelle. Das ist abgeleitet und keine eigene Konstante.

### 6.4 Rechtsstand und Versionierung

Alle Konstanten (Regelsätze, Freibeträge, Grenzwerte) ändern sich mindestens jährlich. Da Haushalte und Prüfergebnisse dauerhaft gespeichert werden (siehe 7), muss nachvollziehbar bleiben, mit welchen Werten gerechnet wurde:

- Konstanten liegen in versionierten Sets: `packages/eligibility/src/constants/2026-01.ts` etc., adressiert über `rechtsstandVersion`.
- Jedes gespeicherte `EligibilityResult` trägt die verwendete `rechtsstandVersion`.
- Beim Öffnen eines gespeicherten Ergebnisses, dessen Rechtsstand nicht mehr der aktuelle ist, zeigt die UI einen Hinweis und bietet eine Neuberechnung an.
- Angekündigte Rechtsänderungen mit bekanntem Termin (z. B. Absenkung der Unterhaltsvorschuss-Altersgrenze 2027) werden als neues Konstanten-Set vorbereitet, nicht als Änderung am bestehenden.

### 6.5 Ergebnis-Report (Output)

```ts
type EligibilityStatus =
  | 'ja'             // Anspruch wahrscheinlich
  | 'nein'           // Voraussetzungen nicht erfüllt oder rechnerisch kein Betrag
  | 'vielleicht'     // Grenzbereich — Prüfung lohnt sich
  | 'nachrangig'     // Anspruch bestünde, aber eine vorrangige Leistung greift
  | 'nicht_pruefbar' // uns fehlen die Daten/Grundlagen für eine Aussage

interface EligibilityResult {
  system: SystemKey;
  eligible: EligibilityStatus;

  ausgeschlossenDurch?: SystemKey[];              // gesetzt bei eligible === 'nachrangig'
  nachrangigGrund?: 'ausschluss' | 'vermeidung';  // steuert den Report-Text (siehe 6.5.3)
  vorrangUnklar?: SystemKey[];                    // Vorrangentscheidung nicht belastbar (Orchestrator 4.3)

  geschaetzterBetrag?: number;
  betragSpanne?: { von: number; bis: number };   // bei groben Modulen statt Punktwert
  betragAufteilung?: { zuschuss: number; darlehen: number };  // nur bei betragsart 'zuschussUndDarlehen'
  betragsart: 'zuschuss' | 'zuschussUndDarlehen' | 'keineGeldleistung';
  genauigkeit: 'grob' | 'detailliert';

  betrifftPersonId?: string;                      // bei personenbezogenen Leistungen
  teilbetraege?: Array<{ personId: string; betrag: number; hinweis?: string }>;

  datenlage: 'vollstaendig' | 'unvollstaendig';
  datenluecken?: string[];

  begruendung: {
    erfuellteKriterien: string[];
    nichtErfuellteKriterien: string[];
  };

  naechsteSchritte: {
    beschreibung: string;
    benoetigteUnterlagen: string[];
    zustaendigeStelle: string;
  };

  rechtsstandVersion: string;
}
```

#### 6.5.1 Warum fünf Status statt drei

In v0.3 bedeutete `'nein'` drei völlig verschiedene Dinge: Voraussetzungen nicht erfüllt, rechnerisch kein Betrag, oder durch eine vorrangige Leistung ausgeschlossen. Für den Nutzer sind das grundverschiedene Handlungsempfehlungen — im dritten Fall lautet die richtige Antwort „beantrage stattdessen X", nicht „du hast keinen Anspruch". Ohne eigenen Status hätte der Report an dieser Stelle die generische Antragsanleitung für genau die Leistung angezeigt, die gerade ausgeschlossen wurde.

`'nicht_pruefbar'` trennt fehlende Daten auf unserer Seite von fachlicher Unsicherheit. Ein WBS-Ergebnis „vielleicht" hieß in v0.3 sowohl „du liegst im Grenzbereich" als auch „für dein Bundesland haben wir keine Werte hinterlegt".

#### 6.5.2 Unschärfe grober Module sichtbar machen

Module mit `genauigkeit: 'grob'` geben **keinen** Punktbetrag aus, sondern `betragSpanne`. Ein Nutzer, der „543 €" liest, hält das für belastbar — auch dann, wenn die zugrundeliegende Heuristik in der Sub-Spec ausdrücklich als Platzhalter markiert ist. Die UI stellt Spannen sichtbar anders dar als exakte Beträge.

**Breite der Spanne (entschieden, v0.5): pro Modul, nicht global.** Ein einheitlicher Prozentsatz würde entweder die Wohngeld-Heuristik zu präzise oder die Grundsicherungs-Rechnung zu unpräzise darstellen — die Unschärfequellen sind fachlich verschieden. Wohngeld nähert im MVP eine Tabellenformel ohne die Tabelle an; bei Grundsicherung und Neuer Grundsicherung ist die Bedarfsrechnung weitgehend exakt und die einzige echte Unbekannte die Angemessenheitsgrenze der Unterkunftskosten.

Im versionierten Konstanten-Set pro Modul:

```ts
interface Unschaerfe { relativ: number; absolutMin: number; }
```

| Modul | `relativ` | `absolutMin` | Hauptquelle der Unschärfe |
|---|---|---|---|
| `grundsicherung` | 0,15 | 30 € | Angemessenheitsgrenze KdU (regional) |
| `buergergeld` | 0,15 | 30 € | Angemessenheitsgrenze KdU, Erwerbstätigenfreibeträge |
| `bafoeg` | 0,20 | 30 € | Bedarfssatz-Varianten, Elterneinkommens-Bereinigung |

Module mit `genauigkeit: 'detailliert'` (Wohngeld, Kinderzuschlag, Elterngeld, Unterhaltsvorschuss) geben einen Punktbetrag aus und haben keine `Unschaerfe`. Der WBS hat überhaupt keinen Betrag (siehe 6.5.4).

> **Kalibrierung ausstehend**: Die Werte sind begründete Startwerte, keine gemessenen Fehlerbandbreiten. Sie sind nach Implementierung der Module gegen echte Vergleichsrechnungen (amtliche Rechner, Beispielfälle) zu kalibrieren. Weil sie im versionierten Konstanten-Set liegen, ist das eine Wertänderung und kein Code-Eingriff.

**Berechnung der Spanne:**

```ts
const delta = Math.max(u.absolutMin, betrag * u.relativ);
const von   = Math.max(0, abrundenAuf10(betrag - delta));
const bis   = Math.min(gesetzlicheObergrenze ?? Infinity, aufrundenAuf10(betrag + delta));
```

Drei verbindliche Regeln dazu:

1. **Rundung auf 10-€-Schritte**, Untergrenze ab-, Obergrenze aufgerundet. „etwa 380–560 €" liest sich sichtbar als Schätzung, „383–557 €" täuscht eine Genauigkeit vor, die die Spanne gerade dementiert.
2. **Kappung an der gesetzlichen Obergrenze**, wo es eine gibt (Wohngeld-Höchstbetrag). Eine Spanne, die rechnerisch über den maximal möglichen Betrag hinausreicht, verspricht Unmögliches.
3. **Erreicht `von` die Null, ist der Status `'vielleicht'`, nicht `'ja'`.** Eine Spanne „0–240 €" als Anspruch zu bezeichnen wäre irreführend — sie schließt „kein Anspruch" ein.

#### 6.5.3 Statusdarstellung im Report

Jeder der fünf Status hat eine feste Kernaussage **und** einen festen Handlungsempfehlungs-Slot. Ohne diese Zuordnung entsteht genau der Fehler, der zur Einführung der fünf Status geführt hat (6.5.1): eine Antragsanleitung unter einem Ergebnis, das gar keinen eigenen Antragsweg hat.

| Status | Kernaussage | Handlungsempfehlung | Farbrolle |
|---|---|---|---|
| `ja` | Anspruch wahrscheinlich | Antrag stellen: Unterlagen + zuständige Stelle | Erfolg (grün) |
| `vielleicht` | Grenzbereich — Prüfung lohnt sich | Antrag trotzdem stellen, alternativ Beratungsstelle | Achtung (amber) |
| `nein` | Voraussetzungen nicht erfüllt | das nicht erfüllte Kriterium benennen, sonst nichts | neutral |
| `nachrangig` | Anspruch bestünde, aber X greift vorrangig | Verweis auf X — **kein** eigener Antragsweg | neutral |
| `nicht_pruefbar` | wir können das hier nicht beurteilen | was fehlt (Klartext) + wo man es klären kann | Info (blau) |

Verbindlich für die Umsetzung:

- **Nie Farbe allein.** Jeder Status trägt Icon *und* Textlabel. Die Zielgruppe nutzt die App unter finanziellem Druck und teils auf schlechten Displays; Farbcodierung allein ist weder barrierefrei noch belastbar.
- `nein` ist **nicht** rot. Rot signalisiert Fehler — hier liegt aber kein Fehler vor, sondern ein Prüfergebnis.
- `nicht_pruefbar` wird nie als Versäumnis des Nutzers formuliert („uns fehlen für dein Bundesland die Werte", nicht „deine Angaben reichen nicht"). Die Einträge aus `datenluecken` erscheinen in Klartext, nicht als technische Bezeichner.
- `nicht_pruefbar` trägt **nie** einen Betrag oder eine Spanne. Ein Betrag neben „nicht prüfbar" ist ein Widerspruch, den der Nutzer zugunsten des Betrags auflöst.
- Bei `nachrangig` unterscheidet der Text nach `nachrangigGrund`:
  - `'ausschluss'` — „Weil die Unterkunftskosten bereits in der Neuen Grundsicherung enthalten sind, gibt es daneben kein Wohngeld." Der Text kommt aus `begruendungFuerNutzer` der Vorrangregel.
  - `'vermeidung'` — „Kinderzuschlag und Wohngeld decken deinen Bedarf zusammen ab. Deshalb brauchst du keine Neue Grundsicherung." Das ist für den Nutzer eine **gute** Nachricht und darf nicht wie eine Ablehnung aussehen.

  Ein Betragsvergleich („mit X bekämst du mehr") wird bewusst **nicht** angezeigt: Er suggeriert eine Wahlmöglichkeit, die es rechtlich nicht gibt, und die Beträge sind nicht vergleichbar (ein Leistungspaket gegen eine Bedarfslücke).
- Bei gesetztem `vorrangUnklar` erscheint zusätzlich ein Hinweis: „Diese Leistungen schließen sich gegenseitig aus. Nach unserer Schätzung liegst du bei beiden im Grenzbereich — das lässt sich hier nicht sicher entscheiden."

#### 6.5.4 `betragsart` steuert die Darstellung, nicht `geschaetzterBetrag`

Die Ergebniskarte liest **immer zuerst** `betragsart` und erst danach einen Betrag. Ohne diese Regel rendert die UI beim WBS „0 €" — fachlich falsch und für den Nutzer die genaue Umkehrung der Aussage.

| `betragsart` | Anzeige an der Betragsstelle |
|---|---|
| `zuschuss` | Betrag bzw. Spanne, monatlich |
| `zuschussUndDarlehen` | Gesamtbetrag + Aufteilung aus `betragAufteilung` („ca. 480 € — davon 240 € Zuschuss und 240 € zinsloses Darlehen") |
| `keineGeldleistung` | **kein Betrag**, stattdessen der Berechtigungsumfang |

**Berechtigungsumfang statt Betrag (WBS)**: Der handlungsrelevante Gegenwert zum Geldbetrag ist, *wonach* der Nutzer suchen kann. Die Karte zeigt deshalb die berechtigte Wohnungsgröße nach Haushaltsgröße (Quadratmeter bzw. Zimmerzahl) und — sobald die Modul-Spec das abbildet — den WBS-Typ. Kann das Modul das für das Bundesland nicht bestimmen, ist der Status `nicht_pruefbar`, nicht `ja` ohne Angabe.

`betragAufteilung` ist bei BAföG Pflicht: `betragsart: 'zuschussUndDarlehen'` benannte den Sachverhalt bisher, ohne dass ein Feld die Aufteilung getragen hätte. Die Hälfte der Leistung ist rückzahlbar — das ist für die Entscheidung des Nutzers wesentlich und darf nicht nur im Fließtext stehen.

#### 6.5.5 Fester Bestandteil jeder Ergebnisanzeige

Der Disclaimer aus Abschnitt 4 (keine Rechtsberatung, keine Garantie) ist Pflichtbestandteil jeder Ergebnisdarstellung, nicht nur der Gesamtseite.

## 7. Accounts

**Optionaler Account**: Die App ist ohne Login nutzbar (Eingaben nur für die Dauer der Session, siehe 9.2). Mit Login können Prüfungen gespeichert und später wieder aufgerufen werden.

- Auth-Verfahren: E-Mail + Passwort (**Argon2id**) als Basis, zusätzlich OAuth (Google). Sessions über kurzlebiges Access-Token im `httpOnly`-Cookie plus rotierendes Refresh-Token — **kein Token im `localStorage`**. Vollständig ausdetailliert in [docs/architektur.md](docs/architektur.md) Abschnitt 9.
- Datenmodell: **1 User : n Haushalte** — ein Account kann mehrere `Haushalt`-Objekte speichern (z. B. um Szenarien zu vergleichen), jeweils mit eigenem Verlauf an Prüfungen.

```ts
interface User {
  id: string;
  email: string;
  passwordHash?: string;      // optional, falls nur OAuth genutzt wird
  oauthProvider?: 'google';
  oauthId?: string;
  erstelltAm: Date;
  haushaltIds: string[];
}
```

Das vollständige `User`-Schema samt E-Mail-Verifizierung, Passwort-Reset und den OAuth-Fehlerfällen steht in [docs/architektur.md](docs/architektur.md) 9.1.

## 8. Validierungsregeln

Zod-Schemata werden front- und backendseitig geteilt. Unterschieden wird zwischen **harten Regeln** (Eingabe wird abgelehnt) und **Plausibilitätswarnungen** (Rückfrage im Wizard, Eingabe bleibt möglich — viele auffällige Konstellationen sind real und gerade der Anlass für die Prüfung).

### 8.1 Harte Regeln

| Feld/Bezug | Regel |
|---|---|
| alle Geldbeträge | ≥ 0, maximal 2 Nachkommastellen |
| `geburtsdatum` | nicht in der Zukunft, nicht vor 1900 |
| `einkommen.arten.*` | Summe == `einkommen.bruttoMonatlich` (Toleranz 1 €) |
| `einkommen` | `nettoMonatlich` ≤ `bruttoMonatlich` |
| `mitglieder` | genau ein Mitglied mit `istHauptantragsteller === true` |
| `mitglieder` | höchstens ein Mitglied mit `istPartnerDesHauptantragstellers === true` |
| Rollen-Flags | `istHauptantragsteller`, `istPartnerDesHauptantragstellers`, `istKind` schließen sich gegenseitig aus |
| `erwerbsstatusPrimaer` | darf den Detail-Flags nicht widersprechen (z. B. `'rente'` + `isRetired === false`) |
| `wohnflaeche` | > 0 |
| `plz` | 5 Ziffern, existierend (Prüfung gegen PLZ-Datensatz) |
| `rechtsstandVersion` | muss ein vorhandenes Konstanten-Set benennen |

### 8.2 Plausibilitätswarnungen

| Konstellation | Warnung |
|---|---|
| Warmmiete > Nettoeinkommen des Haushalts | plausibel und häufig — nur Rückfrage „stimmt das so?" |
| Kind älter als ein Elternteil | Rückfrage, ob die Rollen korrekt zugeordnet sind |
| Mitglied mit `istKind === true` und Alter ≥ 25 | Rückfrage (für mehrere Module ist 25 eine Grenze) |
| Haushalt > 10 Personen | Rückfrage; mehrere Konstanten-Tabellen sind darüber nicht definiert |
| Einkommen == 0 bei allen Mitgliedern | Rückfrage, ob wirklich kein Einkommen vorliegt |
| `wohnflaeche` < 10 m² oder > 300 m² | Rückfrage |

### 8.3 Prüfzeitraum (entschieden, v0.5)

Maßgeblich ist der `pruefungsStichtag`. Der Haushalt gilt für den **gesamten Kalendermonat des Stichtags als konstant** — Zusammensetzung, Einkommen und Wohnkosten werden als Monatswerte genommen, angebrochene Zeiträume (Zuzug, Auszug, Jobwechsel oder Geburt mitten im Monat) werden im MVP nicht anteilig gerechnet.

Begründung: Eine anteilige Rechnung bräuchte Ein- und Austrittsdaten pro Person und pro Einkommensart und würde das Datenmodell und den Wizard erheblich aufblähen — für eine Vorabschätzung, deren Ergebnis ohnehin als Spanne ausgegeben wird. Die Ämter rechnen ihrerseits monatsweise.

Sichtbar gemacht wird die Annahme an zwei Stellen: ein Satz in der Ergebnisanzeige („Gerechnet für [Monat], mit deinen Angaben als Monatswerten") und eine Plausibilitätswarnung, wenn der Stichtag nicht im laufenden Monat liegt.

## 9. Nicht-funktionale Anforderungen

### 9.1 Datenschutz (DSGVO) — Speicherung

- Keine dauerhafte Speicherung von Haushaltsdaten ohne explizite Einwilligung.
- **Field-Level Encryption**: sensible Felder werden verschlüsselt in MongoDB abgelegt, nicht nur transportverschlüsselt. Betrifft mindestens: `einkommen` (vollständig), `vermoegen`, `unterhaltErhalten`, `unterhaltGezahlt` sowie `kaltmiete`/`nebenkosten`/`heizkosten`. Umsetzung als eigenes Mongoose-Plugin mit AES-256-GCM aus `node:crypto`, Schlüssel als Secret beim Hoster, Schlüsselversion im Speicherformat für Rotation ohne Migration. Begründung der Wahl und die Krypto-Fallstricke: [docs/architektur.md](docs/architektur.md) 10.2 und 10.3.
- Möglichst datensparsame Erhebung — nur Felder, die für die gewählte Systemgruppe nötig sind.
- Klare Datenschutzerklärung, Löschfunktion für gespeicherte Haushalte und für den gesamten Account.
- Aufbewahrungsfristen und Löschkonzept: festgelegt in [docs/architektur.md](docs/architektur.md) 10.4 — gespeicherte Haushalte längstens 24 Monate ohne Anmeldung, mit Ankündigung 30 Tage vorher; Logs 14 Tage; Backups 30 Tage. Die verzögerte Wirkung von Löschungen in Backups gehört so in die Datenschutzerklärung.
- Auftragsverarbeitungsverträge nach Art. 28 DSGVO mit Hoster, Datenbank, E-Mail-Versand und Fehler-Tracking sind Voraussetzung des Livegangs, keine Formalie ([docs/architektur.md](docs/architektur.md) 10.5).

### 9.2 Datenschutz — anonyme Nutzung ist zustandslos

Die Zusage „ohne Login wird nichts gespeichert" muss technisch eingelöst werden, nicht nur behauptet. Für die anonyme Prüfung gilt:

- Die Berechnung läuft als **zustandsloser Request**: Haushaltsdaten rein, Ergebnis raus. Keine Server-Session, kein Redis, keine Zwischenspeicherung in der Datenbank.
- Der Wizard-Zustand zwischen den Schritten liegt **im Client** (React-State, optional `sessionStorage`), nicht auf dem Server.
- Keine Persistenz auf dem Server, solange keine Einwilligung vorliegt — der Übergang „anonym → gespeichert" passiert ausschließlich durch eine bewusste Nutzeraktion.

### 9.3 Datenschutz — Logging

Einkommens-, Vermögens- und Mietdaten dürfen **nicht** in Application-Logs, Stacktraces, Fehler-Reports oder APM-Traces landen. Das ist der häufigste reale DSGVO-Verstoß in Anwendungen dieser Art.

- Zentrale Redaction-Regel im Logger für die Feldliste aus 9.1.
- Request-Bodies werden grundsätzlich nicht geloggt.
- Fehlerobjekte werden vor dem Weiterreichen an einen externen Dienst (Sentry o. Ä.) bereinigt.
- Es wird geloggt: welches Modul mit welchem Ergebnis-Status lief, Rechtsstand, Dauer — nicht die Eingabewerte.

## 10. Technischer Stack (bestätigt)

Vorgabe: MERN + TypeScript.

| Bereich | Wahl |
|---|---|
| Laufzeit | Node 22 LTS, ESM durchgängig in allen Paketen |
| Frontend | React + TypeScript (Vite) |
| Routing | React Router v7 |
| State Management | Zustand für Wizard-Fortschritt und Sitzung; lokaler `useState` für alles, was eine Komponente allein betrifft |
| Styling | Tailwind CSS v4, CSS-first (kein `tailwind.config.js`) — Tokens und Komponenten in [`apps/web/src/index.css`](apps/web/src/index.css), Regeln in [docs/design-system.md](docs/design-system.md) |
| Formulare/Validierung | React Hook Form + Zod (Schemata front-/backendseitig geteilt, siehe Abschnitt 8) |
| i18n | i18next (+ react-i18next), Sprachdateien von Anfang an ausgelagert, initial nur `de` |
| Backend | Node.js 22 LTS + Express 5 + TypeScript (ESM); `tsx` in der Entwicklung, `tsc` für den Build |
| Datenbank | MongoDB + Mongoose, sensible Felder field-level-verschlüsselt (siehe 9.1) |
| Auth | E-Mail/Passwort (Argon2id) + OAuth (Google); Access-Token als JWT im `httpOnly`-Cookie, rotierendes Refresh-Token in MongoDB |
| Testing | Vitest für alle Pakete, React Testing Library fürs Frontend |
| Hosting Frontend | Netlify oder Vercel (statisches Build, keine personenbezogenen Daten) |
| Hosting Backend | **Render, Region Frankfurt** — EU-Rechenzentrum, AVV verfügbar, verwaltete Cronjobs |
| Datenbank-Hosting | **MongoDB Atlas, `eu-central-1` (Frankfurt)** — mindestens ein Tarif mit Backups und IP-Zugriffsliste |
| Repo-Struktur | Monorepo mit npm workspaces: `apps/web`, `apps/api`, `packages/shared`, `packages/eligibility` |
| Datenzugriff im Client | eigener typisierter `api-client.ts` über die geteilten Zod-Verträge, kein TanStack Query — es gibt genau eine cachefähige Ressource |
| Geldarithmetik | ganzzahlige Cent in Speicherung, Transport und Summen; `decimal.js` nur innerhalb der Rule-Module, wo eine Norm Dezimal-Arithmetik vorschreibt (Anlage 3 WoGG) — Regeln in [docs/konventionen.md](docs/konventionen.md) 4 |
| Entwicklungsdatenbank | zweiter Atlas-Cluster (Free, `eu-central-1`), kein lokales MongoDB |
| Qualität & CI | TypeScript `strict`, ESLint (inkl. Reinheitsregel für `packages/eligibility`), Prettier, GitHub Actions; keine Commit-Hooks |
| Versionsverwaltung | GitHub öffentlich, `main` geschützt, kurzlebige Feature-Branches, PR mit grüner CI als Gate |
| Referenzdaten | im Repo unter `data/`, gebündelt statt zur Laufzeit abgefragt; reproduzierbar über die Skripte in `data/scripts/` (siehe [data/README.md](data/README.md)). Die Fachlogik erhält sie über einen injizierten `ReferenzdatenPort` ([docs/architektur.md](docs/architektur.md) 8.3) |

## 11. Offene Punkte (TBD-Liste)

Erledigt in v0.3: Berechnungstiefe je System, Auth-Verfahren, User-Datenmodell, Tech-Stack, Hosting, i18n-Grundsatz, alle 8 Modul-Sub-Specs.
Erledigt in v0.4: Einkommensbegriff, Kindergeld im Modell, Vermögen pro Person, Haushaltstyp, Erwerbsstatus, personenbezogene Ergebnisse, Nachrangigkeits-Status, Datenlage, Rechtsstand-Versionierung, Wizard-Systemgruppen, Validierungsregeln, Logging- und Session-Policy.
Erledigt in v0.5: **alle Architektur- und Produkt/UX-Punkte** — siehe die abgehakten Einträge unten.

### Fachlich (pro Modul, siehe jeweilige Sub-Spec)

**Erledigt in v0.6** (Recherche 2026-09-07):

- [x] Wohngeld: Anlage 1 (Höchstbeträge I–VII × 1–6 Personen plus Mehrbetrag), Anlage 2 (Koeffizienten, in v0.7 auf 1–12 vervollständigt), Einkommensermittlung §§ 16/17 WoGG — Modul auf `detailliert` hochgestuft
- [x] BAföG: `BEDARFSSATZ_BEI_ELTERN` = 671 € / 534 €, KV/PV-Zuschlag als separater, bedingter Bestandteil
- [x] Elterngeld: Ersatzratenformel § 2 Abs. 2 BEEG vollständig (Geringverdienerkomponente und Abschmelzung)
- [x] Kinderzuschlag: Erwerbstätigenfreibeträge § 11b SGB II; Höchsteinkommensgrenze als abgeleitete Größe geklärt
- [x] Schonvermögen SGB XII verifiziert und korrigiert (10.000 € je leistungsberechtigter Person + 500 € je unterhaltener Person)
- [x] WBS: Einkommensgrenzen für Berlin, NRW, Bayern und Hamburg; übrige zwölf Länder bewusst `nicht_pruefbar`

**Dabei gefundene Sachfehler in v0.5** — alle korrigiert, jeweils in der Modul-Spec dokumentiert:

| Modul | Fehler in v0.5 | Korrektur |
|---|---|---|
| Wohngeld | Höchstbeträge (404 € für MS I / 1 Person) | 361 € — die alte Tabelle war ein Vor-2025-Stand |
| Wohngeld | Heiz-/Klimakomponente als €/m² | pauschal nach Haushaltsgröße (§ 12 Abs. 6/7 WoGG) |
| Grundsicherung | Schonvermögen 10.000 € × Personenzahl | 10.000 € nur je leistungsberechtigter Volljähriger, + 500 € je unterhaltener Person |
| Kinderzuschlag | Kindeseinkommen zu 100 % angerechnet | 45 % (§ 6a Abs. 3 BKGG); 100 % war die Rechtslage vor 2020 |

**Offen:**

- [x] Wohngeld: Anlage 2 (1–12 plus § 19 Abs. 3 für größere Haushalte), Anlage 3 (Mindestwerte, Rechenschritte, Rundung), Lastenzuschuss bei Eigentum, Bagatellgrenze § 21 — **erledigt in v0.7**; Formel gegen ein veröffentlichtes Beispiel verifiziert
- [x] Wohngeld: **Mietstufen maschinenlesbar** — erledigt in v0.8, siehe [`data/README.md`](data/README.md)
- [x] Wohngeld: **Nachschlagetabelle PLZ→Gemeinde→Mietstufe** — erledigt in v0.9, 100 % Abdeckung (10.712 Gemeinden), null nicht zugeordnete PDF-Einträge, neun von neun Stichproben korrekt. Nur bei 255 von 8.159 Postleitzahlen (3,1 %) muss der Wizard nach der Gemeinde fragen
- [x] Wohngeld: **Inselregel** — erledigt in v0.10, 32 Gemeinden. Ohne sie lägen die ostfriesischen Inseln und Föhr/Amrum bei Mietstufe I statt V
- [ ] Wohngeld: **Inselliste fachlich abnehmen** — die Abgrenzung „mit/ohne Festlandanschluss" entscheidet die Wohngeldbehörde
- [ ] Wohngeld: die 200 über Basisnamen zugeordneten Gemeinden stichprobenhaft prüfen
- [ ] Wohngeld: **Aktualität der Mietstufen prüfen** — die Einstufung stammt vom 01.01.2023, eine neuere amtliche Fassung war nicht auffindbar
- [ ] Wohngeld: **§ 21 Nr. 3 WoGG — Vermögensausschluss** („missbräuchlich, insbesondere wegen erheblichen Vermögens"). Wohngeld ist bisher das einzige bedarfsorientierte Modul ohne Vermögensprüfung; die Verwaltungsvorschrift zum WoGG konkretisiert den unbestimmten Rechtsbegriff
- [x] Neue Grundsicherung: **§ 11 SGB II geprüft** — kein Freibetrag, aber auch keine Vollanrechnung: Kindergeld zählt nur, soweit das Kind es zur Sicherung seines Lebensunterhalts braucht; ein Überschuss bleibt unberücksichtigt ([buergergeld.md](docs/module-specs/buergergeld.md))
- [x] Mehrbedarfssätze § 21 SGB II — **recherchiert**, inklusive der Alleinerziehenden-Staffelung (36 % oder 12 % je Kind, gedeckelt bei 60 %)
- [x] Regelaltersgrenzen-Staffelung § 235 SGB VI — **recherchiert**; der Fixwert 67 hätte allen vor 1964 Geborenen das Ergebnis verweigert
- [ ] WBS: Hamburg Netto/Brutto klären, Berlin WBS 140/160, landesspezifische Zusatzfreibeträge, berechtigte Wohnungsgrößen je Land (Inhalt der Ergebniskarte nach 6.5.4)
- [x] Kinderzuschlag: Vermögensfreibeträge — **geprüft und korrigiert**: Die Werte waren die abgeschaffte Karenzzeit-Regelung. § 6a BKGG verweist auf § 12 SGB II, es gilt also die altersgestaffelte Grenze pro Person. Für eine Familie mit zwei Erwachsenen um 35 und zwei Kindern: 30.000 € statt 85.000 €
- [ ] Kinderzuschlag: Vermögensregel gegen die **Durchführungsanweisung Kinderzuschlag (DA-KiZ)** der Bundesagentur gegenprüfen — die Folgerung aus dem Verweis ist schlüssig, aber von keiner Quelle ausdrücklich gezogen
- [x] Elterngeld: Höchst- und Mindestbetrag — **gegen § 2 BEEG bestätigt** (1.800 € / 300 €, Bemessungsgrenze 2.770 €, Stufenregeln unverändert)
- [x] Unterhaltsvorschuss → Wohngeld — **ausdetailliert**: § 14 Abs. 2 Nr. 21 WoGG, 100 %, als Einkommen des Kindes, ohne § 16-Abzüge und ohne § 17-Freibetrag
- [ ] Wohngeld: zwei weitere Einkommenspositionen aus § 14 Abs. 2 WoGG ergänzen — Nr. 20a (Ehegattenunterhalt) und Nr. 27 (Ausbildungsförderung zur Hälfte)
- [ ] Kalibrierung der `Unschaerfe`-Startwerte (6.5.2) gegen amtliche Vergleichsrechner — erst nach Implementierung der Module möglich

> **Quellenregel für alle SGB-II-Werte**: Die Reform zum 01.07.2026 hat unter anderem die Vermögens-Karenzzeit abgeschafft. Sekundärquellen im Netz führen weiterhin Vor-Reform-Stände (z. B. Karenzzeit-Schonvermögen 40.000 € / 15.000 €). Jeder SGB-II-Wert braucht eine Quelle mit erkennbarem Stand **nach Juli 2026**, jede Übernahme das Datum in der Quellenspalte.

### Architektur

- [x] `SCHWELLENWERT_VIELLEICHT` — **entschieden (v0.5)**: einheitlicher Default `{ absolutEuro: 50, relativZumBedarf: 0.05 }` im Konstanten-Set, pro Modul überschreibbare Bezugsgröße; neues Feld `imGrenzbereich` auf `ModuleCalculation` (6.3.1)
- [x] Breite der Betragsspanne bei groben Modulen — **entschieden (v0.5)**: pro Modul als `Unschaerfe { relativ, absolutMin }`, 10-€-Rundung, Kappung an gesetzlichen Obergrenzen, `von === 0` → Status `vielleicht` (6.5.2)
- [x] Auflösung wechselseitiger Einkommensanrechnung — **entschieden (v0.5)**: Azyklizität als beim Start geprüfte Invariante statt Zwei-Runden-Näherung ([docs/orchestrator.md](docs/orchestrator.md) Abschnitt 6)
- [x] Reihenfolge-/Zyklusbehandlung in der Vorrang-Regeltabelle — **entschieden (Orchestrator v2)**: azyklisch, Tiefe 1, `validierePrecedenceRules()` beim Start ([docs/orchestrator.md](docs/orchestrator.md) 5.1)
- [x] Vorrangentscheidung bei beidseitigem Grenzbereich — **entschieden (v0.5)**: kein Ausschluss auf unsicherer Grundlage, beide Ergebnisse bleiben, `vorrangUnklar` im Report ([docs/orchestrator.md](docs/orchestrator.md) 4.3)

### Produkt/UX

- [x] Werden nicht ausgewählte Systeme derselben Gruppe im Report angezeigt? — **entschieden (v0.5)**: gestaffelt — `ja`/`vielleicht` in die Hauptliste mit Marker, der Rest in „Auch geprüft" (5.1)
- [x] Darstellung des WBS-Ergebnisses (Berechtigung statt Betrag) — **entschieden (v0.5)**: `betragsart` steuert die Karte, bei `keineGeldleistung` Berechtigungsumfang statt Betrag (6.5.4)
- [x] Darstellung von `nachrangig` und `nicht_pruefbar` — **entschieden (v0.5)**: fester Handlungsempfehlungs-Slot je Status, zwei Textvarianten für `nachrangig` über `nachrangigGrund` (6.5.3)
- [x] Report-Text bei `nachrangig`: Vergleich oder reiner Verweis? — **entschieden (v0.5)**: reiner Verweis, kein Betragsvergleich (6.5.3)
- [x] Verhalten bei angebrochenen Zeiträumen — **entschieden (v0.5)**: Monat des `pruefungsStichtag` gilt als konstant, Annahme wird im Report sichtbar gemacht (8.3)
- [ ] Konkrete Texte/Microcopy je Status und je System — Tonfall und Beispiele stehen in [docs/design-system.md](docs/design-system.md) 5; die vollständigen Texte folgen beim Bau des Report-UI
- [ ] Design System: Kontobereich, Fehler- und Leerzustände, Ladezustände, Druckansicht — siehe [docs/design-system.md](docs/design-system.md) 8

### Architektur und Betrieb

Ausgearbeitet in [docs/architektur.md](docs/architektur.md).

- [x] Field-Level-Encryption: Library-Wahl und Schlüsselverwaltung — **entschieden**: eigenes Mongoose-Plugin mit AES-256-GCM, Schlüssel als Hoster-Secret, Versionspräfix für Rotation (10.2, 10.3)
- [x] Aufbewahrungsfristen & automatisches Löschkonzept — **entschieden** (10.4)
- [x] Datenbank-Hosting — **entschieden**: MongoDB Atlas Frankfurt, Tarif mit Backups und IP-Zugriffsliste (13.2)
- [x] `User`-Schema-Details — **entschieden**, inklusive der OAuth-Fehlerfälle (9.1)
- [x] Monitoring angekündigter Rechtsänderungen — **entschieden**: `gueltigBis` je Konstanten-Set, `rechtsstandAktuell` in der API-Antwort, Hinweis in der UI, CI-Warnung 60 Tage vor Ablauf (12.2, 12.3)
- [x] Repo-Struktur, API-Schnitt, Schichtung, Fehlerformat, Teststrategie, Deployment — **festgelegt**

**Neu offen** (aus der Architekturarbeit, siehe [docs/architektur.md](docs/architektur.md) Abschnitt 15):

- [ ] Impressum, Datenschutzerklärung, Nutzungsbedingungen — vor dem Livegang zwingend
- [x] Barrierefreiheits-Zielniveau — **festgelegt**: WCAG 2.1 AA verbindlich; alle Farbwerte nachgerechnet, Fokusring global, 48 px Mindestgröße für Bedienelemente ([docs/design-system.md](docs/design-system.md))
- [x] Betreiberfrage — **entschieden**: Betrieb als Privatperson, mit den Folgen für Impressum und Haftung ([docs/architektur.md](docs/architektur.md) 15)
- [ ] Domain festlegen — Frontend und API brauchen dieselbe registrierbare Domain
- [ ] Kostenrahmen beziffern (Atlas-Tarif, Backend-Hosting, E-Mail-Versand)
- [x] Fehler-Tracking — **entschieden: ja**, mit strenger Redaction, ohne Session-Aufzeichnung ([docs/architektur.md](docs/architektur.md) 15)
- [ ] Backup-Wiederherstellung einmal proben
