# Sessionlog

Kurzlog der Arbeitssessions. Neueste zuoberst.

**Wofür das da ist**: Eine neue Session soll nach den letzten zwei Einträgen wissen, wo die Arbeit steht und was als Nächstes ansteht — ohne 50 KB Spec zu lesen.

**Regeln**

- Ein Eintrag pro Session, **maximal zehn Zeilen**, feste Struktur (siehe Vorlage). Wer mehr schreiben will, schreibt es ins zuständige Dokument, nicht hierher.
- Entscheidungen werden hier **genannt, nicht begründet**. Die Begründung gehört in [SPEC.md](SPEC.md), [docs/architektur.md](docs/architektur.md), [docs/konventionen.md](docs/konventionen.md) oder die betroffene Modul-Spec — mit Verweis von hier aus.
- Wird eine Entscheidung im Log festgehalten, aber nirgends nachgezogen, ist die Session **nicht** abgeschlossen.
- Ab **zehn Einträgen** wandern die ältesten nach `docs/sessions-archiv.md` (unverändert, neueste zuoberst). Diese Datei bleibt damit klein genug, um immer vollständig gelesen zu werden.

**Vorlage**

    ## JJJJ-MM-TT — Kurztitel

    **Gemacht**: was entstanden oder geändert wurde, mit Dateinamen
    **Entschieden**: die Festlegungen dieser Session, je eine Zeile, mit Verweis aufs nachgezogene Dokument
    **Offen**: was bewusst liegen bleibt
    **Als Nächstes**: der eine Schritt, mit dem die nächste Session beginnt

---

## 2026-10-01 — Löschbestätigung und E-Mail-Versand

**Gemacht**: `.btn-gefahr` und zweite Bestätigung in `KontoPage.tsx`. SMTP über `nachrichten.ts`, sonst weiter der Entwicklungslink. `POST /auth/email-erneut`.

**Entschieden**: Rot gilt auch für unwiderrufliches Kontolöschen, nicht für Ergebniskarten — [docs/design-system.md](docs/design-system.md) 2.3. Versand nur, wenn `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` und `MAIL_FROM` gesetzt sind.

**Offen**: Google-OAuth, konkreter Mailanbieter mit AVV, FLE-Schlüsselrotation, Inaktivitätslöschung.

**Als Nächstes**: Google-Anmeldung.

---

## 2026-10-01 — Auth und Haushalte speichern

**Gemacht**: Registrierung, Anmeldung, Abmeldung, Refresh-Rotation, Passwort-Reset, E-Mail-Bestätigung, `GET/DELETE /konto`, Haushalt-CRUD. Nutzlast als AES-256-GCM (`datenChiffre`). Konto-Seite und Speichern im Report.

**Entschieden**: Google-Anmeldung bleibt aus. Lokal kein SMTP — der Bestätigungslink geht ins API-Log und, nur in `development`, in die Registrierungsantwort. `Secure`-Cookie nur in Produktion, sonst setzt der Browser es auf localhost nicht.

**Offen**: E-Mail-Versand, Google-OAuth, FLE-Schlüsselrotation, Inaktivitätslöschung.

**Als Nächstes**: Versand der Bestätigungsmail oder Google-Anmeldung.

---

## 2026-10-01 — Kinderzuschlag-Regelmodul

**Gemacht**: `kinderzuschlag.rules.ts`, SGB-II-Freibeträge in `sgb2.ts`, Kindergeld-Frage im Wizard. UVG mindert den Zuschlag um 45 %.

**Entschieden**: Höchstbetrag bleibt 297 €. Vermögensgrenzen nach § 12 SGB II (bis 29 Jahre: 5.000 €). Erwerbstätigenfreibetrag je Elternteil — [docs/module-specs/kinderzuschlag.md](docs/module-specs/kinderzuschlag.md) 4 und 6.

**Offen**: Auth, FLE-Plugin, Wohnkosten-Verteilschlüssel nur nach Kopfzahl, DA-KiZ-Abgleich vor Livegang.

**Als Nächstes**: Auth-Routen und Speichern von Haushalten.

---

## 2026-10-01 — Unterhaltsvorschuss-Regelmodul

**Gemacht**: `unterhaltsvorschuss.rules.ts` plus Wizard-Fragen und Teilbeträge im Report. Kindergeld im Set `2026-01` auf 259 €.

**Entschieden**: Mindestunterhalt 486 / 558 / 653 €, nicht die Zahlbeträge 227 / 299 / 394 — [docs/module-specs/unterhaltsvorschuss.md](docs/module-specs/unterhaltsvorschuss.md) Abschnitt 4.

**Offen**: Auth, FLE-Plugin, Bürgergeld-Alternative ab 12 (kein Feld im Kernmodell; Hinweis im Report), Vermögensausschluss § 21 Nr. 3, Kalibrierung Wohngeld.

**Als Nächstes**: Kinderzuschlag oder Auth-Routen.

---

## 2026-09-09 — Wohngeld-Regelmodul

**Gemacht**: `wohngeld.rules.ts` mit Anlage-3-Formel (`decimal.js`); Konstanten; Testvektoren 6.1; Artefakte unter `data/artifacts/`; API lädt `ReferenzdatenPort`; Wizard-Gemeindefrage.

**Entschieden**: Heiz-/Klimakomponente ab 2 Personen nach Spec-Staffel (142,60 / 24,80 + Mehrbetrag), nicht linear ab Person 1.

**Offen**: Auth, FLE-Plugin, Vermögensausschluss § 21 Nr. 3, Kalibrierung gegen amtlichen Rechner.

**Als Nächstes**: Auth-Routen oder nächstes Rule-Modul (z. B. Kinderzuschlag / Unterhaltsvorschuss für Anrechnung).

---

## 2026-09-09 — MongoDB-Anbindung

**Gemacht**: `apps/api/src/config/db.ts` mit `dbName: cursorEligibility`; Models `users`, `haushalte`, `pruefungen`, `refreshTokens`; Argon2id-Helfer; `MONGO_URI` in Env-Validierung.

**Entschieden**: Datenbank heißt `cursorEligibility`; Collections bleiben die aus [docs/architektur.md](docs/architektur.md) 10.1.

**Offen**: Auth-Routen, Field-Level-Encryption-Plugin, Wohngeld-Modul. `MONGO_URI` in `.env` muss nicht-leer und ggf. gequotet sein.

**Als Nächstes**: Wohngeld-Rule-Modul — oder Auth, sobald die Atlas-Verbindung bestätigt ist.

---

## 2026-09-09 — Fundament und Durchstich

**Gemacht**: npm-Workspaces mit `apps/web`, `apps/api`, `packages/shared`, `packages/eligibility`; CI; `POST /api/v1/pruefung`; Wizard und Report; Seite `/datenquellen`. Elterngeld als Mini-Regel, übrige Module `nicht_pruefbar`.

**Entschieden**: App-interne Ordner nach `pages`/`layout`/`context`/`hooks`/`api`/`utils` (Web) und `middlewares`/`schemas` (API); geteilte Zod-Typen bleiben in `packages/shared` — [docs/architektur.md](docs/architektur.md) 3, [docs/konventionen.md](docs/konventionen.md) 7.

**Offen**: Wohngeld-Regel, Auth, Field-Level-Encryption-Plugin, Referenzdaten-Artefakt, Livegang-Liste in [docs/architektur.md](docs/architektur.md) 15.

**Als Nächstes**: Wohngeld-Rule-Modul mit den Testvektoren aus [docs/module-specs/wohngeld.md](docs/module-specs/wohngeld.md).

---

## 2026-09-09 — Systemarchitektur konkretisiert, Arbeitsdokumente angelegt

**Gemacht**: `PROJEKT.md`, `SESSIONS.md`, `README.md`, `LICENSE`, `docs/konventionen.md` und `data/LIZENZ.md` neu; `docs/architektur.md` (3, 6.1, 6.2, 8.3) und `SPEC.md` (Kopf, 5.2, Abschnitt 10, jetzt v0.18) nachgezogen.

**Entschieden** — Werkzeugkette vollständig in [PROJEKT.md](PROJEKT.md) 5, begründet in [docs/konventionen.md](docs/konventionen.md):

- Dokumentenordnung: `PROJEKT.md` als Einstieg, `SESSIONS.md` als Kurzlog, `docs/konventionen.md` für Code-Stil; Fachwahrheit bleibt in `SPEC.md` und `docs/`
- Umsetzungsreihenfolge: Fundament → leerer Durchstich mit einer Regel → Modul für Modul, Wohngeld zuerst
- Laufzeit und Werkzeuge: Node 22 LTS, ESM, Express 5, Vitest, ESLint + Prettier, GitHub Actions — keine Commit-Hooks, kein Docker
- Frontend: React Router v7, Zustand, eigener `api-client.ts` statt TanStack Query; Entwicklung gegen einen zweiten Atlas-Cluster
- Referenzdaten: `ReferenzdatenPort` wird in `packages/eligibility` injiziert, versorgt aus einem Build-Artefakt — [docs/architektur.md](docs/architektur.md) 8.3
- Git öffentlich mit PR-Gate, Secrets über `.env` und `.env.example`

**Offen**: Die Livegang-Liste in [docs/architektur.md](docs/architektur.md) 15 ist unverändert offen. Die Lizenzfrage ist erledigt — MIT für den Code, ODbL 1.0 für die aus OpenPLZ abgeleiteten Datensätze ([data/LIZENZ.md](data/LIZENZ.md)).

**Als Nächstes**: Fundament-Commit — npm workspaces mit den vier Paketen, TypeScript-Basiskonfiguration, ESLint mit der Reinheitsregel für `packages/eligibility`, `.gitignore` und `.env.example` **vor** dem ersten Push, GitHub-Actions-Workflow.
