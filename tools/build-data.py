"""Source of truth: data/characters/<slug>.json, one file per character.
Each file: {"key", "details": {s,f,u}, "gallery": [...], "portrait": "images/..", "appear": {w,a}}.
This script regenerates details.js, gallery.js, portraits.js, portraits.json and appearances.js,
which the site and tools/build-seo.mjs load. Run: python tools/build-data.py
"""
import json, pathlib

root = pathlib.Path(__file__).resolve().parent.parent
chars = [json.loads(p.read_text(encoding="utf-8")) for p in sorted((root / "data" / "characters").glob("*.json"))]

def emit(name, var, field, sep=None):
    d = {c["key"]: c[field] for c in chars if c.get(field)}
    kw = {"ensure_ascii": False}
    if sep: kw["separators"] = sep
    (root / name).write_text(f"const {var}=" + json.dumps(d, **kw) + ";\n", encoding="utf-8")
    return d

emit("details.js", "DETAILS", "details")
emit("gallery.js", "GALLERY", "gallery")
p = emit("portraits.js", "PORTRAITS", "portrait")
(root / "portraits.json").write_text(json.dumps(p, ensure_ascii=False), encoding="utf-8")
emit("appearances.js", "APPEAR", "appear", (",", ":"))
print(len(chars), "characters")
