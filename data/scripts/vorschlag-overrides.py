# -*- coding: utf-8 -*-
import csv, io, json, difflib, collections, importlib.util
src = io.open("data/scripts/build-mietstufen-lookup.py", encoding="utf-8").read().split("def main(")[0]
bl = type("m", (), {})()
bl.__dict__["__file__"] = "data/scripts/build-mietstufen-lookup.py"
exec(compile(src, "bl", "exec"), bl.__dict__)

ms = json.load(io.open("data/mietstufen-2023.json", encoding="utf-8"))
rows = list(csv.DictReader(io.open("data/plz-gemeinden.csv", encoding="utf-8")))
gem = {}
for r in rows:
    if r["municipalityKey"]:
        gem[r["municipalityKey"]] = (r["municipalityName"], r["federalStateName"], r["districtName"])

getroffen = collections.defaultdict(set)
for ags, (name, land, dn) in gem.items():
    L = ms["laender"].get(land)
    if not L: continue
    k = bl.schluessel(name)
    if k in L["gemeinden"]: getroffen[land].add(k); continue
    b = bl.basis_schluessel(name)
    frei = [y for y in L["gemeinden"] if bl.basis_schluessel(L["gemeinden"][y]["name"]) == b]
    if len(frei) == 1: getroffen[land].add(frei[0])

zeilen = []
for land, L in ms["laender"].items():
    kandidaten = {a: bl.schluessel(n) for a, (n, l, d) in gem.items() if l == land}
    for k in sorted(set(L["gemeinden"]) - getroffen[land]):
        pdfname = L["gemeinden"][k]["name"]
        ziel = bl.schluessel(pdfname)
        treffer = difflib.get_close_matches(ziel, list(kandidaten.values()), n=3, cutoff=0.72)
        best = None
        if treffer:
            ags = [a for a, s in kandidaten.items() if s == treffer[0]]
            if len(ags) == 1:
                best = ags[0]
        score = difflib.SequenceMatcher(None, ziel, treffer[0]).ratio() if treffer else 0
        zeilen.append((land, k, pdfname, L["gemeinden"][k]["mietstufe"],
                       best, gem[best][0] if best else None, gem[best][2] if best else None, score))

zeilen.sort(key=lambda z: -z[7])
print("%-5s %-38s %-9s %-38s %s" % ("Sim", "PDF-Eintrag", "AGS", "amtlicher Name", "Kreis"))
print("="*130)
for land, k, pdf, stufe, ags, amt, kreis, sc in zeilen:
    print("%.2f  %-38s %-9s %-38s %s" % (sc, pdf[:38], ags or "—", (amt or "KEIN TREFFER")[:38], kreis or ""))
print("\n%d Einträge, davon %d mit Kandidat" % (len(zeilen), sum(1 for z in zeilen if z[4])))
json.dump([{"land": z[0], "pdfKey": z[1], "pdfName": z[2], "mietstufe": z[3],
            "ags": z[4], "amtlich": z[5], "kreis": z[6], "sim": round(z[7], 3)} for z in zeilen],
          io.open("/tmp/kandidaten.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
