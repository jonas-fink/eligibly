# Systemarchitektur & System Design

Teil von: [SPEC.md](../SPEC.md) — vertieft Abschnitt 6.1 (Architekturprinzip), 7 (Accounts), 9 (nicht-funktionale Anforderungen) und 10 (Stack)
Stand: v1 (2026-09-07)
Schwestern-Dokumente: [orchestrator.md](orchestrator.md) für die Cross-Modul-Logik, [data/README.md](../data/README.md) für die Referenzdaten

## 1. Randbedingungen

Diese Entscheidungen fallen anders aus als in einem Lernprojekt, weil drei Bedingungen gelten:

**Es ist ein echtes Produkt für echte Nutzer.** Die App verarbeitet Einkommen, Vermögen, Mietkosten und Haushaltszusammensetzung — nach Art. 4 DSGVO durchweg personenbezogene, teils besonders schutzwürdige Daten. Die Zielgruppe nutzt sie unter finanziellem Druck. Ein falsches Ergebnis kostet einen Antrag oder verschwiegenes Geld; ein Datenleck kostet mehr.

**Die Rechtsgrundlagen ändern sich jährlich.** Regelsätze, Freibeträge, Höchstbeträge und Mietstufen werden fortgeschrieben, teils mitten im Jahr (die SGB-II-Reform zum 01.07.2026). Eine Anwendung, die das nicht aktiv behandelt, rechnet irgendwann still mit veralteten Werten weiter — das ist das größte Betriebsrisiko dieses Produkts, größer als jedes technische.

**Die Wartung liegt bei sehr wenigen Personen.** Jede Entscheidung, die dauerhaften Pflegeaufwand erzeugt, muss diesen Aufwand rechtfertigen. Das spricht gegen exotische Infrastruktur und für wenige, gut verstandene Bausteine.

Daraus folgen drei Leitlinien, auf die sich der Rest dieses Dokuments beruft:

1. **Wenige bewegliche Teile.** Kein Redis, kein Message Broker, keine Microservices. Was mit einer Datenbank und einem Prozess geht, wird so gebaut.
2. **Datensparsamkeit als Architektur, nicht als Vorsatz.** Die anonyme Prüfung kann gar nichts speichern, weil kein Pfad dorthin existiert — nicht, weil wir es unterlassen.
3. **Die Anwendung kennt ihr eigenes Verfallsdatum.** Veraltete Rechtsstände werden sichtbar, nicht stillschweigend weitergerechnet (siehe 12.2).

## 2. Systemüberblick

```
┌──────────────────────────────┐
│  Browser (React SPA)         │   Wizard-State im Client, kein Server-State
│  · Wizard  · Report  · Konto │
└───────────┬──────────────────┘
            │ HTTPS, httpOnly-Cookie (nur bei Login)
┌───────────▼──────────────────┐
│  API (Express + TypeScript)  │
│  ┌────────────────────────┐  │
│  │ Routen / Controller    │  │  HTTP, Auth, Rate-Limit, Fehlerformat
│  ├────────────────────────┤  │
│  │ Services               │  │  Anwendungsfälle, Persistenz
│  ├────────────────────────┤  │
│  │ packages/eligibility   │  │  reine Fachlogik, kennt weder HTTP noch DB
│  └────────────────────────┘  │
└─────┬──────────────────┬─────┘
      │                  │
┌─────▼────────┐  ┌──────▼──────────────────┐
│ MongoDB Atlas│  │ Referenzdaten (Repo)    │
│ Frankfurt    │  │ Konstanten-Sets,        │
│ User,        │  │ Mietstufen, PLZ-Index   │
│ Haushalte    │  │ — statisch, versioniert │
└──────────────┘  └─────────────────────────┘
```

Die Referenzdaten liegen **im Repo**, nicht in der Datenbank. Sie sind Teil des Codestands und ändern sich nur mit einem Deploy — genau wie die Rule-Module, die sie verwenden. Damit ist ein Prüfergebnis allein aus Codestand plus Eingaben reproduzierbar, ohne Datenbankzustand.

## 3. Repo- und Ordnerstruktur

**Monorepo mit npm workspaces.** Ein Repository, ein `package-lock.json`, vier Pakete.

```
EligibilityCheck/
├── apps/
│   ├── web/                     React + Vite + Tailwind
│   │   └── src/
│   │       ├── components/     Design-System-Bausteine
│   │       ├── layout/         AppLayout, Footer
│   │       ├── context/         Provider und Zustand-Stores (Wizard, Sitzung)
│   │       ├── hooks/
│   │       ├── pages/          Wizard, Report, Konto, Datenquellen
│   │       ├── api/            typisierter api-client.ts
│   │       ├── utils/          Euro-Formatierung, statusRolle
│   │       └── types/          nur UI-lokale View-Typen
│   └── api/                     Express 5 + TypeScript (ESM)
│       └── src/
│           ├── routes/          HTTP-Ebene: Pfade, Middleware
│           ├── controllers/     Request → Service → Response
│           ├── services/        Anwendungsfälle, Persistenz
│           ├── models/          Mongoose-Schemata
│           ├── middlewares/    Auth, Fehler, Rate-Limit, Redaction
│           ├── schemas/        Ableitungen aus packages/shared
│           ├── types/          nur API-lokale Typen
│           └── config/          Umgebungsvariablen, validiert beim Start
├── packages/
│   ├── shared/                  Zod-Schemata + daraus abgeleitete Typen
│   │   └── src/
│   │       ├── haushalt.ts      Kernmodell (SPEC 6.2)
│   │       ├── ergebnis.ts      EligibilityResult (SPEC 6.5)
│   │       └── api.ts           Request-/Response-Verträge
│   └── eligibility/             die gesamte Fachlogik
│       └── src/
│           ├── rules/           je System eine Datei: wohngeld.rules.ts …
│           ├── orchestrator.ts  Vorrang, Vermeidungsprüfung, Anrechnung
│           ├── constants/       versionierte Sets: 2026-01.ts, 2026-07.ts …
│           └── ports/           Schnittstellen nach außen (ReferenzdatenPort) — Verträge, keine Daten
├── data/                        Referenzdaten, Aufbereitungs- und Build-Skripte
├── docs/                        Architektur, Orchestrator, Modul-Specs, Design System, Konventionen
├── SPEC.md                      Produktwahrheit
├── PROJEKT.md                   Einstieg: Wegweiser, Repo-Karte, Stand, Werkzeugkette
└── SESSIONS.md                  Kurzlog der Arbeitssessions
```

Wie in diesen Dateien geschrieben wird — Benennung, Geldbeträge, Commits, Definition of Done — steht in [konventionen.md](konventionen.md).

### 3.1 Warum ein Monorepo

Zwei Dinge müssen zwingend zwischen Frontend und Backend geteilt werden: die **Zod-Schemata** (SPEC 8 verlangt identische Validierung auf beiden Seiten) und die **Ergebnistypen**. Werden sie kopiert, driften sie auseinander — und zwar unbemerkt, weil beide Seiten für sich kompilieren. Ein Workspace-Paket macht die Abweichung zu einem Compilerfehler.

Zwei getrennte Repositories plus ein publiziertes npm-Paket wären die Alternative. Für eine Person Wartung ist der Versionierungs- und Release-Aufwand dafür nicht zu rechtfertigen.

### 3.2 Warum `packages/eligibility` ein eigenes Paket ist

Das Paket enthält die gesamte Fachlogik und darf **nichts** aus der Umgebung kennen: kein Express, kein Mongoose, keine Umgebungsvariablen, kein Dateisystem zur Laufzeit. Es bekommt Daten herein und gibt Ergebnisse heraus.

Drei Gründe, die diesen Schnitt tragen:

- **Testbarkeit.** Die Rule-Module sind der Teil, bei dem ein Fehler Geld kostet. Sie müssen ohne laufenden Server und ohne Datenbank testbar sein — sonst werden die Tests langsam und dann selten ausgeführt.
- **Prüfbarkeit.** Eine fachliche Prüfung der Berechnung soll den Rechtsstand und die Formeln ansehen können, ohne sich durch HTTP-Handling zu arbeiten.
- **Optionalität.** Läge die Berechnung eines Tages im Client, wäre das ein Import statt einer Portierung. Das ist kein Ziel für den MVP, aber der Schnitt kostet nichts und hält die Tür offen (siehe 6.3).

Erzwungen wird die Reinheit durch eine ESLint-Regel (`no-restricted-imports` für `express`, `mongoose`, `node:fs`) — nicht durch Disziplin.

## 4. Schichtung im Backend

Vier Ebenen, Abhängigkeiten nur nach unten:

| Ebene | Kennt | Kennt **nicht** | Verantwortung |
|---|---|---|---|
| Route | Express, Middleware | Fachlogik | Pfad, Methode, Auth-Pflicht, Rate-Limit |
| Controller | Request/Response, Zod | Mongoose | Eingabe validieren, Service rufen, Statuscode wählen |
| Service | Models, `eligibility` | Express | Anwendungsfall, Transaktionen, Persistenz |
| `eligibility` | nichts davon | alles davon | Berechnung |

Ein Controller enthält keine `if`-Kaskade über Fachregeln, ein Service kein `res.status()`. Wo diese Trennung unbequem wird, ist das ein Hinweis, dass ein Anwendungsfall falsch geschnitten ist — nicht ein Grund, sie aufzuweichen.

## 5. API-Design

**Basis-Pfad `/api/v1`.** Die Version steht von Anfang an im Pfad. Sie kostet nichts und erspart später den unangenehmen Moment, in dem sich ein Vertrag ändern muss, während Clients im Feld sind.

### 5.1 Endpunkte

| Methode | Pfad | Auth | Zweck |
|---|---|---|---|
| `POST` | `/api/v1/pruefung` | nein | **Der Kernendpunkt.** Haushalt rein, Ergebnisse raus. Zustandslos, speichert nichts |
| `GET` | `/api/v1/referenz/gemeinden?plz=` | nein | Gemeinden zu einer PLZ, für die Mietstufen-Rückfrage im Wizard |
| `GET` | `/api/v1/referenz/rechtsstaende` | nein | verfügbare Konstanten-Sets mit Gültigkeit |
| `POST` | `/api/v1/auth/registrierung` | nein | Konto anlegen, E-Mail-Verifizierung anstoßen |
| `POST` | `/api/v1/auth/anmeldung` | nein | Anmelden, setzt Cookies |
| `POST` | `/api/v1/auth/abmeldung` | ja | Refresh-Token widerrufen, Cookies löschen |
| `POST` | `/api/v1/auth/erneuern` | Cookie | Access-Token erneuern (Refresh-Rotation) |
| `POST` | `/api/v1/auth/passwort-vergessen` | nein | Reset anstoßen |
| `POST` | `/api/v1/auth/passwort-zuruecksetzen` | Token | Reset abschließen |
| `POST` | `/api/v1/auth/email-bestaetigen` | Token | E-Mail-Adresse bestätigen |
| `POST` | `/api/v1/auth/email-erneut` | ja | Bestätigungslink erneut senden, höchstens 5 pro Stunde |
| `GET` | `/api/v1/haushalte` | ja | gespeicherte Haushalte des Kontos |
| `POST` | `/api/v1/haushalte` | ja | Haushalt speichern (der Einwilligungsschritt) |
| `GET` | `/api/v1/haushalte/:id` | ja | einzelner Haushalt samt Prüfhistorie |
| `PUT` | `/api/v1/haushalte/:id` | ja | ändern |
| `DELETE` | `/api/v1/haushalte/:id` | ja | löschen, sofort und endgültig |
| `DELETE` | `/api/v1/konto` | ja | Konto und alle Haushalte löschen |

**`POST /pruefung` ist bewusst kein `GET`.** Ein `GET` mit Einkommensdaten im Query-String landet in Server-Logs, Proxy-Caches und der Browser-History. Der Endpunkt antwortet zusätzlich mit `Cache-Control: no-store`.

### 5.2 Verträge liegen in `packages/shared`

Für jeden Endpunkt ein Request- und ein Response-Schema in Zod. Der Client leitet seine Typen daraus ab (`z.infer`), der Server validiert damit an der Grenze. Ein Vertrag existiert genau einmal.

```ts
// packages/shared/src/api.ts
export const PruefungRequest = z.object({
  haushalt: HaushaltSchema,
  interessierendeSysteme: z.array(SystemKeySchema).min(1),
  systemSpecificAnswers: z.record(SystemKeySchema, z.unknown()).optional(),
});
export const PruefungResponse = z.object({
  ergebnisse: z.array(EligibilityResultSchema),
  rechtsstandVersion: z.string(),
  rechtsstandAktuell: z.boolean(),        // false → UI zeigt Veraltungs-Hinweis (12.2)
});
```

### 5.3 Fehlerformat

Einheitlich `application/problem+json` nach RFC 9457:

```json
{ "type": "/probleme/validierung", "title": "Eingabe unvollständig",
  "status": 422, "detail": "wohnsituation.plz: 5 Ziffern erwartet",
  "felder": { "wohnsituation.plz": "5 Ziffern erwartet" } }
```

`felder` ist die Ergänzung zum Standard und bildet Zod-Fehler auf Formularfelder ab, damit das Frontend sie an der richtigen Stelle anzeigen kann.

**Fehlermeldungen enthalten nie Eingabewerte.** „5 Ziffern erwartet", nicht „'1234' ist keine gültige PLZ" — Fehlerobjekte wandern in Logs und Fehler-Reports (SPEC 9.3).

### 5.4 Rate-Limiting

`POST /pruefung` ist unauthentifiziert und rechenintensiv. Grenzen pro IP: 30 Prüfungen pro Minute, 20 Anmeldeversuche pro Stunde, 5 Passwort-Reset-Anforderungen pro Stunde. Umgesetzt mit `express-rate-limit` im Arbeitsspeicher — bei einer Instanz ausreichend, bei mehreren Instanzen wäre ein gemeinsamer Speicher nötig (siehe 13.3).

## 6. Zustandslosigkeit der anonymen Prüfung

SPEC 9.2 verspricht: ohne Login wird nichts gespeichert. Architektonisch durchgesetzt statt zugesichert:

1. **Kein Persistenzpfad.** Der `PruefungService` bekommt kein Repository injiziert. Er *kann* nicht speichern.
2. **Kein Session-Speicher.** Es gibt keinen serverseitigen Sitzungszustand für nicht angemeldete Nutzer — auch kein Redis, auch keine In-Memory-Map.
3. **Kein Logging der Nutzlast.** Die Redaction-Middleware (siehe 11.2) entfernt die Feldliste aus SPEC 9.1, bevor irgendetwas geschrieben wird. Request-Bodies werden grundsätzlich nicht geloggt.
4. **Wizard-State im Client.** Zwischen den Schritten hält der Browser die Daten, nicht der Server (siehe 6.2).

**Der Übergang „anonym → gespeichert"** ist ein eigener, bewusster Nutzerschritt: `POST /haushalte` mit dem vollständigen Haushalt aus dem Client-State, nach expliziter Einwilligung. Es gibt keinen Weg, bei dem eine anonyme Prüfung „nachträglich" gespeichert wird.

### 6.1 Wizard-State im Client

Ein Zustand-Store (SPEC 10) hält Fortschritt und Eingaben. Persistenz zwischen Reloads über `sessionStorage`, nicht `localStorage`:

- `sessionStorage` endet mit dem Tab. Finanzdaten überleben damit nicht das Schließen des Browsers.
- Auf einem geteilten oder öffentlichen Rechner ist das der Unterschied zwischen „weg" und „liegt noch da".
- Beim Erreichen des Reports wird der Speicher aktiv geleert, sobald der Nutzer die Seite verlässt.

Ein Hinweis im Wizard sagt das in einem Satz, statt es zu verschweigen.

### 6.2 Warum die Berechnung im MVP auf dem Server läuft

Die Alternative wäre, `packages/eligibility` in den Client zu bündeln — dann verließen die Finanzdaten das Gerät nie. Das ist datenschutzrechtlich klar besser und der Schnitt aus 3.2 hält die Tür dafür offen.

Gegen den MVP spricht vor allem eines: **Jede Fehlberechnung wäre erst nach einem Client-Deploy behoben** — und selbst dann erst, wenn der Nutzer neu lädt. Serverseitig wirkt ein Hotfix sofort für alle. Bei einer Anwendung, deren Zahlen sich noch setzen müssen und in der bereits fünf Rechenfehler gefunden wurden, wiegt das schwer.

Das Größenargument, das hier in früheren Fassungen stand („rund 5 MB Referenzdaten"), ist mit dem Build-Artefakt aus 8.3 hinfällig: Auszuliefern wären rund 360 KB, gzip etwa 120 KB. Es spricht also nur noch die Fehlerkorrektur gegen den Client — nicht mehr das Gewicht der Daten.

**Festlegung**: MVP serverseitig. Der clientseitige Betrieb bleibt als Option dokumentiert; die Voraussetzung dafür (reines Fachlogik-Paket) ist bereits geschaffen. Der Preis ist eine ehrliche Zeile in der Datenschutzerklärung — die Daten gehen an den Server, werden dort aber nicht gespeichert.

## 7. Validierung — ein Schema, drei Verwendungen

SPEC 8 verlangt geteilte Zod-Schemata. Konkret:

```
packages/shared/src/haushalt.ts   ← die einzige Definition
        │
        ├─→ apps/web    React Hook Form via zodResolver → Feldfehler im Formular
        ├─→ apps/api    Controller validiert an der Grenze → 422 mit Feldliste
        └─→ apps/api    Mongoose-Schema wird daraus abgeleitet, nicht parallel gepflegt
```

Der dritte Punkt ist der, den man leicht auslässt. Ein handgeschriebenes Mongoose-Schema neben einem Zod-Schema ist eine zweite Wahrheit über dieselben Daten. Stattdessen: Das Mongoose-Schema wird aus dem Zod-Schema generiert oder minimal gehalten (nur was Mongoose für Indizes und Verschlüsselung braucht), die inhaltliche Validierung passiert ausschließlich über Zod vor dem Schreiben.

**Harte Regeln und Plausibilitätswarnungen sind getrennt.** SPEC 8.1 sind Zod-Constraints und führen zu 422. SPEC 8.2 sind *keine* Zod-Regeln — sie dürfen die Eingabe nicht ablehnen. Sie leben als eigene Funktion `pruefePlausibilitaet(haushalt): Warnung[]`, laufen im Client und erzeugen Rückfragen im Wizard. Würde man sie in Zod abbilden, wären auffällige aber reale Konstellationen nicht mehr eingebbar — und das sind gerade die Fälle, für die die App existiert.

## 8. Konstanten-Sets und Referenzdaten

### 8.1 Auflösung zur Laufzeit

```ts
// packages/eligibility/src/constants/index.ts
const SETS = { '2026-01': set202601, '2026-07': set202607 } as const;

export function ladeKonstanten(version: RechtsstandVersion): Konstanten {
  const s = SETS[version];
  if (!s) throw new UnbekannterRechtsstand(version);
  return s;
}
export function aktuellerRechtsstand(stichtag: Date): RechtsstandVersion { … }
```

Statische Imports, kein dynamisches Laden aus dem Dateisystem. Damit sind fehlende oder kaputte Sets ein Build-Fehler statt ein Laufzeitfehler in Produktion.

### 8.2 Was in ein Konstanten-Set gehört — und was nicht

| gehört hinein | bleibt draußen |
|---|---|
| Regelsätze, Freibeträge, Höchstbeträge | Formeln und Rechenwege |
| Anlage 1, 2, 3 WoGG | Struktur der Rule-Module |
| `SCHWELLENWERT_VIELLEICHT`, `Unschaerfe` (SPEC 6.3.1, 6.5.2) | Vorrangregeln des Orchestrators |
| Bagatellgrenze, Kindergeld, Altersgrenzen | |

Faustregel: Alles, was sich zum Jahreswechsel oder bei einer Reform ändern kann, ohne dass sich die Logik ändert. Ändert sich die Logik, ist es ein Code-Change mit eigenen Tests.

Die **Mietstufen-Tabelle** gehört ebenfalls dazu (`data/mietstufen-lookup.json`), auch wenn sie nicht jährlich fortgeschrieben wird — sie wird periodisch neu festgesetzt, und eine gespeicherte Prüfung darf danach nicht stillschweigend anders rechnen.

### 8.3 Referenzdaten zur Laufzeit — Injektion statt Zugriff

Die Mietstufen- und PLZ-Daten liegen als JSON unter `data/`. `packages/eligibility` darf sie **nicht selbst laden** — es kennt kein Dateisystem (3.2). Der Weg hinein ist deshalb ein Vertrag:

```ts
// packages/eligibility/src/ports/referenzdaten.ts
export interface ReferenzdatenPort {
  agsFuerPlz(plz: string): readonly Ags[];        // mehrdeutig: eine PLZ kann mehrere Gemeinden treffen
  mietstufeFuerAgs(ags: Ags): Mietstufe | undefined;
}
```

`apps/api` lädt die Artefakte einmal beim Start in zwei `Map`s und reicht eine Implementierung herein. Tests injizieren ein Fake mit einer Handvoll Einträge.

**Versorgt wird der Port aus einem Build-Artefakt, nicht aus den Quelldateien.** Ein Skript unter `data/scripts/` erzeugt aus `mietstufen-lookup.json` und `plz-index.json` zwei magere Nachschlagetabellen — reproduzierbar, im CI verifiziert:

| Quelle | Größe | abgeleitetes Artefakt |
|---|---|---|
| `mietstufen-lookup.json` (10.712 Gemeinden, mit Namen, Kreis, Land, Quelle) | 1,5 MB | `ags → mietstufe`, **139 KB** |
| `plz-index.json` (8.159 PLZ) | 302 KB | `plz → ags[]`, **223 KB** |

Die Quelldateien behalten Namen, Kreis und Quellenangabe — die tragen die fachliche Prüfbarkeit und gehören ins Repository, aber nicht in den Rechenweg.

Vier Wege waren möglich; die Wahl fiel aus drei Gründen auf diesen:

- **Verfügbarkeit.** Referenzdaten aus MongoDB zu holen, hieße einen Netzwerk-Roundtrip und einen zusätzlichen Ausfallgrund pro Prüfung — für Daten, die sich alle paar Jahre ändern.
- **Testgeschwindigkeit.** Ein direkter Import zöge 1,2 MB in jede Testdatei, auch in die, die nur eine Formel prüft. Bei dicht getesteten Rule-Modulen ist das der Unterschied zwischen einer Testsuite, die läuft, und einer, die übersprungen wird.
- **Die offene Tür aus 6.3.** Läge die Berechnung eines Tages im Client, wären 1,2 MB nicht auslieferbar, 360 KB (≈ 120 KB gzip) schon.

Laufzeitunterschiede gibt es zwischen den Varianten nicht: Sobald die Daten im Prozess sind, ist jeder Zugriff ein `Map.get()`.

**Mehrdeutige Postleitzahlen** fallen dabei sichtbar an — PLZ 24113 trifft zwei Gemeinden. `agsFuerPlz` gibt deshalb eine Liste zurück. Welche Gemeinde gemeint ist, entscheidet der Nutzer in der UI; die Fachlogik rät nicht.

## 9. Auth und Sessions

SPEC 7 nennt „JWT-Sessions". Das wird hier präzisiert, weil die naheliegende Umsetzung ein Sicherheitsproblem wäre.

**Kein Token im `localStorage`.** Ein JWT im `localStorage` ist über jede XSS-Lücke auslesbar. Bei einer Anwendung mit Einkommens- und Vermögensdaten ist das kein akzeptables Restrisiko.

**Festlegung:**

| Element | Umsetzung |
|---|---|
| Access-Token | JWT, 15 Minuten gültig, in einem `httpOnly`-Cookie |
| Refresh-Token | undurchsichtiger Zufallswert (32 Byte), **gehasht** in MongoDB, 30 Tage, in einem `httpOnly`-Cookie |
| Cookie-Attribute | `httpOnly`, `Secure`, `SameSite=Lax`, `Path=/api` |
| Rotation | Jede Erneuerung gibt ein neues Refresh-Token aus und entwertet das alte |
| Wiederverwendung | Ein bereits benutztes Refresh-Token entwertet die **gesamte Kette** — das ist die Standard-Erkennung für gestohlene Tokens |
| Abmeldung | Refresh-Token in der DB löschen, Cookies leeren |

**`SameSite=Lax` setzt voraus, dass Frontend und API dieselbe registrierbare Domain teilen** — etwa `app.beispiel.de` und `api.beispiel.de`. Das ist der Grund, die API auf einer Subdomain zu betreiben statt auf einer fremden Hoster-URL. Andernfalls bräuchte es `SameSite=None`, das den CSRF-Schutz aufgibt.

Damit ist kein Redis nötig: Der einzige serverseitige Zustand ist die Refresh-Token-Tabelle in MongoDB, und die braucht keine eigene Infrastruktur.

### 9.1 `User`-Schema, ausdetailliert

Der offene Punkt aus SPEC 7:

```ts
interface User {
  id: string;
  email: string;                    // eindeutig, kleingeschrieben normalisiert
  emailVerifiziert: boolean;        // bis dahin: Login möglich, Speichern nicht
  passwordHash?: string;            // Argon2id, siehe unten
  oauthProvider?: 'google';
  oauthId?: string;                 // eindeutig je Provider
  erstelltAm: Date;
  zuletztAngemeldet?: Date;         // Grundlage der Inaktivitätslöschung (10.3)
  loeschungAngekuendigtAm?: Date;
}
```

**Argon2id statt bcrypt.** SPEC 10 nennt bcrypt; das ist nicht falsch, aber Argon2id ist seit Jahren die Empfehlung von OWASP und BSI und begrenzt zusätzlich den Speicherbedarf eines Angreifers. Der Wechsel kostet eine Zeile Konfiguration.

**E-Mail-Verifizierung**: Token als 32-Byte-Zufallswert, gehasht gespeichert, 24 Stunden gültig. Ohne Verifizierung ist die App voll nutzbar — nur das **Speichern** eines Haushalts ist gesperrt. Begründung: Der Kernnutzen soll nicht hinter einer E-Mail-Hürde liegen, aber personenbezogene Daten sollen nicht unter einer Adresse landen, die dem Nutzer nicht gehört.

**Passwort-Reset**: 32-Byte-Token, gehasht, 1 Stunde gültig, einmal verwendbar. Die Antwort auf „Passwort vergessen" ist **immer** dieselbe, ob die Adresse existiert oder nicht — sonst wird der Endpunkt zur Nutzerliste. Ein erfolgreicher Reset widerruft alle Refresh-Tokens.

**OAuth-Fehlerfälle** — die Stelle, an der solche Systeme üblicherweise kaputtgehen:

| Fall | Verhalten |
|---|---|
| Google-Login, E-Mail existiert bereits mit Passwort | **Nicht** automatisch verknüpfen. Nutzer anmelden lassen und die Verknüpfung im Konto bestätigen. Sonst kann eine fremde Person mit einem Google-Konto derselben Adresse ein bestehendes Konto übernehmen |
| Google liefert keine E-Mail-Adresse | Anmeldung ablehnen, verständlich erklären |
| Google-E-Mail nicht verifiziert (`email_verified: false`) | Anmeldung ablehnen |
| Nutzer widerruft den Zugriff bei Google | Beim nächsten Login normal neu autorisieren; bestehendes Konto bleibt |
| Nur OAuth, kein Passwort, will Passwort setzen | Über den Reset-Fluss an die verifizierte Adresse |

## 10. Datenhaltung

### 10.1 Collections

| Collection | Inhalt | Besonderheit |
|---|---|---|
| `users` | Konten | eindeutiger Index auf `email` und `(oauthProvider, oauthId)` |
| `haushalte` | gespeicherte Haushalte | Index auf `userId`; sensible Felder verschlüsselt |
| `pruefungen` | Ergebnisverläufe je Haushalt | Index auf `(haushaltId, erstelltAm)`; enthält `rechtsstandVersion` |
| `refreshTokens` | gehashte Refresh-Tokens | TTL-Index auf `laeuftAbAm` — MongoDB räumt selbst auf |
| `verifizierungsTokens` | E-Mail- und Reset-Tokens, gehasht | TTL-Index |

Prüfergebnisse werden **gespeichert, nicht neu berechnet**. Ein Verlauf soll zeigen, was damals herauskam — mit dem damaligen Rechtsstand. Eine Neuberechnung ist ein bewusster Nutzerschritt (SPEC 6.4).

### 10.2 Field-Level Encryption

Der offene Punkt aus SPEC 9.1. Drei Optionen standen zur Wahl:

| Option | Bewertung |
|---|---|
| MongoDB CSFLE / Queryable Encryption | Technisch die stärkste Lösung, Schlüssel verlassen den Client nie. Bindet aber an bestimmte Atlas-Tarife und Treiberversionen und erhöht die Betriebskomplexität deutlich |
| `mongoose-field-encryption` | Schnell eingebaut. Eine Krypto-Abhängigkeit von Dritten, deren Pflege man nicht kontrolliert — bei einer Anwendung, die Jahre laufen soll, ein reales Risiko |
| **Eigenes Mongoose-Plugin mit `node:crypto`** | **Gewählt** |

**Begründung**: Die Feldliste ist klein und fest (SPEC 9.1). Auf diesen Feldern muss nie gesucht, sortiert oder aggregiert werden — sie werden immer nur als Ganzes gelesen. Damit entfällt der einzige echte Vorteil von Queryable Encryption. Was bleibt, sind rund achtzig Zeilen gegen die Node-Standardbibliothek, die vollständig im eigenen Test liegen.

**Das ist ausdrücklich kein eigenes Kryptoverfahren**, sondern die Anwendung von AES-256-GCM aus der Standardbibliothek. Die Fallstricke sind bekannt und werden benannt:

- **Ein eigener Initialisierungsvektor je Verschlüsselung**, 12 Byte aus `randomBytes`. Ein wiederverwendeter IV bricht GCM vollständig.
- **Der Auth-Tag wird mitgespeichert** und beim Entschlüsseln geprüft. Ohne ihn ist GCM nur Verschlüsselung ohne Integritätsschutz.
- **Speicherformat**: `v1:<keyVersion>:<iv-base64>:<tag-base64>:<ciphertext-base64>` — die Präfixe machen Format- und Schlüsselwechsel möglich, ohne alle Dokumente auf einmal migrieren zu müssen.
- **Kein deterministisches Verfahren.** Gleiche Einkommen ergeben unterschiedliche Chiffrate. Das verhindert, dass sich aus der Datenbank ablesen lässt, welche Haushalte gleich viel verdienen.

### 10.3 Schlüsselverwaltung

| Frage | Festlegung |
|---|---|
| Wo liegt der Schlüssel? | Umgebungsvariable beim Hoster (Render Secrets), nie im Repo, nie in der Datenbank |
| Format | 32 Byte, base64, aus `crypto.randomBytes(32)` |
| Start ohne Schlüssel | Der Prozess startet **nicht**. Die Konfigurationsprüfung beim Start bricht ab, statt unverschlüsselt weiterzulaufen |
| Rotation | Neue Version als `KEY_V2` ergänzen, `AKTUELLE_KEY_VERSION=2` setzen. Neue Schreibvorgänge nutzen v2, alte Dokumente bleiben mit v1 lesbar. Ein Hintergrundlauf schreibt sie nach und nach um |
| Verlust | Die Daten sind unwiederbringlich. Der Schlüssel gehört in denselben Notfallplan wie die Datenbank-Zugangsdaten |

Ein dedizierter Secret-Manager (AWS KMS, HashiCorp Vault) wäre die nächste Stufe. Für den Umfang dieses Produkts ist er zusätzliche Infrastruktur ohne Sicherheitsgewinn, solange der Hoster die Secrets verschlüsselt vorhält und der Zugriff auf wenige Personen begrenzt ist. Bei Wachstum ist der Wechsel durch das `keyVersion`-Präfix vorbereitet.

### 10.4 Aufbewahrung und Löschung

Der zweite offene Punkt aus SPEC 9.1:

| Datenart | Frist | Mechanik |
|---|---|---|
| Anonyme Prüfung | keine Speicherung | entfällt |
| Gespeicherte Haushalte und Prüfungen | bis zur Löschung durch den Nutzer, **längstens 24 Monate ohne Anmeldung** | täglicher Lauf, siehe unten |
| Konto | wie oben; bei Kontolöschung sofort und kaskadierend | `DELETE /konto` |
| Refresh- und Verifizierungs-Tokens | 30 Tage bzw. 1–24 Stunden | TTL-Index in MongoDB |
| Anwendungs-Logs | 14 Tage | Hoster-Einstellung |
| Datenbank-Backups | 30 Tage | Atlas |

**Inaktivitätslöschung**: Ein täglicher Lauf sucht Konten mit `zuletztAngemeldet` älter als 23 Monate, verschickt eine Ankündigung an die hinterlegte Adresse und setzt `loeschungAngekuendigtAm`. Nach 30 weiteren Tagen ohne Anmeldung wird gelöscht. Eine Anmeldung in dieser Zeit setzt beides zurück.

**Ausgeführt als Cronjob des Hosters, der einen geschützten Endpunkt ruft** — nicht als `setInterval` im Anwendungsprozess. Ein Intervall im Prozess läuft bei mehreren Instanzen mehrfach und bei Neustarts gar nicht.

**Backups sind der ehrliche Vorbehalt**: Eine Löschung wirkt in den Sicherungen erst nach deren Ablauf. Das gehört so in die Datenschutzerklärung, statt eine sofortige Vollständigkeit zu behaupten, die technisch nicht existiert.

### 10.5 Auftragsverarbeitung

Jeder Dienst, der personenbezogene Daten verarbeitet, braucht einen Auftragsverarbeitungsvertrag nach Art. 28 DSGVO. Für dieses Produkt betrifft das mindestens: den Backend-Hoster, MongoDB Atlas, den E-Mail-Versand (Verifizierung, Reset) und ein etwaiges Fehler-Tracking. Alle vier bieten Standardverträge an. **Ohne diese Verträge darf das Produkt nicht live gehen** — das ist keine Formalie, sondern Voraussetzung der Rechtmäßigkeit.

Daraus folgt eine Auswahlregel: Anbieter mit EU-Rechenzentrum und verfügbarem AVV. Fehlt eines von beidem, scheidet der Anbieter aus, unabhängig von technischen Vorzügen.

## 11. Fehlerbehandlung und Logging

### 11.1 Fehler

Eine zentrale Express-Fehler-Middleware ist der einzige Ort, der HTTP-Statuscodes aus Fehlern ableitet. Services werfen Fachfehler (`UnbekannterRechtsstand`, `HaushaltNichtGefunden`, `RechtsstandVeraltet`), die Middleware bildet sie auf Statuscodes und `problem+json` ab.

Unerwartete Fehler werden mit einer Korrelations-ID geloggt und dem Nutzer **ohne Details** gemeldet: „Etwas ist schiefgelaufen. Kennung: `a3f9c1`." Stacktraces und interne Meldungen verlassen den Server nie — sie können Feldnamen und Werte enthalten.

### 11.2 Logging-Redaction

SPEC 9.3 verlangt, dass Einkommens-, Vermögens- und Mietdaten nicht in Logs landen. Umgesetzt an drei Stellen, weil eine nicht reicht:

1. **Logger-Konfiguration** mit einer Redaction-Liste über die Feldpfade aus SPEC 9.1 (pino kann das nativ).
2. **Request-Bodies werden grundsätzlich nicht geloggt** — kein Opt-out, auch nicht im Entwicklungsmodus. Was im Entwicklungsmodus erlaubt ist, landet irgendwann in Produktion.
3. **Fehler-Serialisierung** entfernt `request.body` und `error.input`, bevor etwas an ein externes Fehler-Tracking geht.

Geloggt wird: Zeitstempel, Methode, Pfad, Statuscode, Dauer, Korrelations-ID, welche Module mit welchem Ergebnis-**Status** liefen, verwendeter Rechtsstand. Nicht: Eingabewerte, Beträge, PLZ, IP-Adresse im Klartext.

**Ein Test hält das fest**: Ein Testfall schickt einen vollständigen Haushalt durch die API und prüft, dass keiner der sensiblen Werte im aufgezeichneten Log-Strom vorkommt. Ohne diesen Test ist die Regel eine Absichtserklärung.

## 12. Umgang mit dem Rechtsstand

Der Kern des Betriebsrisikos aus Abschnitt 1.

### 12.1 Jede Prüfung trägt ihren Rechtsstand

Bereits in SPEC 6.4 festgelegt und hier bestätigt: Jedes `EligibilityResult` trägt `rechtsstandVersion`. Gespeicherte Prüfungen bleiben mit ihrem Stand erhalten.

### 12.2 Die Anwendung kennt ihr Verfallsdatum

Jedes Konstanten-Set bekommt zusätzlich ein `gueltigBis`:

```ts
export const set202601: Konstanten = {
  version: '2026-01',
  gueltigVon: new Date('2026-01-01'),
  gueltigBis: new Date('2026-12-31'),   // ← neu
  …
};
```

Liegt der Prüfungsstichtag hinter dem `gueltigBis` des neuesten verfügbaren Sets, liefert die API `rechtsstandAktuell: false`, und die Oberfläche zeigt einen deutlichen Hinweis: *„Diese Berechnung beruht auf dem Rechtsstand 2026. Seither können sich Regelsätze und Freibeträge geändert haben — bitte prüfe die Werte beim Amt."*

Das ist ein technisches Sicherheitsnetz gegen ein organisatorisches Versäumnis. Wird die jährliche Pflege einmal vergessen — und bei sehr kleinen Teams passiert das —, rechnet die App nicht still mit veralteten Zahlen weiter, sondern sagt es. Für eine Anwendung, die Menschen als Entscheidungsgrundlage dient, ist das der Unterschied zwischen einem verpassten Wartungstermin und falschen Auskünften.

### 12.3 Der Pflegeprozess

| Wann | Was |
|---|---|
| Jährlich im November | Prüfen, welche Werte sich zum 1. Januar ändern. Neues Konstanten-Set anlegen, nicht das bestehende ändern |
| Bei angekündigten Reformen | Set mit dem Inkrafttretensdatum vorbereiten (wie bei der Unterhaltsvorschuss-Altersgrenze 2027) |
| Bei jedem neuen Set | Testvektoren gegen amtliche Rechner gegenrechnen, bevor es scharf geht |
| Automatisch | Ein CI-Lauf schlägt Alarm, wenn `gueltigBis` des neuesten Sets weniger als 60 Tage in der Zukunft liegt |

Der letzte Punkt macht aus einer Kalendererinnerung eine Build-Warnung.

## 13. Deployment und Betrieb

### 13.1 Umgebungen

Zwei: **Produktion** und **Staging**. Keine dritte. Staging hat eine eigene Datenbank mit ausschließlich synthetischen Daten — **keine Kopie der Produktionsdaten**, auch nicht anonymisiert. Für Testdaten reicht ein Generator; ein Produktionsabzug auf einer Staging-Umgebung ist eine der häufigsten realen DSGVO-Verletzungen.

### 13.2 Hosting

Der offene Punkt aus SPEC 11, entschieden nach der Regel aus 10.5:

| Teil | Wahl | Begründung |
|---|---|---|
| Frontend | Netlify oder Vercel, statisches Build | Enthält keine personenbezogenen Daten. Ein CDN ist hier unkritisch |
| Backend | **Render, Region Frankfurt** | EU-Rechenzentrum, AVV verfügbar, verwaltete Cronjobs für 10.4, überschaubarer Betrieb |
| Datenbank | **MongoDB Atlas, `eu-central-1` (Frankfurt)** | AVV verfügbar, automatische Backups, TTL-Indizes |
| E-Mail | Anbieter mit EU-Verarbeitung und AVV | nur transaktional (Verifizierung, Reset, Löschankündigung) |

**Zum Atlas-Tarif**: Der kostenlose M0-Tarif hat keine automatischen Backups und keine Netzwerkisolation. Für ein Produkt mit echten personenbezogenen Daten ist das nicht ausreichend — es braucht mindestens einen Tarif mit Backups und IP-Zugriffsliste. Das ist eine laufende Kostenposition, die vor dem Start bekannt sein sollte.

### 13.3 Eine Instanz, bewusst

Das Rate-Limiting (5.4) und die Cronjob-Ausführung (10.4) gehen von einer Backend-Instanz aus. Das ist für den erwarteten Umfang angemessen und spart einen gemeinsamen Zustandsspeicher. Wird auf mehrere Instanzen skaliert, sind **beide** Stellen anzupassen — der Kommentar im Code sagt das an Ort und Stelle.

### 13.4 CI

Bei jedem Push: Typprüfung über alle Pakete, Lint (inklusive der Reinheitsregel aus 3.2), Tests, Build. Zusätzlich der Rechtsstands-Check aus 12.3. Deploy auf Produktion nur vom Hauptzweig und nur bei grünem Lauf.

## 14. Teststrategie

Nach Wirkung gewichtet, nicht nach Pyramidendogma:

| Ebene | Umfang | Warum |
|---|---|---|
| **Rule-Module und Orchestrator** | dicht, inklusive der Pflichtfälle aus [orchestrator.md](orchestrator.md) Abschnitt 8 und der Testvektoren aus [wohngeld.md](module-specs/wohngeld.md) 6.1 | Hier kostet ein Fehler Geld. Reine Funktionen, schnell zu testen |
| **Referenzdaten** | Konsistenzprüfungen als Test: Anlage-1-Wert plus Komponenten ergibt den Höchstbetrag; Override-Liste gültig; keine Schlüsselkollisionen | Fängt Datenfehler beim Einspielen statt in Produktion |
| **API-Verträge** | je Endpunkt ein Happy-Path und die Fehlerfälle; dazu der Logging-Test aus 11.2 | Sichert die Grenze, an der Client und Server sich treffen |
| **Frontend** | Wizard-Fluss und Report-Darstellung je Status (SPEC 6.5.3); keine Snapshot-Tests | Snapshots brechen bei jeder Designänderung und fangen keine Fehler |
| **End-to-End** | ein Pfad: Wizard vollständig ausfüllen → Report → Konto anlegen → speichern → wieder öffnen | Beweist, dass die Teile zusammenpassen. Mehr E2E lohnt den Pflegeaufwand nicht |

**Was zusätzlich Pflicht ist**: Ein Regressionstest für jeden gefundenen Rechenfehler. Die bisherigen Korrekturen (Wohngeld-Höchstbeträge, Schonvermögen SGB XII, KiZ-Anrechnungssatz, Weingarten-Namensnormalisierung, Hüde/Hude) sind je ein Testfall — sie waren alle nicht offensichtlich und würden bei einer Umstrukturierung sonst unbemerkt zurückkehren.

## 15. Offene Punkte dieses Dokuments

- [ ] **Impressum, Datenschutzerklärung, Nutzungsbedingungen** — vor dem Livegang zwingend. Die Datenschutzerklärung muss die Server-Berechnung (6.2), die Backup-Frist (10.4) und alle Auftragsverarbeiter (10.5) benennen
- [x] **Barrierefreiheit**: Zielniveau **WCAG 2.1 AA, verbindlich** — umgesetzt im Design System ([design-system.md](design-system.md)), Kontraste nachgerechnet und im Token-Kommentar belegt
- [x] **Betreiberfrage** — **entschieden**: Betrieb als **Privatperson**. Konsequenzen, die daraus folgen und vor dem Livegang erledigt sein müssen:
  - Das Impressum nach § 5 DDG nennt Name und **ladungsfähige Anschrift** — die ist damit öffentlich einsehbar. Ein Postfach genügt nicht. Wer das vermeiden will, braucht eine Gewerbeadresse oder einen Ladungsbevollmächtigten
  - Die Auftragsverarbeitungsverträge (10.5) werden auf diesen Namen geschlossen
  - Die Haftung liegt persönlich und unbeschränkt. Der Disclaimer aus SPEC.md 6.5.5 begrenzt sie nicht rechtlich, sondern beschreibt nur den Charakter der Auskunft
  - Bei nennenswerter Nutzung oder Kooperationen ist der Wechsel in eine haftungsbeschränkte Form zu prüfen — später möglich, verlangt dann aber neue AVV
- [ ] **Domain** festlegen. Frontend und API müssen dieselbe registrierbare Domain teilen (`app.` und `api.`), sonst greift `SameSite=Lax` nicht (Abschnitt 9)
- [ ] Kostenrahmen für Atlas-Tarif, Backend-Hosting und E-Mail-Versand beziffern
- [x] **Fehler-Tracking** — **entschieden: ja**, mit strenger Redaction. Ohne erfährt man von Frontend-Fehlern faktisch nie: Wer unter Druck eine Auskunft sucht und einen Fehler sieht, meldet ihn nicht, sondern geht weg. Bedingungen, alle verbindlich:
  - Anbieter mit **EU-Verarbeitung und AVV** (10.5)
  - Die Redaction aus 11.2 greift **vor** dem Versand, nicht im Anbieter-Dashboard: `request.body` und `error.input` werden am Client wie am Server entfernt
  - **Keine Session-Aufzeichnung**, kein Replay, keine automatischen Screenshots — auf einem Wizard mit Einkommensdaten wäre das ein Datenleck mit Aufnahmefunktion
  - Keine IP-Adressen speichern
  - Der Test aus 11.2 deckt den Tracking-Pfad mit ab: ein vollständiger Haushalt durch die API, kein sensibler Wert in der abgehenden Nutzlast
- [ ] Backup-Wiederherstellung einmal proben, bevor es ernst wird
