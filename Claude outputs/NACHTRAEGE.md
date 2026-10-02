# Vier Doku-Nachträge

Alle vier sind reines Einfügen bzw. Ersetzen — keine Logik, kein Risiko.

---

## 1. `PROJEKT.md` — Dokumententabelle in Abschnitt 2

**Suchen** (die Zeile zu `data/README.md`):

```
| [data/README.md](data/README.md) | Herkunft, Aufbereitung und Prüfung der Referenzdaten | Referenzdaten neu eingespielt werden |
```

**Danach einfügen**:

```
| [data/LIZENZ.md](data/LIZENZ.md) | Lizenzen der Datensätze und die Pflicht-Namensnennung | eine Datenquelle hinzukommt, ersetzt oder neu abgeleitet wird |
| [README.md](README.md) | öffentliche Startseite des Repositorys | sich Zweck, Stack oder Lizenz ändert |
| [LICENSE](LICENSE) | MIT-Lizenz für den Quellcode | — |
```

---

## 2. `SESSIONS.md` — Eintrag vom 2026-09-09

**Ersetzen** (zwei Zeilen):

```
**Gemacht**: `PROJEKT.md` und `SESSIONS.md` neu; `docs/konventionen.md` neu; `docs/architektur.md` (3, 6.1, 6.2, 8.3) und `SPEC.md` (Kopf, Abschnitt 10, jetzt v0.18) nachgezogen.
```

**durch**:

```
**Gemacht**: `PROJEKT.md`, `SESSIONS.md`, `README.md`, `LICENSE`, `docs/konventionen.md` und `data/LIZENZ.md` neu; `docs/architektur.md` (3, 6.1, 6.2, 8.3) und `SPEC.md` (Kopf, 5.2, Abschnitt 10, jetzt v0.18) nachgezogen.
```

**Ersetzen**:

```
**Offen**: Lizenz- und Quellenangabe für `data/` vor dem ersten öffentlichen Push. Die Livegang-Liste in [docs/architektur.md](docs/architektur.md) 15 ist unverändert offen.
```

**durch**:

```
**Offen**: Die Livegang-Liste in [docs/architektur.md](docs/architektur.md) 15 ist unverändert offen. Die Lizenzfrage ist erledigt — MIT für den Code, ODbL 1.0 für die aus OpenPLZ abgeleiteten Datensätze ([data/LIZENZ.md](data/LIZENZ.md)).
```

---

## 3. `SPEC.md` — neuer Abschnitt 5.2

**Einfügen unmittelbar vor** der Zeile `## 6. Fachliche Logik`:

```markdown
### 5.2 Datenquellen-Seite (entschieden, v0.18)

Eine eigene Seite `/datenquellen`, aus dem Footer jeder Seite verlinkt. Sie nennt für jeden verwendeten Datensatz Herausgeber, Stand, Rechtsgrundlage und Lizenz, dazu den geltenden Rechtsstand der Berechnung.

Das ist **keine Kür, sondern Pflicht**: Die Postleitzahl- und Gemeindedaten stehen unter der ODbL 1.0, die eine Namensnennung dort verlangt, wo die Daten öffentlich genutzt werden — der Betrieb der Anwendung ist eine solche Nutzung. Der wörtliche Hinweistext steht in [data/LIZENZ.md](data/LIZENZ.md) 4.

Der zweite Zweck ist fachlich: Die Mietstufe ist die eine Zahl, bei der Nutzer am ehesten widersprechen werden („meine Stadt ist doch teurer"). Eine nachvollziehbare Quelle ist dort die einzige belastbare Antwort.
```

---

## 4. `data/README.md` — Verweis oben

**Einfügen unmittelbar nach** der ersten Zeile `# Datensätze`:

```markdown

> **Lizenzen**: Diese Datensätze stehen **nicht** unter der MIT-Lizenz des Quellcodes. Die aus der OpenPLZ API abgeleiteten Dateien unterliegen der ODbL 1.0 mit Share-alike- und Namensnennungspflicht — siehe [LIZENZ.md](LIZENZ.md).
```

---

## Danach

Optional in den Änderungs-Absatz „Änderungen gegenüber v0.17" im Kopf von `SPEC.md` ergänzen:

```
Datenquellen-Seite als Pflichtbestandteil der UI festgelegt (5.2, ODbL-Namensnennung); Lizenzen geklärt (MIT für den Code, ODbL 1.0 für die abgeleiteten Datensätze).
```
