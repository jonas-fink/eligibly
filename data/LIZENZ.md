# Lizenz und Herkunft der Datensätze

Der Quellcode dieses Repositorys steht unter der MIT-Lizenz ([LICENSE](../LICENSE)). **Für die Dateien in diesem Verzeichnis gilt das nicht.** Sie stammen aus fremden Quellen mit eigenen Lizenzbedingungen — eine davon mit Share-alike-Pflicht.

Keine Rechtsberatung. Die Einordnung unten ist nach bestem Wissen erstellt; im Zweifel gilt der Lizenztext der jeweiligen Quelle.

---

## Überblick

| Datei | Herkunft | Lizenz |
|---|---|---|
| `mietstufen-2023.pdf` | BMWSB, Anlage zur Wohngeldverordnung | amtliches Werk, § 5 UrhG |
| `mietstufen-2023.json` | Extraktion aus dem PDF | amtliches Werk, § 5 UrhG |
| `plz-gemeinden.csv` | OpenPLZ API | **ODbL 1.0** |
| `plz-index.json` | abgeleitet aus `plz-gemeinden.csv` | **ODbL 1.0** |
| `mietstufen-lookup.json` | Zusammenführung PDF-Daten + OpenPLZ | **ODbL 1.0** |
| `mietstufen-overrides.json` | manuelle Zuordnung gegen OpenPLZ-Namen | **ODbL 1.0** |
| `inseln-ohne-festlandanschluss.json` | Gemeindeschlüssel aus OpenPLZ, Regel aus der WoGV | **ODbL 1.0** |
| Build-Artefakte für den `ReferenzdatenPort` | abgeleitet aus den obigen | **ODbL 1.0** |

---

## 1. Mietenstufen — amtliches Werk

`mietstufen-2023.pdf` ist die vom Bundesministerium für Wohnen, Stadtentwicklung und Bauwesen (BMWSB) veröffentlichte Fassung der Anlage zur Wohngeldverordnung („Mietenstufen der Gemeinden nach Ländern ab 1. Januar 2023", veröffentlicht am 04.05.2023). Als Bestandteil einer Rechtsverordnung ist der Inhalt ein amtliches Werk nach § 5 Abs. 1 UrhG und damit gemeinfrei — er darf wiedergegeben und weiterverarbeitet werden.

§ 62 UrhG verlangt dabei, den Text unverändert wiederzugeben. Die Extraktion nach `mietstufen-2023.json` ändert die Form, nicht den Inhalt; Abweichungen von der Vorlage sind in [README.md](README.md) dokumentiert und über die Skripte reproduzierbar.

## 2. Postleitzahlen und Gemeinden — ODbL 1.0

`plz-gemeinden.csv` stammt aus der [OpenPLZ API](https://www.openplzapi.org/) (Rohdaten: [openpotato/openplzapi.data](https://github.com/openpotato/openplzapi.data)), abgerufen mit `scripts/fetch-plz-gemeinden.py`. Diese Daten stehen unter der **Open Database License (ODbL) 1.0**. Sie beruhen auf dem OpenStreetMap-Projekt sowie der Gemeindeleitdatei GV100AD des Statistischen Bundesamtes und den Postleitzahl-Änderungen der Deutschen Post.

**Die ODbL ist eine Share-alike-Lizenz für Datenbanken.** Daraus folgt für dieses Projekt:

- Jede Datei, die die Gemeindezuordnung aus OpenPLZ enthält oder daraus abgeleitet ist, ist eine abgeleitete Datenbank und steht **ebenfalls unter ODbL 1.0**. Das betrifft ausdrücklich auch `mietstufen-lookup.json`: Die Mietstufen selbst sind gemeinfrei, die Verknüpfung mit Gemeindeschlüssel, Kreis und Land ist es nicht.
- Wird die abgeleitete Datenbank öffentlich genutzt — und der Betrieb der Anwendung ist eine öffentliche Nutzung —, muss sie unter denselben Bedingungen verfügbar sein. Dieses Repository erfüllt das, solange es öffentlich bleibt.
- Die Namensnennung ist Pflicht, **auch in der laufenden Anwendung** (siehe 4).

Der Lizenztext: https://opendatacommons.org/licenses/odbl/1-0/

## 3. Gemeindeleitdatei — mittelbare Quelle

Die amtlichen Gemeindeschlüssel gehen auf die Gemeindeleitdatei GV100AD des Statistischen Bundesamtes (Destatis) zurück. Sie erreichen dieses Projekt nicht direkt, sondern über die OpenPLZ API; maßgeblich ist deshalb deren ODbL. Destatis wird in der Namensnennung mitgeführt.

## 4. Pflicht-Namensnennung

Dieser Hinweis gehört auf die Datenquellen-Seite der Anwendung (aus dem Footer verlinkt) und in jede Weitergabe der Datensätze:

> **Datenquellen**
>
> Mietenstufen: Bundesministerium für Wohnen, Stadtentwicklung und Bauwesen, Anlage zur Wohngeldverordnung, Stand 1. Januar 2023 — amtliches Werk (§ 5 UrhG).
>
> Postleitzahlen und Gemeindezuordnung: [OpenPLZ API](https://www.openplzapi.org/), © OpenStreetMap-Mitwirkende und Statistisches Bundesamt (Destatis), lizenziert unter [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/). Die in dieser Anwendung verwendeten abgeleiteten Datensätze stehen ebenfalls unter ODbL 1.0 und sind unter [Repository-URL] abrufbar.

Die Platzhalter-URL wird gesetzt, sobald Repository und Domain feststehen.

## 5. Keine Gewähr

Die Datensätze werden ohne jede Gewähr bereitgestellt. Sie sind für die Nutzung in dieser Anwendung aufbereitet und geprüft (Verfahren und bekannte Fallstricke: [README.md](README.md)), aber weder amtlich noch vollständig fehlerfrei. Maßgeblich ist allein die jeweilige Rechtsnorm in ihrer geltenden Fassung.
