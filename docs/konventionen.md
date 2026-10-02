# Code-Konventionen

Gilt für das gesamte Repository. Was hier steht, ist nicht Geschmack, sondern Absprache — Abweichungen brauchen einen Grund, der im Code steht.

Struktur und Schichtung stehen in [architektur.md](architektur.md), Gestaltung in [design-system.md](design-system.md). Dieses Dokument beschreibt, wie geschrieben wird.

---

## 1. Sprache im Code

**Fachbegriffe deutsch, Technik englisch.** Die Domäne ist deutsches Sozialrecht; ein `HouseholdIncomeCalculator` zwingt bei jeder Prüfung gegen das Gesetz zu einer Rückübersetzung, und genau dort entstehen Fehler.

```ts
// so
function berechneWohngeld(haushalt: Haushalt, konstanten: KonstantenSet): Ergebnis
const mietstufe = referenzdaten.mietstufeFuerAgs(ags);

// nicht so
function calculateHousingBenefit(household: Household): Result
```

Englisch bleibt, was nicht fachlich ist: `request`, `response`, `middleware`, `schema`, `port`, `client`, `config`, sowie alles aus Bibliotheken.

**Keine Umlaute und kein ß in Bezeichnern** — transkribiert wird `ue`, `ae`, `oe`, `ss`: `buergergeld`, `bafoeg`, `gueltigBis`, `hoechstbetrag`. Grund: Diese Namen landen in URLs, JSON-Schlüsseln, Dateinamen und Datenbankfeldern, und dort ist die Kodierung nicht überall gleich zuverlässig. In Kommentaren, Texten und UI-Strings wird selbstverständlich korrekt geschrieben.

Code-Keys der Hilfesysteme sind in [SPEC.md](../SPEC.md) 3 festgelegt und werden nirgends abgewandelt — auch `buergergeld` nicht, obwohl die Leistung inzwischen anders heißt.

---

## 2. Benennung

| Gegenstand | Form | Beispiel |
|---|---|---|
| Dateien allgemein | `kebab-case.ts` | `api-client.ts`, `wohngeld.rules.ts` |
| React-Komponenten | `PascalCase.tsx`, eine Komponente je Datei | `WizardSchritt.tsx` |
| Tests | neben der Datei, `*.test.ts` | `wohngeld.rules.test.ts` |
| Typen und Komponenten | `PascalCase` | `Haushalt`, `EligibilityResult` |
| Funktionen und Variablen | `camelCase`, Verb voran | `berechneWohngeld`, `pruefeVorrang` |
| Zod-Schema und abgeleiteter Typ | `XSchema` und `X` | `HaushaltSchema` → `type Haushalt = z.infer<…>` |
| Konstanten-Sets | `JJJJ-MM.ts` | `constants/2026-01.ts` |
| Boolesche Werte | Frageform | `istErwerbsfaehig`, `hatKinder` |

**Einheiten gehören in den Namen**, wo sie nicht offensichtlich sind: `betragCent`, `flaecheQm`, `zeitraumMonate`. Ein nacktes `betrag` ist verboten (siehe 4).

Keine Abkürzungen außer den in der Spec eingeführten (`ags`, `plz`, `kiz`, `wbs`, `uvg`). Kein `data`, `info`, `handle`, `manager`, `util` als Namensbestandteil — sie sagen nichts.

---

## 3. TypeScript

- `strict: true` überall, dazu `noUncheckedIndexedAccess`. Gerade beim Nachschlagen in Referenzdaten ist der Treffer regelmäßig `undefined`, und das soll der Compiler sagen, nicht die Produktion.
- **Kein `any`.** An Systemgrenzen kommt `unknown` herein und wird mit Zod geparst. Wo eine Fremdbibliothek `any` erzwingt, steht ein `// eslint-disable-next-line` mit Begründung in derselben Zeile.
- **Keine `enum`s**, stattdessen `as const` mit abgeleitetem Union-Typ. Das erzeugt kein Laufzeitartefakt und passt zu den Zod-Schemata.
- **Keine Default-Exports.** Benannte Exporte lassen sich zuverlässig umbenennen und suchen.
- **Relative Importe tragen die Endung `.js`** — das verlangt ESM mit `moduleResolution: "NodeNext"`, auch wenn die Quelldatei `.ts` heißt. Das ist der häufigste Stolperstein beim Aufsetzen; ESLint erzwingt es.
- Typen aus `packages/shared` werden importiert, nie nachgebaut. Eine lokale Kopie eines geteilten Typs ist ein Fehler, kein Stil.
- `type` für Datenformen, `interface` nur, wo eine Implementierung erwartet wird (`ReferenzdatenPort`).

---

## 4. Geld, Zahlen und Rundung

**Gespeichert, transportiert und summiert wird in ganzzahligen Cent.** Kein Euro-`number` mit Nachkommastellen in Zod-Schemata, Datenbankfeldern, API-Verträgen oder Zwischensummen.

Der Grund ist nicht Pedanterie: `0.1 + 0.2` ergibt in IEEE-754 nicht `0.3`. Bei einer Kette aus Anrechnungen, Freibeträgen und Abschmelzung — genau das, was Kinderzuschlag und Wohngeld tun — summieren sich diese Abweichungen, und ein Ergebnis, das um einen Cent neben der Bagatellgrenze des § 21 WoGG liegt, kippt von „Anspruch" auf „kein Anspruch".

**Wo eine Norm eine Dezimal-Arithmetik vorschreibt, wird sie auch verwendet.** Anlage 3 WoGG rechnet mit zehn Nachkommastellen als Festkomma und rundet erst am Ende kaufmännisch auf volle Euro ([wohngeld.md](module-specs/wohngeld.md) 4.6) — das ist mit Cent-Ganzzahlen nicht darstellbar und mit `number` nicht sicher. Für solche Rechenwege gilt:

- gerechnet wird mit `decimal.js` (reine Bibliothek, verträgt sich mit der Reinheitsregel aus [architektur.md](architektur.md) 3.2),
- **die Dezimalzahlen bleiben innerhalb des Rule-Moduls.** Was das Modul verlässt, ist wieder ganzzahliger Cent — kein `Decimal` in Ergebnistypen, Schemata oder API-Antworten,
- der Übergang steht an genau einer Stelle je Modul, mit Kommentar und Fundstelle.

Daraus folgt im Übrigen:

- Feldnamen enden auf `Cent`. Die Umrechnung nach Euro passiert **ausschließlich** in der Darstellungsschicht, über eine gemeinsame Formatierungsfunktion in `apps/web/src/utils/`.
- Zod-Schemata nehmen die Nutzereingabe in Euro entgegen und wandeln beim Parsen in Cent — einmal, an der Systemgrenze.
- **Gerundet wird nur dort, wo das Gesetz es vorschreibt**, mit der in der Modul-Spec genannten Regel und einem Kommentar mit Fundstelle. Nicht kaufmännisch aus Gewohnheit — Anlage 3 ist kaufmännisch, andere Vorschriften runden ab.
- Zwischenergebnisse werden nicht gerundet. Wer zwischendrin rundet, produziert Abweichungen, die niemand mehr zurückverfolgen kann.

Prozentsätze und Koeffizienten (Wohngeld Anlage 2) sind keine Beträge und bleiben Dezimalzahlen.

## 5. Datum und Stichtag

- Datumswerte als ISO-8601-String (`"2026-01-01"`), keine `Date`-Objekte in geteilten Typen und nicht in der Datenbank, wo ein Kalendertag gemeint ist.
- Zeitzone ist `Europe/Berlin`. Wo ein Zeitpunkt gemeint ist (Token-Ablauf, Löschfristen), gilt UTC in der Speicherung.
- **Jede Berechnung bekommt ihren Stichtag hereingereicht**, sie ruft nie selbst `new Date()`. Das ist die Voraussetzung dafür, dass Tests reproduzierbar sind und dass ein Rechtsstand aus der Vergangenheit nachgerechnet werden kann.

---

## 6. Fachlogik in `packages/eligibility`

Zusätzlich zur Reinheitsregel aus [architektur.md](architektur.md) 3.2:

- **Erwartete fachliche Ergebnisse werden zurückgegeben, nicht geworfen.** „Kein Anspruch", „nachrangig", „nicht prüfbar" sind gültige Ergebnisse mit Begründung, keine Ausnahmen. `throw` bleibt Programmierfehlern vorbehalten — einem fehlenden Konstanten-Set etwa.
- **Jede Formel trägt ihre Fundstelle als Kommentar**, unmittelbar darüber:

  ```ts
  // § 19 Abs. 1 WoGG i.V.m. Anlage 3: Wohngeld = 1,15 × (M − (a + b·M + c·Y) × Y)
  ```

  Ohne die Norm im Code lässt sich in zwei Jahren nicht mehr feststellen, ob eine Zahl falsch ist oder das Gesetz sich geändert hat.
- **Jede Konstante trägt Quelle und Gültigkeit** im Konstanten-Set, nicht im Rechenweg. Magic Numbers im Rule-Modul sind ein Fehler.
- Rule-Module sind reine Funktionen: gleiche Eingabe, gleiches Ergebnis, keine Seiteneffekte, kein Zugriff auf Zeit, Zufall, Umgebung oder Dateisystem.

---

## 7. Frontend

- Seiten unter `src/pages/`, geteilte Bausteine in `src/components/` und `src/layout/`. Wizard- und Sitzungszustand in `src/context/`. **Kein Querimport zwischen fachlichen Seitenordnern** — Gemeinsames wandert nach `components/`, `hooks/` oder `utils/`. Der API-Client liegt in `src/api/`.
- Komponenten enthalten keine Fachlogik. Was gerechnet wird, kommt aus `packages/eligibility` oder von der API; die Komponente stellt dar.
- Zustand: lokaler `useState` als Standard, Zustand-Store nur für den Wizard-Fortschritt und die Sitzung. Kein globaler Store für Dinge, die eine Komponente allein betreffen.
- **Wizard-Daten liegen im `sessionStorage`, nie im `localStorage`** (siehe [architektur.md](architektur.md) 6.1). Einkommens- und Vermögensdaten überleben das Schließen des Browsers nicht.
- Alle sichtbaren Texte laufen über i18next, auch solange es nur Deutsch gibt. Kein hartkodierter Text in JSX.
- Barrierefreiheit ist Teil der Definition of Done, nicht ein späterer Durchgang: semantisches HTML, Tastaturbedienbarkeit, sichtbarer Fokus, Fehlermeldungen mit dem Feld verknüpft. Zielniveau WCAG 2.1 AA, verbindlich.

---

## 8. Tests

Umfang und Gewichtung stehen in [architektur.md](architektur.md) 14. Hier die Form:

- Testdatei neben der Quelldatei, gleicher Name mit `.test.ts`.
- Testnamen beschreiben das fachliche Verhalten, nicht die Funktion: `"kein Anspruch, wenn das Einkommen die Höchstgrenze um einen Cent übersteigt"`.
- **Die Testvektoren aus den Modul-Specs werden übernommen, nicht neu erfunden**, und tragen die Fundstelle im Testnamen.
- **Bei jedem gefundenen Rechenfehler zuerst der Test, der ihn zeigt, dann die Korrektur.** Ohne diesen Test gilt der Fehler als nicht behoben.
- Keine Snapshot-Tests. Keine Tests gegen echte Referenzdatenmengen — dafür gibt es das Fake des `ReferenzdatenPort` mit einer Handvoll Einträge.

---

## 9. Commits, Branches, Pull Requests

**Branch**: `art/kurzbeschreibung` mit `art` aus `feat`, `fix`, `docs`, `refactor`, `test`, `chore` — etwa `feat/wohngeld-rule-modul`. Kurzlebig, ein Thema.

**Commit**: **ausschließlich auf Englisch**, Präfix nach Conventional Commits, Imperativ, unter 72 Zeichen. Deutsche Fachbegriffe bleiben unübersetzt, wo sie der Code-Key sind — `wohngeld` ist ein Eigenname, kein zu übersetzendes Wort.

```
feat(eligibility): implement Wohngeld formula per § 19 WoGG
fix(wohngeld): correct Hoechstbetrag for Mietstufe I (361 € instead of 404 €)
docs: add Referenzdaten port to architektur.md
```

Der Rumpf beantwortet **warum**, nicht was — das steht im Diff. Bei fachlichen Korrekturen gehört die Fundstelle hinein (`Anlage 1 WoGG, Stand 2025`).

**Pull Request**: gegen `main`, grüne CI ist Bedingung. Die Beschreibung nennt, was sich fachlich ändert und welche Dokumente nachgezogen wurden.

**Vor jedem Push, ohne Ausnahme**: keine `.env`, keine Schlüssel, keine echten Personendaten. Das Repository ist öffentlich — ein Commit, der einen Schlüssel enthält, ist auch nach dem Zurücknehmen kompromittiert und der Schlüssel muss ersetzt werden.

---

## 10. Definition of Done

Ein Stück Arbeit ist fertig, wenn alles davon zutrifft:

- [ ] Typprüfung, Lint, Tests und Build laufen lokal grün
- [ ] Neue Fachlogik hat Tests aus der Modul-Spec; ein behobener Rechenfehler hat seinen Regressionstest
- [ ] Formeln tragen ihre Fundstelle, Konstanten ihre Quelle und Gültigkeit
- [ ] Beträge sind Cent, Rundung nur nach Vorschrift
- [ ] UI-Teile sind tastaturbedienbar und die Texte laufen über i18next
- [ ] Keine sensiblen Werte in Logs, Fehlermeldungen oder ausgehenden Fehler-Meldungen
- [ ] Ist eine Entscheidung gefallen, ist das zuständige Dokument nachgezogen — und der Eintrag in [SESSIONS.md](../SESSIONS.md) geschrieben

---

## 11. Werkzeugkette — was verworfen wurde

Die Auswahl steht in [PROJEKT.md](../PROJEKT.md) 5. Hier die Alternativen und warum sie es nicht wurden:

| Gewählt | Verworfen | Grund |
|---|---|---|
| Express 5 | Express 4 | Express 5 reicht Fehler aus `async`-Handlern selbst weiter; unter Express 4 braucht jeder Handler einen Wrapper, und der eine vergessene ist ein stiller Absturz |
| Express 5 | Fastify | Schneller und mit eingebauter Validierung, weicht aber von der MERN-Vorgabe der Spec ab; die Validierung liegt hier ohnehin bei Zod |
| ESM | CommonJS | Ein Modulsystem im ganzen Monorepo. Der Preis ist die `.js`-Endung in Importen (siehe 3) |
| `tsx` + `tsc` | Bundler (tsup) | Ein Werkzeug weniger. Wird der Kaltstart auf Render zum Problem, ist das Bundling nachrüstbar |
| Vitest | Jest | Teilt die Konfiguration mit Vite, startet schneller, versteht ESM ohne Zusatzaufbau |
| Zustand | Context + `useReducer` | Der Wizard-State wird von vielen Schritten gelesen; der spätere Wechsel wäre ein Umbau, den man sich für eine kleine Abhängigkeit spart |
| Eigener `api-client.ts` | TanStack Query | Es gibt genau eine cachefähige Ressource (gespeicherte Haushalte). Cache und Retry dafür sind ~60 Zeilen, die Bibliothek wäre die größere Abhängigkeit |
| Atlas-Cluster für Entwicklung | Docker Compose | Gleiche Umgebung wie Produktion, kein Container in der Kette. Preis: Entwicklung braucht Internet |
| Kein husky/lint-staged | Commit-Hooks | Die CI ist das Gate. Hooks, die lokal gelten, werden umgangen, sobald sie stören |
