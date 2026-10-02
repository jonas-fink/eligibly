# -*- coding: utf-8 -*-
"""Parst das BMWSB-PDF 'Mietenstufen der Gemeinden nach Ländern' in strukturiertes JSON."""
import io, re, json, sys, collections

ROEMISCH = {"I":1,"II":2,"III":3,"IV":4,"V":5,"VI":6,"VII":7}
ZEILE = re.compile(r"^(?P<name>\S.*?)\s{2,}(?P<stufe>I{1,3}|IV|V|VI|VII)\s*$")

def parse(pfad):
    land = None; block = None
    daten = {}          # land -> {"gemeinden": {...}, "kreise": {...}}
    probleme = []
    for nr, roh in enumerate(io.open(pfad, encoding="utf-8"), 1):
        z = roh.rstrip("\n").strip()
        if not z:
            continue
        if z.startswith("Land:"):
            land = z.split(":", 1)[1].strip()
            daten.setdefault(land, {"gemeinden": {}, "kreise": {}})
            block = None
            continue
        if re.match(r"^Gemeinde\s+Mietenstufe$", z):
            block = "gemeinden"; continue
        if re.match(r"^Kreis\s+Mietenstufe$", z):
            block = "kreise"; continue
        if land is None:
            continue                      # Präambel
        m = ZEILE.match(z)
        if not m:
            probleme.append((nr, z)); continue
        if block is None:
            probleme.append((nr, "Zeile ohne Blockkopf: " + z)); continue
        name = m.group("name").strip()
        stufe = ROEMISCH[m.group("stufe")]
        ziel = daten[land][block]
        if name in ziel and ziel[name] != stufe:
            probleme.append((nr, "Widerspruch: %s %s vs %s" % (name, ziel[name], stufe)))
        ziel[name] = stufe
    return daten, probleme

daten, probleme = parse(sys.argv[1])
g = sum(len(v["gemeinden"]) for v in daten.values())
k = sum(len(v["kreise"])    for v in daten.values())
print("Länder: %d | Gemeinden: %d | Kreise: %d | Gesamt: %d" % (len(daten), g, k, g+k))
print("\nJe Land:")
for land, v in daten.items():
    print("  %-24s Gemeinden %4d  Kreise %3d" % (land, len(v["gemeinden"]), len(v["kreise"])))
verteilung = collections.Counter()
for v in daten.values():
    verteilung.update(v["gemeinden"].values()); verteilung.update(v["kreise"].values())
print("\nVerteilung Mietstufen:", dict(sorted(verteilung.items())))
print("\nNicht geparste Zeilen: %d" % len(probleme))
for nr, z in probleme[:25]:
    print("  %5d | %s" % (nr, z))
json.dump(daten, io.open(sys.argv[2], "w", encoding="utf-8"), ensure_ascii=False, indent=1)
