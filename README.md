# EligibilityCheck

Webanwendung, mit der Privatpersonen in Deutschland prüfen können, ob sich ein Antrag auf eine staatliche Leistung lohnt — und mit welcher Größenordnung sie rechnen können.

> **In Entwicklung. Noch nicht im Betrieb.**
> Diese Anwendung liefert eine unverbindliche Einschätzung, keine rechtsverbindliche Auskunft. Sie ersetzt weder die Beratung durch ein Amt oder eine Sozialberatungsstelle noch die Prüfung im Antragsverfahren. Maßgeblich ist allein die jeweilige Rechtsnorm in ihrer geltenden Fassung.

## Abgedeckte Hilfesysteme

Grundsicherung nach SGB XII · Neue Grundsicherung (SGB II) · Wohngeld · Kinderzuschlag · BAföG · Elterngeld · Unterhaltsvorschuss · Wohnberechtigungsschein

## Stack

React + TypeScript (Vite), Express 5, MongoDB, Node 22 — Monorepo mit npm workspaces. Die gesamte Fachlogik liegt framework-frei in `packages/eligibility` und ist ohne Server und Datenbank testbar.

## Dokumentation

Einstieg: **[PROJEKT.md](PROJEKT.md)** — Wegweiser, Repo-Karte, Werkzeugkette, Stand.

| | |
|---|---|
| [SPEC.md](SPEC.md) | Scope, Nutzerfluss, Fachlogik, Datenmodell |
| [docs/architektur.md](docs/architektur.md) | Systemarchitektur, Auth, Datenhaltung, Betrieb |
| [docs/orchestrator.md](docs/orchestrator.md) | Vorrangregeln zwischen den Hilfesystemen |
| [docs/module-specs/](docs/module-specs/) | Rechenweg je Hilfesystem, mit Fundstellen |
| [docs/konventionen.md](docs/konventionen.md) | Code-Konventionen |
| [data/README.md](data/README.md) | Referenzdaten: Herkunft, Aufbereitung, Prüfung |

## Lizenz

Quellcode: [MIT](LICENSE).

Datensätze unter `data/`: **abweichende Lizenzen**, teils ODbL 1.0 mit Share-alike-Pflicht — siehe [data/LIZENZ.md](data/LIZENZ.md).

Die Postleitzahl- und Gemeindedaten stammen aus der [OpenPLZ API](https://www.openplzapi.org/), © OpenStreetMap-Mitwirkende und Statistisches Bundesamt (Destatis), lizenziert unter [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/). Die Mietenstufen sind ein amtliches Werk nach § 5 UrhG (BMWSB, Anlage zur Wohngeldverordnung).
