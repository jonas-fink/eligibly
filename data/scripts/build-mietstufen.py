# -*- coding: utf-8 -*-
import io, json, re, collections, unicodedata

SUFFIXE = r"(Stadt\.?|Markt|M\.|Universitätsstadt|Landeshauptstadt|Kreisstadt|Hansestadt|" \
          r"Freie und Hansestadt|Flecken|Lutherstadt|documenta-Stadt|Bergstadt|" \
          r"Wissenschaftsstadt|Hochschulstadt|Domstadt|Barlachstadt|Seehafenstadt)"
# ACHTUNG: geografische Zusaetze wie ", Baden" oder ", Wuerttemberg" duerfen NICHT
# entfernt werden - sie unterscheiden gleichnamige Gemeinden (z. B. die beiden
# Weingarten in Baden-Wuerttemberg mit Mietstufe III bzw. V).

def normalisiere(name):
    n = name.strip()
    n = re.sub(r",\s*" + SUFFIXE + r"\s*$", "", n)      # nur bekannte Statuszusätze entfernen
    n = n.replace("’", "'")
    n = re.sub(r"\ba\.\s*d\.\s*", "a.d.", n)            # "a. d. Saale" -> "a.d.Saale"
    n = re.sub(r"\bi\.\s*d\.\s*", "i.d.", n)
    n = re.sub(r"\ba\.\s*", "a.", n)
    n = re.sub(r"\s+", " ", n).strip()
    return n

UMLAUTE = [("ä", "ae"), ("ö", "oe"), ("ü", "ue"), ("ß", "ss"), ("é", "e"), ("è", "e")]


def schluessel(name):
    """Vergleichsschluessel. Umlaute werden AUSGESCHRIEBEN, nicht entwertet.

    Das BMWSB-PDF schreibt Umlaute uneinheitlich — mal "Oehringen", mal "Öhringen".
    Wuerde man nur den Umlautpunkt entfernen ("ohringen"), passt keine der beiden
    Schreibweisen zur anderen. Zugleich verschmelzen dabei verschiedene Gemeinden:
    "Hüde" (Kreis Diepholz) und "Hude" (Kreis Oldenburg) ergaeben beide "hude".
    Die Transliteration ue/oe/ae loest beides auf einmal.
    """
    s = normalisiere(name).lower()
    for a, b in UMLAUTE:
        s = s.replace(a, b)
    s = re.sub(r"\bsankt\b", "st", s)      # "Sankt Wendel" == "St. Wendel"
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]", "", s)

roh = json.load(io.open("ms_roh.json", encoding="utf-8"))
out = {
  "quelle": {
    "titel": "Mietenstufen der Gemeinden nach Ländern ab 1. Januar 2023",
    "herausgeber": "Bundesministerium für Wohnen, Stadtentwicklung und Bauwesen (BMWSB)",
    "datei": "mietstufen-2023.pdf", "veroeffentlicht": "2023-05-04",
    "rechtsgrundlage": "Anlage zur Wohngeldverordnung (WoGV)",
    "gueltigAb": "2023-01-01",
    "datengrundlage": "Wohngeldstatistik 31.12.2019 und 31.12.2020 (inkl. rückwirkender Bewilligungen bis 31.03.2021); Gebietsstand 31.03.2021",
    "extrahiert": "2026-09-07"
  },
  "regeln": {
    "kreisFallback": "Ist eine Gemeinde nicht gesondert aufgeführt, gilt die Mietenstufe ihres Kreises.",
    "inselnOhneFestlandanschluss": 5
  },
  "laender": {}
}
kollisionen = []
for land, v in roh.items():
    eintrag = {"gemeinden": {}, "kreise": {}}
    for blk in ("gemeinden", "kreise"):
        seen = {}
        for name, stufe in v[blk].items():
            k = schluessel(name)
            if k in seen and seen[k][1] != stufe:
                kollisionen.append((land, blk, seen[k][0], name, seen[k][1], stufe))
            seen[k] = (name, stufe)
            eintrag[blk][k] = {"name": name, "normalisiert": normalisiere(name), "mietstufe": stufe}
    out["laender"][land] = eintrag

g = sum(len(v["gemeinden"]) for v in out["laender"].values())
k = sum(len(v["kreise"]) for v in out["laender"].values())
print("Gemeinden %d | Kreise %d | Gesamt %d" % (g, k, g + k))
print("Schlüsselkollisionen mit abweichender Stufe: %d" % len(kollisionen))
for c in kollisionen: print("   ", c)

print("\nStichprobe Normalisierung:")
for land, blk, name in [("Hessen","gemeinden","Kassel, Stadt"),("Bayern","gemeinden","München"),
                        ("Hamburg","gemeinden","Hamburg, Freie und Hansestadt"),
                        ("Baden-Württemberg","gemeinden","Stuttgart, Landeshauptstadt"),
                        ("Bayern","gemeinden","Bad Neustadt a. d. Saale, Stadt"),
                        ("Baden-Württemberg","gemeinden","Eislingen/Fils, Stadt")]:
    print("  %-34s -> %-26s key=%s" % (name, normalisiere(name), schluessel(name)))

json.dump(out, io.open("mietstufen-2023.json","w",encoding="utf-8"), ensure_ascii=False, indent=1)
print("\ngeschrieben: mietstufen-2023.json")
