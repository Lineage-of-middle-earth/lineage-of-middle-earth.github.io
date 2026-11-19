"""Builds the Wizards, Species & Monsters and Sauron's Forms sections.

Source: data/beings.json (the three trees). For each entry without a local `img` this fetches the
Lord of the Rings Wiki intro text and main image, writes data/characters/<slug>.json, and emits
beings.js (the trees) for index.html and tools/build-seo.mjs.
Run: python tools/build-beings.py   then   python tools/build-appearances.py && python tools/build-data.py
"""
import io, json, re, hashlib, pathlib, unicodedata, urllib.parse, urllib.request
from PIL import Image

root = pathlib.Path(__file__).resolve().parent.parent
src = json.loads((root / "data" / "beings.json").read_text(encoding="utf-8"))
chars = root / "data" / "characters"
UA = {"User-Agent": "me-site/1.0"}

def slug(k):
    return re.sub(r"[^a-z0-9]+", "-", unicodedata.normalize("NFD", k).encode("ascii", "ignore").decode().lower()).strip("-") or "x"

existing = {}
for p in chars.glob("*.json"):
    c = json.loads(p.read_text(encoding="utf-8")); existing[c["key"]] = p

nodes = []
def walk(l):
    for o in l:
        if o.get("n"): nodes.append(o)
        walk(o.get("c", []))
for t in src.values(): walk(t["roots"])

def key(o): return o.get("w") or re.sub(r"['‘][^'’]*['’]", "", o["n"]).strip()
alias = {o["n"]: o["w"] for o in nodes if o.get("w") and o["w"] != o["n"]}

def strip_markup(t):
    for _ in range(6): t = re.sub(r"\{\{[^{}]*\}\}", "", t)
    t = re.sub(r"<ref[^>]*?/>|<ref[^>]*>.*?</ref>|<!--.*?-->|<[^>]+>", "", t, flags=re.S)
    t = re.sub(r"\[\[(?:File|Image|Category):[^\]]*\]\]", "", t)
    t = re.sub(r"\[\[(?:[^\]|]*\|)?([^\]]*)\]\]", r"\1", t)
    return re.sub(r"'{2,}", "", t)

def intro(wt):
    """First prose paragraph of a wiki article (the one that opens with the bold title)."""
    for para in re.split(r"\n\s*\n", wt):
        para = para.strip()
        if "'''" in para and not para.startswith(("{{", "|", "=")):
            return re.sub(r"\s+", " ", strip_markup(para)).strip()
    return ""

def api(titles):
    u = ("https://lotr.fandom.com/api.php?action=query&prop=revisions|pageimages&rvprop=content&rvslots=main"
         "&piprop=thumbnail&pithumbsize=500&redirects=1&format=json&formatversion=2&titles=" + urllib.parse.quote("|".join(titles)))
    r = json.load(urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=60))["query"]
    m = {x["from"]: x["to"] for x in r.get("normalized", []) + r.get("redirects", [])}
    pages = {p["title"]: p for p in r["pages"] if not p.get("missing")}
    for p in pages.values():
        p["extract"] = intro(p["revisions"][0]["slots"]["main"]["content"]) if p.get("revisions") else ""
    return {t: pages.get(m.get(m.get(t, t), m.get(t, t))) or pages.get(m.get(t, t)) or pages.get(t) for t in titles}

def clip(s, n=420):
    s = re.sub(r"\s+", " ", re.sub(r"\([^)]*\)", "", s)).strip()
    if len(s) <= n: return s
    cut = s[:n].rsplit(". ", 1)[0]
    return (cut if len(cut) > 80 else s[:n].rsplit(" ", 1)[0]) + ("." if not cut.endswith(".") else "")

def write(c, p):
    p.write_text("{\n" + ",\n".join(f" {json.dumps(k)}: {json.dumps(v, ensure_ascii=False)}" for k, v in c.items()) + "\n}\n", encoding="utf-8")

def has_details(o):
    return json.loads(existing[key(o)].read_text(encoding="utf-8")).get("details") if key(o) in existing else None
about = json.loads((root / "data" / "beings-about.json").read_text(encoding="utf-8"))
todo = [o for o in nodes if key(o) not in existing or key(o) in about]
wiki_nodes = [o for o in todo if not o.get("img") and not (key(o) in existing and json.loads(existing[key(o)].read_text(encoding="utf-8")).get("portrait"))]
res = {}
for i in range(0, len(wiki_nodes), 6):
    batch = wiki_nodes[i:i + 6]
    res.update(api([key(o) for o in batch]))

missing = []
for o in todo:
    k = key(o); c = json.loads(existing[k].read_text(encoding="utf-8")) if k in existing else {"key": k}
    if o.get("img"):
        c["portrait"] = o["img"]
    else:
        pg = res.get(k)
        if not pg and not c.get("portrait"): missing.append(k); continue
        th = ((pg or {}).get("thumbnail") or {}).get("source")
        if th and not c.get("portrait"):
            try:
                im = Image.open(io.BytesIO(urllib.request.urlopen(urllib.request.Request(th, headers=UA), timeout=40).read())).convert("RGB")
                im.thumbnail((420, 560))
                f = "images/b/" + hashlib.sha1(k.encode()).hexdigest()[:10] + ".webp"
                im.save(root / f, "WEBP", quality=78); c["portrait"] = f
            except Exception as e: print("img fail", k, e)
        elif not c.get("portrait"): missing.append(k + " (no image)")
    if k in about:
        title = res[k]["title"] if res.get(k) else k
        c["details"] = {"s": about[k], "f": [], "u": "https://lotr.fandom.com/wiki/" + urllib.parse.quote(title.replace(" ", "_"))}
    if o.get("appear"): c["appear"] = o["appear"]
    write(c, chars / (slug(k) + ".json"))

KEEP = ("n", "s", "nt", "k", "x", "c", "gap")
def strip(l): return [{k: (strip(v) if k == "c" else v) for k, v in o.items() if k in KEEP} for o in l]
out = {name: {**{k: v for k, v in t.items() if k != "roots"}, "roots": strip(t["roots"])} for name, t in src.items()}
(root / "beings.js").write_text("const BEINGS=" + json.dumps(out, ensure_ascii=False) + ";\nconst BEINGS_ALIAS=" + json.dumps(alias, ensure_ascii=False) + ";\n", encoding="utf-8")
print(len(nodes), "entries,", len(todo), "new data files; no wiki data for:", missing)
