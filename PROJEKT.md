# EligibilityCheck — Projektübersicht

**Diese Datei ist der Einstiegspunkt.** Wer neu ins Projekt kommt — Mensch oder Assistent — liest sie zuerst und findet von hier aus alles Weitere.

Stand: 2026-10-01 · Phase: **Auth, Speichern und Mail-Versand stehen, als Nächstes Google-Anmeldung**

---

## 1. Worum es geht

Eine Webanwendung, mit der Privatpersonen in Deutschland ohne Beratungsstelle prüfen können, ob sich ein Antrag auf eine staatliche Leistung lohnt — und mit welcher Größenordnung sie rechnen können. Acht Hilfesysteme im MVP: Grundsicherung SGB XII, Neue Grundsicherung (SGB II), Wohngeld, Kinderzuschlag, BAföG, Elterngeld, Unterhaltsvorschuss, Wohnberechtigungsschein.

**Das ist ein Produkt für echte Nutzer in echten Notlagen, kein Portfolio-Projekt.** Daraus folgt alles Weitere: DSGVO ist Voraussetzung des Livegangs statt Qualitätsmerkmal, Betriebsfähigkeit über Jahre schlägt Eleganz, und ein stilles Falschrechnen ist schlimmer als ein ehrliches „das können wir nicht prüfen".

Details: [SPEC.md](SPEC.md) Abschnitte 1–4.

---

## 2. Wo was steht

Fachliche und architektonische Wahrheit steht **ausschließlich** in `SPEC.md` und `docs/`. `PROJEKT.md` und `SESSIONS.md` verweisen dorthin und duplizieren nichts. Wo sie sich widersprechen, gilt `docs/`.

| Dokument | Inhalt | Wird geändert, wenn … |
|---|---|---|
| [SPEC.md](SPEC.md) | Produktwahrheit: Scope, Nutzerfluss, Fachlogik, Datenmodell, Validierung, Stack-Übersicht | sich Umfang oder fachliches Verhalten ändert |
| [docs/architektur.md](docs/architektur.md) | Systemarchitektur: Paketschnitt, Schichtung, API, Auth, Verschlüsselung, Aufbewahrung, Hosting, Teststrategie | eine strukturelle oder betriebliche Entscheidung fällt |
| [docs/orchestrator.md](docs/orchestrator.md) | Vorrangregeln, Vermeidungsprüfung, wechselseitige Anrechnung zwischen den Systemen | sich das Zusammenspiel der Module ändert |
| [docs/module-specs/](docs/module-specs/) | Je Hilfesystem eine Sub-Spec mit Rechenweg, Konstanten und Testvektoren | ein Rechtsstand, eine Formel oder ein Grenzwert sich ändert |
| [docs/design-system.md](docs/design-system.md) | Tokens, Komponenten, Kontraste (WCAG 2.1 AA verbindlich) | sich Gestaltung oder Barrierefreiheit ändert |
| [docs/konventionen.md](docs/konventionen.md) | Code-Stil, Benennung, Commit-Format, Definition of Done | eine Regel fürs Schreiben von Code fällt |
| [data/README.md](data/README.md) | Herkunft, Aufbereitung und Prüfung der Referenzdaten | Referenzdaten neu eingespielt werden |
| [data/LIZENZ.md](data/LIZENZ.md) | Lizenzen der Datensätze und die Pflicht-Namensnennung | eine Datenquelle hinzukommt, ersetzt oder neu abgeleitet wird |
| [README.md](README.md) | öffentliche Startseite des Repositorys | sich Zweck, Stack oder Lizenz ändert |
| [LICENSE](LICENSE) | MIT-Lizenz für den Quellcode | — |
| [SESSIONS.md](SESSIONS.md) | Kurzlog: was zuletzt passiert ist, was als Nächstes ansteht | am Ende jeder Arbeitssession |
| PROJEKT.md (diese Datei) | Wegweiser, Repo-Karte, Stand, Arbeitsweise | sich Struktur, Werkzeugkette oder Phase ändert |

---

## 3. Repo-Karte

```
EligibilityCheck/
├── PROJEKT.md            ← du bist hier
├── SESSIONS.md           Kurzlog
├── SPEC.md               Produktwahrheit
├── docs/                 Architektur, Orchestrator, Modul-Specs, Design System, Konventionen
├── data/                 Referenzdaten + Aufbereitungsskripte (vorhanden)
├── apps/
│   ├── web/              React + Vite + Tailwind v4
│   └── api/              Express 5 + TypeScript
└── packages/
    ├── shared/           Zod-Schemata, einmal definiert für Client, API und Mongoose
    └── eligibility/      gesamte Fachlogik, framework-frei
```

Warum dieser Schnitt trägt und welche Regeln dabei gelten (insbesondere: `packages/eligibility` kennt weder Express noch Mongoose noch das Dateisystem): [docs/architektur.md](docs/architektur.md) Abschnitte 3 und 4.

---

## 4. Leitlinien

Vier Sätze, an denen jede Detailentscheidung gemessen wird:

1. **Wenige bewegliche Teile.** Kein Redis, kein Broker, keine Microservices. Was mit einer Datenbank und einem Prozess geht, wird so gebaut — die Wartung liegt bei einer Person.
2. **Datensparsamkeit als Architektur, nicht als Vorsatz.** Die anonyme Prüfung *kann* nichts speichern, weil kein Pfad dorthin existiert.
3. **Die Anwendung kennt ihr Verfallsdatum.** Veraltete Rechtsstände werden sichtbar, statt still weitergerechnet.
4. **Lieber ehrlich unvollständig als still falsch.** Wo die Datenlage nicht reicht, liefert ein Modul `nicht_pruefbar` — kein geratener Betrag.

---

## 5. Werkzeugkette

| | |
|---|---|
| Laufzeit | Node 22 LTS, ESM durchgängig |
| Paketverwaltung | npm workspaces, ein `package-lock.json` |
| Frontend | React + Vite, TypeScript, Tailwind v4 (CSS-first), React Router v7, Zustand, React Hook Form + Zod, i18next |
| API | Express 5, `tsx` in der Entwicklung, `tsc` für den Build |
| Fachlogik | framework-frei; `decimal.js` nur, wo eine Norm Dezimal-Arithmetik vorschreibt (Wohngeld Anlage 3) |
| Datenzugriff | MongoDB + Mongoose; Entwicklung gegen einen zweiten Atlas-Cluster (Free, `eu-central-1`) |
| Tests | Vitest überall, React Testing Library fürs Frontend |
| Qualität | TypeScript `strict`, ESLint (inkl. Reinheitsregel für `packages/eligibility`), Prettier |
| CI | GitHub Actions: Typprüfung, Lint, Tests, Build, Rechtsstands-Check |
| Git | GitHub **öffentlich**, `main` geschützt, kurzlebige Feature-Branches, PR mit grüner CI als Gate |

Begründungen und verworfene Alternativen: [docs/konventionen.md](docs/konventionen.md).

### Lokal starten

*(gilt ab dem Fundament-Commit)*

```bash
npm install                 # einmalig, im Repo-Wurzelverzeichnis
cp .env.example .env        # dann Werte eintragen, siehe Kommentare in der Datei
npm run dev                 # startet apps/web und apps/api parallel
npm test                    # Vitest über alle Pakete
```

`.env` gehört **nie** in einen Commit — auch nicht in einen, der später zurückgenommen wird. Die Datei `.env.example` dokumentiert jede Variable ohne Wert. Ohne gesetzten Verschlüsselungsschlüssel startet die API bewusst nicht.

---

## 6. So läuft eine Arbeitssession

**Zu Beginn**: diese Datei, dann die letzten zwei Einträge in [SESSIONS.md](SESSIONS.md), dann das Fachdokument zum anstehenden Thema. Nicht alles auf einmal — `SPEC.md` allein hat über 50 KB.

**Während**: in Abschnitten arbeiten — ein abgeschlossener Schritt, dann Pause zum Ansehen. Bei Rule-Modulen zuerst die Testvektoren aus der Modul-Spec als Test, dann die Berechnung. Jede Bibliotheks- oder Musterwahl wird begründet, nicht nur eingebaut.

**Am Ende**: Eintrag in `SESSIONS.md`. Ist dabei eine Entscheidung gefallen, wird sie im zuständigen Dokument aus Abschnitt 2 nachgezogen — nicht im Sessionlog geparkt. Hat sich die Phase oder die Werkzeugkette geändert, wird diese Datei aktualisiert.

---

## 7. Stand und nächster Schritt

**Fertig**: Spec in v0.18, Fundament-Monorepo, Durchstich, MongoDB (`cursorEligibility`), Regelmodule Wohngeld, Unterhaltsvorschuss und Kinderzuschlag. Passwort-Auth, verschlüsseltes Speichern, Löschbestätigung, SMTP für Bestätigung und Passwort-Reset sobald die Variablen gesetzt sind.

**Als Nächstes**: Google-Anmeldung. Bestätigung und Passwort-Reset gehen nur per SMTP raus, der Link steht weder in der Antwort noch im Log.

**Was vor dem Livegang zwingend offen ist**: Impressum, Datenschutzerklärung, Nutzungsbedingungen, Domain, Kostenrahmen, eine geprobte Backup-Wiederherstellung. Die vollständige Liste steht in [docs/architektur.md](docs/architektur.md) Abschnitt 15 — sie ist dort geführt, nicht hier.
