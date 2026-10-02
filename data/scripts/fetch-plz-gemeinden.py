#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Holt die Zuordnung Postleitzahl -> Ort -> Gemeinde -> Kreis -> Land von der OpenPLZ API
und schreibt sie als CSV nach data/plz-gemeinden.csv.

Aufruf (braucht Internet, nur Standardbibliothek):
    python3 data/scripts/fetch-plz-gemeinden.py

Optionen:
    --out PFAD      Zieldatei (Standard: data/plz-gemeinden.csv)
    --land KEY      nur ein Bundesland holen, z. B. 06 für Hessen (zum Ausprobieren)
    --pause SEK     Wartezeit zwischen Anfragen (Standard: 0.2)

Quelle: https://www.openplzapi.org/ — Daten unter ODbL, Basis sind die vierteljährlichen
Post-Daten und die Gemeindeleitdatei des Statistischen Bundesamtes.
"""
import argparse, csv, json, os, sys, time, urllib.error, urllib.request

BASIS = "https://openplzapi.org/de"
# pageSize ist laut OpenAPI-Schema des Endpunkts auf 50 begrenzt
# ("maximum": 50, "minimum": 1, Standard 10). Groessere Werte quittiert die API
# mit HTTP 400. orte_robust() senkt bei 400 zusaetzlich automatisch ab.
SEITENGROESSE = 50
SPALTEN = ["postalCode", "localityName", "municipalityKey", "municipalityName",
           "municipalityType", "districtKey", "districtName", "federalStateKey",
           "federalStateName"]


DEBUG = False


class ApiFehler(Exception):
    """HTTP-Fehler samt Antworttext der API — der Text nennt meist die Ursache."""


def hole(url, versuche=4):
    """GET mit Wiederholung. Gibt (daten, header) zurück."""
    if DEBUG:
        print("      GET %s" % url, file=sys.stderr)
    for i in range(versuche):
        try:
            req = urllib.request.Request(url, headers={
                "Accept": "application/json",
                "User-Agent": "EligibilityCheck-Datenaufbereitung/1.0",
            })
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.loads(r.read().decode("utf-8")), dict(r.headers)
        except urllib.error.HTTPError as e:
            # Antworttext IMMER mitnehmen: die API liefert bei 400 eine Begruendung.
            try:
                koerper = e.read().decode("utf-8", "replace").strip()[:600]
            except Exception:
                koerper = "(kein Antworttext lesbar)"
            if e.code == 429 and i < versuche - 1:      # Rate Limit
                wartezeit = 5 * (i + 1)
                print("    429 – warte %ds" % wartezeit, file=sys.stderr)
                time.sleep(wartezeit); continue
            raise ApiFehler("HTTP %d bei %s\n      Antwort: %s" % (e.code, url, koerper))
        except (urllib.error.URLError, TimeoutError) as e:
            if i < versuche - 1:
                print("    %s – neuer Versuch" % e, file=sys.stderr)
                time.sleep(3 * (i + 1)); continue
            raise ApiFehler("nicht erreichbar: %s (%s)" % (url, e))
    raise ApiFehler("unerreichbar: " + url)


def flach(e):
    m = e.get("municipality") or {}
    d = e.get("district") or {}
    f = e.get("federalState") or {}
    return {
        "postalCode": e.get("postalCode", ""), "localityName": e.get("name", ""),
        "municipalityKey": m.get("key", ""), "municipalityName": m.get("name", ""),
        "municipalityType": m.get("type", ""),
        "districtKey": d.get("key", ""), "districtName": d.get("name", ""),
        "federalStateKey": f.get("key", ""), "federalStateName": f.get("name", ""),
    }


def orte_eines_landes(land_key, pause, seitengroesse):
    """Blättert durch alle Localities eines Bundeslandes."""
    seite, gesamt = 1, []
    while True:
        url = "%s/FederalStates/%s/Localities?page=%d&pageSize=%d" % (
            BASIS, land_key, seite, seitengroesse)
        daten, header = hole(url)
        if not daten:
            break
        gesamt.extend(daten)
        letzte = header.get("x-total-pages") or header.get("X-Total-Pages")
        if letzte and seite >= int(letzte):
            break
        if len(daten) < seitengroesse:      # Fallback, falls kein Header kommt
            break
        seite += 1
        time.sleep(pause)
    return gesamt


def orte_robust(land_key, pause, start_groesse):
    """Versucht absteigende Seitengrößen, falls die API die Größe ablehnt."""
    fehler = None
    for g in [start_groesse, 50, 20, 10]:
        if g > start_groesse:
            continue
        try:
            return orte_eines_landes(land_key, pause, g), g
        except ApiFehler as e:
            fehler = e
            if "HTTP 400" not in str(e):
                raise
            print("\n      pageSize=%d abgelehnt, versuche kleiner …" % g, file=sys.stderr)
    raise fehler


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--out", default=os.path.join("data", "plz-gemeinden.csv"))
    p.add_argument("--land", default=None)
    p.add_argument("--pause", type=float, default=0.2)
    p.add_argument("--pagesize", type=int, default=SEITENGROESSE)
    p.add_argument("--debug", action="store_true", help="jede angefragte URL ausgeben")
    a = p.parse_args()
    global DEBUG
    DEBUG = a.debug

    if a.land:
        laender = [{"key": a.land, "name": a.land}]
    else:
        print("Bundesländer abrufen …")
        laender, _ = hole(BASIS + "/FederalStates")

    zeilen, fehler = [], []
    for l in laender:
        print("  %s %s …" % (l["key"], l.get("name", "")), end=" ", flush=True)
        try:
            orte, benutzt = orte_robust(l["key"], a.pause, a.pagesize)
            zeilen.extend(flach(o) for o in orte)
            print("%d Orte (pageSize=%d)" % (len(orte), benutzt))
        except Exception as e:
            fehler.append((l["key"], str(e))); print("FEHLER: %s" % e)
        time.sleep(a.pause)

    zeilen.sort(key=lambda r: (r["federalStateKey"], r["municipalityKey"], r["postalCode"]))
    os.makedirs(os.path.dirname(a.out) or ".", exist_ok=True)
    with open(a.out, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=SPALTEN); w.writeheader(); w.writerows(zeilen)

    gemeinden = {r["municipalityKey"] for r in zeilen if r["municipalityKey"]}
    plz = {r["postalCode"] for r in zeilen if r["postalCode"]}
    print("\nGeschrieben: %s" % a.out)
    print("  Zeilen: %d | Gemeinden: %d | Postleitzahlen: %d" % (len(zeilen), len(gemeinden), len(plz)))
    ohne_ags = sum(1 for r in zeilen if not r["municipalityKey"])
    if ohne_ags:
        print("  WARNUNG: %d Zeilen ohne Gemeindeschlüssel" % ohne_ags)
    if fehler:
        print("\n  FEHLGESCHLAGENE LÄNDER:")
        for k, e in fehler:
            print("    %s: %s" % (k, e))
        print("\n  Der Antworttext der API oben nennt in der Regel die Ursache.")
        print("  Nächster Schritt: mit --debug --land 06 erneut laufen lassen,")
        print("  dann steht die angefragte URL im Klartext daneben.")
        sys.exit(1)
    print("\nPlausibilität: rund 11.000 Gemeinden und rund 8.200 Postleitzahlen sind zu erwarten.")
    print("Weichen die Zahlen stark ab, ist der Abruf unvollständig — nicht weiterverarbeiten.")


if __name__ == "__main__":
    main()
