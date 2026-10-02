#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Verbindet mietstufen-2023.json mit plz-gemeinden.csv zu einer nach amtlichem
Gemeindeschlüssel indizierten Nachschlagetabelle und erzeugt einen Abdeckungsbericht.

Aufruf:
    python3 data/scripts/build-mietstufen-lookup.py

Ausgabe:
    data/mietstufen-lookup.json      AGS -> Mietstufe (+ Herkunft der Zuordnung)
    data/plz-index.json              PLZ -> Liste der Gemeindeschlüssel
    Abdeckungsbericht auf stdout
"""
import csv, io, json, os, re, sys, unicodedata, collections

HIER = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.abspath(os.path.join(HIER, ".."))

# Muss mit build-mietstufen.py identisch bleiben.
SUFFIXE = r"(Stadt\.?|Markt|M\.|Universitätsstadt|Landeshauptstadt|Kreisstadt|Hansestadt|" \
          r"Freie und Hansestadt|Flecken|Lutherstadt|documenta-Stadt|Bergstadt|" \
          r"Wissenschaftsstadt|Hochschulstadt|Domstadt|Barlachstadt|Seehafenstadt)"


def normalisiere(name):
    n = name.strip()
    n = re.sub(r",\s*" + SUFFIXE + r"\s*$", "", n)
    n = n.replace("’", "'")
    n = re.sub(r"\ba\.\s*d\.\s*", "a.d.", n)
    n = re.sub(r"\bi\.\s*d\.\s*", "i.d.", n)
    n = re.sub(r"\ba\.\s*", "a.", n)
    return re.sub(r"\s+", " ", n).strip()


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


def basis_schluessel(name):
    """Schluessel ohne geografischen Zusatz in Klammern oder nach Komma.

    "Weingarten (Wuerttemberg)" -> "weingarten", "Weingarten, Baden" -> "weingarten".
    NUR fuer den zweiten Matching-Durchgang und nur bei Eindeutigkeit verwenden:
    Baden-Wuerttemberg hat zwei Weingarten mit Mietstufe 5 und 3.
    """
    n = normalisiere(name)
    n = re.sub(r"\s*\([^)]*\)\s*$", "", n)     # "(Wuerttemberg)"
    n = re.sub(r",\s*[^,]+$", "", n)            # ", Baden"
    return schluessel(n)


def main():
    ms_pfad  = os.path.join(DATA, "mietstufen-2023.json")
    plz_pfad = os.path.join(DATA, "plz-gemeinden.csv")
    if not os.path.exists(plz_pfad):
        sys.exit("Fehlt: %s — zuerst fetch-plz-gemeinden.py ausführen." % plz_pfad)

    ms = json.load(io.open(ms_pfad, encoding="utf-8"))
    insel_stufe = ms["regeln"]["inselnOhneFestlandanschluss"]

    gemeinden = {}          # ags -> {name, land, kreisKey, kreisName, plz:set}
    with io.open(plz_pfad, encoding="utf-8") as f:
        for r in csv.DictReader(f):
            ags = r["municipalityKey"]
            if not ags:
                continue
            g = gemeinden.setdefault(ags, {
                "name": r["municipalityName"], "land": r["federalStateName"],
                "kreisKey": r["districtKey"], "kreisName": r["districtName"], "plz": set()})
            if r["postalCode"]:
                g["plz"].add(r["postalCode"])

    lookup, herkunft = {}, collections.Counter()
    ohne, ueber_basisnamen = [], []
    getroffene_g = collections.defaultdict(set)
    getroffene_k = collections.defaultdict(set)

    # --- Durchgang -1: Inseln ohne Festlandanschluss --------------------------
    # Gemeinsame Mietenstufe nach der Anlage zur WoGV; geht der Kreis-Einstufung vor.
    insel_pfad = os.path.join(DATA, "inseln-ohne-festlandanschluss.json")
    inseln, insel_probleme, insel_konflikte = {}, [], []
    if os.path.exists(insel_pfad):
        _i = json.load(io.open(insel_pfad, encoding="utf-8"))
        insel_stufe_regel = _i["mietstufe"]
        for ags, o in _i["gemeinden"].items():
            g = gemeinden.get(ags)
            if g is None:
                insel_probleme.append((ags, o["name"], "AGS nicht im PLZ-Datensatz"))
                continue
            if schluessel(o["name"]) != schluessel(g["name"]):
                insel_probleme.append((ags, o["name"],
                    "Name weicht ab: Liste '%s' vs. Datensatz '%s'" % (o["name"], g["name"])))
                continue
            # Konflikt melden, wenn das PDF fuer diese Gemeinde eine ANDERE Stufe fuehrt
            land = ms["laender"].get(g["land"])
            kg = schluessel(g["name"])
            if land and kg in land["gemeinden"]:
                eigen = land["gemeinden"][kg]["mietstufe"]
                if eigen != insel_stufe_regel:
                    insel_konflikte.append((ags, g["name"], eigen, insel_stufe_regel))
            lookup[ags] = {"mietstufe": insel_stufe_regel, "quelle": "insel",
                           "name": g["name"], "kreis": g["kreisName"], "land": g["land"]}
            herkunft["insel"] += 1
            inseln[ags] = o
            if land and kg in land["gemeinden"]:
                getroffene_g[g["land"]].add(kg)

    # --- Durchgang 0: manuell geprüfte Overrides ------------------------------
    ov_pfad = os.path.join(DATA, "mietstufen-overrides.json")
    overrides = {}
    overrides_kreise = {}
    if os.path.exists(ov_pfad):
        _ov = json.load(io.open(ov_pfad, encoding="utf-8"))
        overrides = _ov["eintraege"]
        overrides_kreise = _ov.get("kreise", {})
    ov_probleme = []
    for ags, o in overrides.items():
        if ags in lookup:      # Inselregel hat Vorrang
            continue
        g = gemeinden.get(ags)
        if g is None:
            ov_probleme.append((ags, o["pdfName"], "AGS nicht im PLZ-Datensatz"))
            continue
        land = ms["laender"].get(g["land"])
        k = schluessel(o["pdfName"])
        if land is None or k not in land["gemeinden"]:
            ov_probleme.append((ags, o["pdfName"], "PDF-Eintrag nicht (mehr) im Mietstufen-Datensatz"))
            continue
        if schluessel(o["amtlich"]) != schluessel(g["name"]):
            ov_probleme.append((ags, o["pdfName"],
                "amtlicher Name weicht ab: Liste '%s' vs. Datensatz '%s'" % (o["amtlich"], g["name"])))
            continue
        lookup[ags] = {"mietstufe": land["gemeinden"][k]["mietstufe"], "quelle": "override",
                       "name": g["name"], "kreis": g["kreisName"], "land": g["land"]}
        herkunft["override"] += 1
        getroffene_g[g["land"]].add(k)

    # --- Durchgang A: exakte Treffer auf dem normalisierten Namen -------------
    offen = []
    for ags, g in sorted(gemeinden.items()):
        if ags in lookup:
            continue
        land = ms["laender"].get(g["land"])
        if land is None:
            ohne.append((ags, g["name"], g["land"], "Land nicht im Mietstufen-Datensatz"))
            continue
        kg = schluessel(g["name"])
        if kg in land["gemeinden"]:
            lookup[ags] = {"mietstufe": land["gemeinden"][kg]["mietstufe"], "quelle": "gemeinde",
                           "name": g["name"], "kreis": g["kreisName"], "land": g["land"]}
            herkunft["gemeinde"] += 1
            getroffene_g[g["land"]].add(kg)
        else:
            offen.append((ags, g, land))

    # --- Durchgang B: Basisname, aber nur gegen noch freie PDF-Eintraege ------
    # "Weingarten (Wuerttemberg)" findet "Weingarten, Stadt" erst, nachdem
    # "Weingarten, Baden" in Durchgang A vergeben wurde. Ohne diese Reihenfolge
    # waere der Basisname mehrdeutig und die Gemeinde fiele auf den Kreis zurueck
    # — mit einer um mehrere Stufen falschen Mietstufe.
    basis_index = {}
    for land_name, v in ms["laender"].items():
        idx = collections.defaultdict(list)
        for k, e in v["gemeinden"].items():
            idx[basis_schluessel(e["name"])].append(k)
        basis_index[land_name] = idx

    noch_offen = []
    for ags, g, land in offen:
        frei = [k for k in basis_index[g["land"]].get(basis_schluessel(g["name"]), [])
                if k not in getroffene_g[g["land"]]]
        if len(frei) == 1:
            k = frei[0]
            lookup[ags] = {"mietstufe": land["gemeinden"][k]["mietstufe"], "quelle": "gemeinde-basisname",
                           "name": g["name"], "kreis": g["kreisName"], "land": g["land"]}
            herkunft["gemeinde-basisname"] += 1
            getroffene_g[g["land"]].add(k)
            ueber_basisnamen.append((ags, g["name"], land["gemeinden"][k]["name"],
                                     land["gemeinden"][k]["mietstufe"]))
        elif len(frei) > 1:
            ohne.append((ags, g["name"], g["land"], "Basisname mehrdeutig: " + ", ".join(
                land["gemeinden"][k]["name"] for k in frei)))
        else:
            noch_offen.append((ags, g, land))

    # --- Durchgang C: Kreis-Fallback (Regel des Quelldokuments) ---------------
    # Kreis-Overrides: amtlicher Kreisschluessel -> PDF-Eintrag
    kreis_ov = {}
    for dk, o in (overrides_kreise or {}).items():
        kreis_ov[dk] = schluessel(o["pdfName"])
    for ags, g, land in noch_offen:
        kk = kreis_ov.get(g["kreisKey"]) or schluessel(g["kreisName"])
        if kk in land["kreise"]:
            stufe, q = land["kreise"][kk]["mietstufe"], "kreis"
            getroffene_k[g["land"]].add(kk)
        elif kk in land["gemeinden"]:
            stufe, q = land["gemeinden"][kk]["mietstufe"], "kreisfreie-stadt"
            getroffene_g[g["land"]].add(kk)
        else:
            ohne.append((ags, g["name"], g["land"], "weder Gemeinde- noch Kreiseintrag"))
            continue
        lookup[ags] = {"mietstufe": stufe, "quelle": q, "name": g["name"],
                       "kreis": g["kreisName"], "land": g["land"]}
        herkunft[q] += 1

    plz_index = collections.defaultdict(list)
    for ags, g in gemeinden.items():
        for p in g["plz"]:
            plz_index[p].append(ags)

    # --- Bericht ---
    print("=" * 66)
    print("ABDECKUNGSBERICHT")
    print("=" * 66)
    if insel_probleme:
        print("\n!!! INSELLISTE: %d Eintraege stimmen nicht !!!" % len(insel_probleme))
        for a, n, w in insel_probleme:
            print("      %-9s %-30s %s" % (a, n[:30], w))
    elif inseln:
        print("\nInselregel: %d Gemeinden auf Mietstufe %d gesetzt." % (len(inseln), insel_stufe_regel))
    if insel_konflikte:
        print("\n  ACHTUNG — PDF fuehrt fuer diese Inselgemeinden eine abweichende Stufe:")
        for a, n, eigen, regel in insel_konflikte:
            print("      %-9s %-30s PDF %d vs. Inselregel %d" % (a, n[:30], eigen, regel))
        print("      Vorrang klaeren, bevor das Modul live geht.")

    if ov_probleme:
        print("\n!!! OVERRIDE-LISTE: %d Eintraege stimmen nicht mehr !!!" % len(ov_probleme))
        print("    (Datensatz hat sich geaendert — Liste pruefen, sonst fehlen Zuordnungen)")
        for a, n, w in ov_probleme:
            print("      %-9s %-38s %s" % (a, n[:38], w))
    elif overrides:
        print("\nOverride-Liste: %d Eintraege, alle gueltig." % len(overrides))

    print("\nGemeinden im PLZ-Datensatz: %d" % len(gemeinden))
    print("davon Mietstufe zugeordnet: %d (%.2f %%)" % (
        len(lookup), 100.0 * len(lookup) / max(len(gemeinden), 1)))
    print("\nHerkunft der Zuordnung:")
    for q, c in herkunft.most_common():
        print("  %-18s %6d" % (q, c))

    if ueber_basisnamen:
        print("\n--- Ueber Basisnamen zugeordnet (%d) — bitte stichprobenhaft pruefen ---" % len(ueber_basisnamen))
        print("    (amtlicher Name und PDF-Name unterscheiden sich im geografischen Zusatz)")
        for ags, amtlich, pdf, st in ueber_basisnamen[:15]:
            print("      %-9s %-34s ~ %-28s Stufe %d" % (ags, amtlich, pdf, st))
        if len(ueber_basisnamen) > 15:
            print("      … %d weitere" % (len(ueber_basisnamen) - 15))

    print("\n--- 1. Gemeinden ohne Mietstufe: %d ---" % len(ohne))
    print("    (liefern zur Laufzeit nicht_pruefbar)")
    for e in ohne[:20]:
        print("      %-9s %-32s %-22s %s" % e)
    if len(ohne) > 20:
        print("      … %d weitere" % (len(ohne) - 20))

    print("\n--- 2. Nicht zugeordnete Einträge aus dem Mietstufen-PDF ---")
    print("    (kritisch: diese Gemeinden bekommen faelschlich die Kreisstufe)")
    rest_g = rest_k = 0
    for land, v in ms["laender"].items():
        offen_g = set(v["gemeinden"]) - getroffene_g[land]
        offen_k = set(v["kreise"])    - getroffene_k[land]
        rest_g += len(offen_g); rest_k += len(offen_k)
        if offen_g:
            print("  %s — %d Gemeindeeinträge ohne Treffer:" % (land, len(offen_g)))
            for k in sorted(offen_g)[:8]:
                print("      %s" % v["gemeinden"][k]["name"])
            if len(offen_g) > 8:
                print("      … %d weitere" % (len(offen_g) - 8))
    print("\n  Summe: %d Gemeinde- und %d Kreiseinträge ohne Treffer" % (rest_g, rest_k))
    print("  Nicht getroffene KREIS-Eintraege sind meist unkritisch (alle ihre Gemeinden")
    print("  sind einzeln aufgefuehrt). Nicht getroffene GEMEINDE-Eintraege sind es nicht.")

    print("\n--- 3. Postleitzahlen ---")
    mehrdeutig = {p: a for p, a in plz_index.items() if len(a) > 1}
    print("  gesamt: %d | mehrdeutig (mehrere Gemeinden): %d (%.1f %%)" % (
        len(plz_index), len(mehrdeutig), 100.0 * len(mehrdeutig) / max(len(plz_index), 1)))
    abw = [p for p, a in mehrdeutig.items()
           if len({lookup[x]["mietstufe"] for x in a if x in lookup}) > 1]
    print("  davon mit ABWEICHENDER Mietstufe: %d" % len(abw))
    print("  -> nur bei diesen muss der Wizard die Gemeinde abfragen; sonst genuegt die PLZ.")
    if abw:
        for p in sorted(abw)[:10]:
            paare = [(lookup[x]["name"], lookup[x]["mietstufe"]) for x in plz_index[p] if x in lookup]
            print("      %s: %s" % (p, ", ".join("%s=%d" % t for t in paare)))

    print("\n--- 4. Verteilung der Mietstufen ueber alle Gemeinden ---")
    v = collections.Counter(e["mietstufe"] for e in lookup.values())
    for s in sorted(v):
        print("  Stufe %d: %5d Gemeinden" % (s, v[s]))

    json.dump({"quelle": ms["quelle"], "regeln": ms["regeln"], "gemeinden": lookup},
              io.open(os.path.join(DATA, "mietstufen-lookup.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
    json.dump({p: sorted(a) for p, a in plz_index.items()},
              io.open(os.path.join(DATA, "plz-index.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
    print("\nGeschrieben: mietstufen-lookup.json, plz-index.json")
    if inseln:
        print("\nInselregel angewendet: %d Gemeinden auf Mietstufe %d (siehe inseln-ohne-festlandanschluss.json)."
              % (len(inseln), insel_stufe))
    else:
        print("\nHINWEIS: Inselliste fehlt — Inseln ohne Festlandanschluss rechnen mit der Kreisstufe.")


if __name__ == "__main__":
    main()
