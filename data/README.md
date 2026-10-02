# Datensätze

> **Lizenzen**: Diese Datensätze stehen **nicht** unter der MIT-Lizenz des Quellcodes. Die aus der OpenPLZ API abgeleiteten Dateien unterliegen der ODbL 1.0 mit Share-alike- und Namensnennungspflicht — siehe [LIZENZ.md](LIZENZ.md).

Rohdaten und daraus erzeugte Konstanten-Sets. Alles hier ist **abgeleitet** — die Skripte in `scripts/` erzeugen die JSON-Dateien reproduzierbar aus den Quelldateien. Bei einer neuen Fassung wird das Skript erneut ausgeführt, nicht die JSON von Hand editiert.

## `mietstufen-2023.json`

Mietenstufen der Gemeinden und Kreise, Grundlage für den Wohngeld-Höchstbetrag (siehe [wohngeld.md](../docs/module-specs/wohngeld.md) 4.1 und 4.4).

**Quelle**: `mietstufen-2023.pdf` (im selben Verzeichnis) — BMWSB, „Mietenstufen der Gemeinden nach Ländern ab 1. Januar 2023", veröffentlicht 04.05.2023, Rechtsgrundlage ist die Anlage zur Wohngeldverordnung. Datengrundlage der Einstufung ist die Wohngeldstatistik 2019/2020, Gebietsstand 31.03.2021.

**Stand**: Zum Zeitpunkt der Extraktion (07.09.2026) war keine neuere amtliche Fassung auffindbar. Die Einstufung gilt damit seit 2023 unverändert — das ist vor einem Livegang erneut zu prüfen, weil die Mietenstufen periodisch neu festgesetzt werden.

**Umfang**: 1.601 Gemeinden und 279 Kreise in 16 Ländern.

### Struktur

```jsonc
{
  "quelle":  { /* Herkunft, Rechtsgrundlage, Gültigkeit */ },
  "regeln":  { "kreisFallback": "...", "inselnOhneFestlandanschluss": 5 },
  "laender": {
    "Hessen": {
      "gemeinden": { "kassel": { "name": "Kassel, Stadt", "normalisiert": "Kassel", "mietstufe": 3 } },
      "kreise":    { "fulda":  { "name": "Fulda",         "normalisiert": "Fulda",  "mietstufe": 2 } }
    }
  }
}
```

Der Objektschlüssel (`kassel`) ist ein normalisierter Vergleichsschlüssel: kleingeschrieben, Statuszusätze entfernt, Umlaute und Sonderzeichen aufgelöst. `name` ist der unveränderte Wortlaut aus dem PDF und bleibt als Beleg erhalten.

### Nachschlagereihenfolge

Verbindlich, in dieser Reihenfolge:

1. Liegt die Gemeinde auf einer **Insel ohne Festlandanschluss** → Mietstufe 5. Steht so als bundesweite Sonderregel am Ende des Quelldokuments und geht allem anderen vor.
2. Gemeinde in `laender[land].gemeinden` → deren Mietstufe.
3. Sonst Kreis der Gemeinde in `laender[land].kreise` → dessen Mietstufe. Das Quelldokument sagt dazu ausdrücklich: „Soweit die zu einem Kreis gehörenden Gemeinden in den Tabellen nicht gesondert aufgeführt sind, gilt die Mietenstufe des Kreises für diese Gemeinden."
4. Sonst → `nicht_pruefbar` mit Datenlücken-Eintrag. **Nicht** raten und **nicht** auf einen Mittelwert ausweichen: Die Mietstufe geht linear in den Höchstbetrag und damit in den Auszahlbetrag ein.

Schritt 3 setzt voraus, dass zu jeder Gemeinde ihr Kreis bekannt ist — das leistet dieser Datensatz nicht, dafür wird das Gemeindeverzeichnis gebraucht (siehe unten).

### Bekannte Fallstricke

- **Statuszusätze sind uneinheitlich.** Das PDF schreibt „Kassel, Stadt", das amtliche Gemeindeverzeichnis „Kassel, documenta-Stadt"; München steht ganz ohne Zusatz, Stuttgart als „Landeshauptstadt", Hamburg als „Freie und Hansestadt". Ein Abgleich über den unveränderten Namen scheitert deshalb — dafür ist der normalisierte Schlüssel da.
- **Geografische Zusätze sind keine Statuszusätze.** Baden-Württemberg hat zwei Weingarten: „Weingarten, Baden" (Mietstufe III) und „Weingarten, Stadt" (Mietstufe V). Wird „, Baden" beim Normalisieren mit entfernt, überschreiben sich beide stillschweigend. Die Kollisionsprüfung in `build-mietstufen.py` fängt genau das ab und muss bei jeder Änderung an der Suffixliste grün bleiben.
- **Gleiche Namen für Stadt und Kreis** sind normal (München, Rosenheim). Gemeinden und Kreise liegen deshalb in getrennten Objekten; sie dürfen nie in einen gemeinsamen Namensraum gemischt werden.

## Noch fehlend: Gemeindeverzeichnis mit amtlichem Gemeindeschlüssel

Für die Zuordnung PLZ → Gemeinde → Kreis fehlt ein zweiter Datensatz. Gebraucht wird eine Tabelle mit Postleitzahl, Gemeindename, amtlichem Gemeindeschlüssel (AGS), Kreis und Land.

Geeignete Quelle: die Rohdaten der [OpenPLZ API](https://www.openplzapi.org/) (Repository `openpotato/openplzapi.data`, ODbL, Basis sind die vierteljährlichen Post-Daten und die Gemeindeleitdatei des Statistischen Bundesamtes). Die API liefert je Postleitzahl Gemeindename, AGS, Kreis und Land.

Das amtliche Gemeindeverzeichnis GV-ISys des Statistischen Bundesamtes reicht **nicht**: Es führt nur die Postleitzahl des Verwaltungssitzes je Gemeinde und taugt damit nicht für die Richtung PLZ → Gemeinde.

Sobald der Datensatz vorliegt, erzeugt ein weiteres Skript die endgültige, nach AGS indizierte Nachschlagetabelle und einen Abdeckungsbericht: Welche Einträge aus dem Mietstufen-PDF ließen sich keiner Gemeinde zuordnen, und für welche Gemeinden greift weder ein eigener Eintrag noch ein Kreiseintrag. Beides sind Fehlerquellen, die vor dem Livegang bekannt sein müssen.

## Skripte

| Skript | Zweck |
|---|---|
| `scripts/parse-mietstufen.py` | liest den mit `pdftotext -layout` erzeugten Text und gibt die Rohstruktur je Land aus |
| `scripts/build-mietstufen.py` | normalisiert Namen, prüft auf Schlüsselkollisionen und schreibt `mietstufen-2023.json` |

```sh
pdftotext -layout mietstufen-2023.pdf ms.txt
python3 scripts/parse-mietstufen.py ms.txt ms_roh.json
python3 scripts/build-mietstufen.py        # erwartet ms_roh.json im Arbeitsverzeichnis
```

Beide Skripte melden, was sie nicht verarbeiten konnten. Beim Stand von 2023 sind das genau zwei Zeilen — die Kopfzeile und der Eintrag der bundesweiten Inselregel, die als `regeln.inselnOhneFestlandanschluss` gesondert abgebildet ist.

## `plz-gemeinden.csv`, `mietstufen-lookup.json`, `plz-index.json`

**Stand 07.09.2026: vollständig, 100 % Abdeckung.** 10.712 Gemeinden, 398 Kreise, 8.159 Postleitzahlen. Jede Gemeinde hat eine Mietstufe, kein Eintrag aus dem BMWSB-PDF blieb unzugeordnet.

Die Zuordnung Postleitzahl → Gemeinde → Kreis wird nicht von Hand gepflegt, sondern mit `scripts/fetch-plz-gemeinden.py` von der [OpenPLZ API](https://www.openplzapi.org/) geholt (ODbL; Basis sind die vierteljährlichen Post-Daten und die Gemeindeleitdatei des Statistischen Bundesamtes).

```sh
python3 data/scripts/fetch-plz-gemeinden.py            # alle 16 Länder
python3 data/scripts/fetch-plz-gemeinden.py --land 06  # nur Hessen, zum Ausprobieren
```

Nur Standardbibliothek, kein Paket nötig. Das Skript blättert je Bundesland durch den Endpunkt `/de/FederalStates/{key}/Localities`, wiederholt bei Zeitüberschreitung und Rate-Limit und meldet am Ende Zeilen-, Gemeinde- und Postleitzahlzahl.

**`pageSize` ist auf 50 begrenzt** — das OpenAPI-Schema des Endpunkts sagt `"maximum": 50, "minimum": 1` bei Standard 10. Größere Werte beantwortet die API mit HTTP 400. Bei rund 16.000 Zeilen sind das etwa 320 Anfragen; mit der Standardpause von 0,2 s läuft der Abruf zwei bis drei Minuten. Meldet die API trotzdem einen Fehler, gibt das Skript ihren Antworttext im Klartext aus — der nennt in der Regel den beanstandeten Parameter. Mit `--debug` steht zusätzlich jede angefragte URL daneben. Zu erwarten sind rund 11.000 Gemeinden und rund 8.200 Postleitzahlen — weichen die Zahlen stark ab, war der Abruf unvollständig und darf nicht weiterverarbeitet werden.

Danach:

```sh
python3 data/scripts/build-mietstufen-lookup.py
```

Das erzeugt `mietstufen-lookup.json` (amtlicher Gemeindeschlüssel → Mietstufe) und `plz-index.json` (Postleitzahl → Gemeindeschlüssel) und gibt den Abdeckungsbericht aus.

### Das Matching läuft in vier Durchgängen

Nötig, weil PDF und amtliches Verzeichnis unterschiedliche Namenskonventionen benutzen.

0. **Geprüfte Overrides** aus `mietstufen-overrides.json` — 59 Gemeinden und 6 Kreise, die kein Automatismus zuverlässig findet.
1. **Exakter Treffer** auf dem normalisierten Namen. Deckt den Regelfall ab, auch „Kassel, Stadt" ↔ „Kassel, documenta-Stadt".
2. **Basisname**, also ohne geografischen Zusatz in Klammern oder nach Komma — aber nur gegen PDF-Einträge, die in Durchgang 1 noch nicht vergeben wurden, und nur bei Eindeutigkeit.
3. **Kreis-Fallback** nach der Regel des Quelldokuments.

Ergebnis der Durchgänge: 59 Overrides, 1.349 exakt, 200 über Basisnamen, 9.104 über den Kreis.

Bleibt danach etwas offen, wird es gemeldet und die Gemeinde liefert `nicht_pruefbar`. Es wird nicht geraten.

Warum die Reihenfolge in Durchgang 2 zählt, zeigt der Testfall Weingarten: Das amtliche Verzeichnis kennt „Weingarten (Baden)" und „Weingarten (Württemberg)", das PDF „Weingarten, Baden" (Mietstufe III) und „Weingarten, Stadt" (Mietstufe V). „Weingarten (Baden)" trifft in Durchgang 1 exakt. Erst dadurch bleibt in Durchgang 2 für „Weingarten (Württemberg)" genau ein Kandidat übrig. Ohne diese Reihenfolge wäre der Basisname mehrdeutig, die Gemeinde fiele auf ihren Kreis zurück — und bekäme Mietstufe II statt V. Drei Stufen daneben, ohne jede Fehlermeldung.

### Umlaute werden ausgeschrieben, nicht entwertet

Der Vergleichsschlüssel bildet ä→ae, ö→oe, ü→ue, ß→ss ab, statt den Umlautpunkt zu entfernen. Zwei Gründe, beide aus echten Fehlern gelernt:

- Das PDF schreibt Umlaute uneinheitlich — mal „Oehringen", mal „Öhringen". Würde man nur den Umlautpunkt entfernen („ohringen"), passt keine der beiden Schreibweisen zur anderen.
- Umgekehrt verschmelzen beim Entwerten verschiedene Gemeinden: **Hüde** (Kreis Diepholz) und **Hude (Oldenburg)** (Kreis Oldenburg) ergäben beide „hude". In einem früheren Lauf bekam Hüde dadurch die Mietstufe von Hude zugewiesen.

Zusätzlich wird „Sankt" auf „St." normalisiert (Sankt Wendel, Sankt Ingbert).

### `mietstufen-overrides.json` — die geprüfte Zuordnungsliste

59 Gemeinden und 6 Kreise, bei denen PDF und amtliches Verzeichnis nicht automatisch zusammenfinden. Verteilung der Ursachen: 37 Abkürzungen („Gemünden am Main" ↔ „Gemünden a.Main"), 9 sorbische Doppelnamen („Bautzen" ↔ „Bautzen / Budyšin"), 4 Namensänderungen („Arolsen" ↔ „Bad Arolsen", Landkreis „Soltau-Fallingbostel" ↔ „Heidekreis"), 4 Namenszusätze nur auf einer Seite, 2 Tippfehler im PDF („Phillipsburg" statt Philippsburg, „Bad Schönbohm" statt Bad Schönborn).

**Warum von Hand und nicht per Ähnlichkeitsmaß**: Ein Ähnlichkeitsabgleich (difflib) über dieselben Einträge lieferte vier grob falsche Treffer — „Müllheim → Mundelsheim", „Senftenberg → Schenkenberg", „Frankenberg (Eder) → Battenberg (Eder)" und „Reichenbach/Vogtl. → Reichenbach/O.L." (Oberlausitz statt Vogtland, anderer Landkreis). Solche Treffer sehen im Bericht unauffällig aus und wären mit einer falschen Mietstufe in die Produktivdaten gegangen.

Das Skript `scripts/vorschlag-overrides.py` erzeugt Kandidatenvorschläge für neue Fälle — es schreibt die Liste **nicht** selbst, sondern dient der manuellen Prüfung.

**Die Liste wird bei jedem Lauf validiert.** Für jeden Eintrag wird geprüft, ob der amtliche Gemeindeschlüssel im PLZ-Datensatz existiert, ob der PDF-Eintrag noch im Mietstufen-Datensatz steht und ob der hinterlegte amtliche Name mit dem im Datensatz übereinstimmt. Schlägt eines fehl, meldet der Bericht das prominent — so fällt auf, wenn ein neuer Datenstand die Liste veraltet.

### Der Abdeckungsbericht ist der eigentliche Prüfschritt

Er nennt vier Dinge:

1. **Gemeinden ohne Mietstufe** — liefern `nicht_pruefbar`. Sichtbare Lücke, unkritisch.
2. **Nicht zugeordnete Gemeindeeinträge aus dem PDF** — die kritische Zahl. Jeder davon bedeutet, dass eine Gemeinde, für die eine eigene Mietstufe festgesetzt ist, stattdessen die ihres Kreises bekommt. Nicht getroffene *Kreis*einträge sind dagegen meist harmlos: Dort sind schlicht alle Gemeinden einzeln aufgeführt.
3. **Über Basisnamen zugeordnete Gemeinden** — stichprobenhaft prüfen, das ist der unsicherste der drei Durchgänge.
4. **Mehrdeutige Postleitzahlen mit abweichender Mietstufe** — nur bei diesen muss der Wizard die Gemeinde abfragen; bei allen anderen genügt die Postleitzahl. Die Zahl entscheidet, wie oft die Rückfrage im Wizard überhaupt auftaucht.

### `inseln-ohne-festlandanschluss.json` — die Sonderregel

Die Anlage zur WoGV weist Inseln ohne Festlandanschluss eine **gemeinsame Mietenstufe V** zu. Diese Regel ist keine Redundanz zur Gemeindeliste, sondern trägt einen erheblichen Teil des Ergebnisses:

| Gemeinden | ohne die Regel | mit der Regel |
|---|---|---|
| Borkum, Juist, Norderney, Baltrum, Langeoog, Spiekeroog, Wangerooge | Stufe 1 (Kreis) | **5** |
| Föhr und Amrum (15 Gemeinden) | Stufe 1 (Kreis) | **5** |
| Hallig Hooge, Langeneß, Pellworm | Stufe 1 (Kreis) | **5** |
| Hörnum, Kampen, List, Wenningstedt-Braderup (Sylt) | Stufe 1 (Kreis) | **5** |
| Helgoland | Stufe 4 (Kreis Pinneberg) | **5** |
| Insel Hiddensee | Stufe 2 (Kreis) | **5** |
| Gemeinde Sylt | Stufe 5 (eigener PDF-Eintrag) | 5 — unverändert |

Von 32 Inselgemeinden hat genau **eine** einen eigenen Eintrag im BMWSB-PDF: die Gemeinde Sylt, ohnehin mit Stufe V. Alle übrigen liegen unter der 10.000-Einwohner-Schwelle, sind deshalb nicht einzeln aufgeführt und würden sonst den ländlichen Kreiswert erben — bei den ostfriesischen Inseln und Föhr/Amrum vier Stufen zu niedrig.

**Vorrang**: Die Inselregel läuft als erster Durchgang, vor Overrides, Gemeinde- und Kreis-Treffern. Führt das PDF für eine Inselgemeinde eine abweichende eigene Stufe, meldet der Bericht das als Konflikt — derzeit tritt kein solcher Fall auf.

**Bewusst nicht enthalten**: Nordstrand und Insel Poel (Damm), Fehmarn (Brücke, zudem eigener PDF-Eintrag mit Stufe III), Gemeinden auf Rügen und Usedom (Brücken). Hallig Oland und Nordstrandischmoor sind keine eigenen Gemeinden — sie gehören zu Langeneß beziehungsweise Pellworm und sind darüber abgedeckt. Neuwerk gehört zu Hamburg.

**Bekannte Lücke**: Hallig **Gröde** (AGS 01054039) fehlt im OpenPLZ-Datensatz — rund neun Einwohner, offenbar ohne eigenen Orts-Eintrag. Ohne PLZ-Eintrag kann das Modul sie nicht auflösen; sie liefert `nicht_pruefbar`.

**Vorbehalt**: Welche Insel als „ohne Festlandanschluss" gilt, entscheidet die Wohngeldbehörde. Die Liste bildet den Stand der Recherche ab und ist vor dem Livegang fachlich abzunehmen; die Abgrenzungsfälle sind in der Datei einzeln begründet.
