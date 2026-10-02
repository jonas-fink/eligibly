#!/usr/bin/env python3
"""Erzeugt magere Artefakte für den ReferenzdatenPort aus den Quell-JSONs."""
from __future__ import annotations
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "artifacts"


def main() -> None:
    lookup = json.loads((ROOT / "mietstufen-lookup.json").read_text(encoding="utf-8"))
    plz = json.loads((ROOT / "plz-index.json").read_text(encoding="utf-8"))
    gemeinden = lookup["gemeinden"]
    ags_miet = {ags: int(v["mietstufe"]) for ags, v in gemeinden.items()}
    ags_name = {ags: v["name"] for ags, v in gemeinden.items()}
    OUT.mkdir(exist_ok=True)
    (OUT / "ags-mietstufe.json").write_text(
        json.dumps(ags_miet, separators=(",", ":"), ensure_ascii=False), encoding="utf-8"
    )
    (OUT / "ags-name.json").write_text(
        json.dumps(ags_name, separators=(",", ":"), ensure_ascii=False), encoding="utf-8"
    )
    (OUT / "plz-ags.json").write_text(
        json.dumps(plz, separators=(",", ":"), ensure_ascii=False), encoding="utf-8"
    )
    print(f"ags={len(ags_miet)} plz={len(plz)} → {OUT}")


if __name__ == "__main__":
    main()
