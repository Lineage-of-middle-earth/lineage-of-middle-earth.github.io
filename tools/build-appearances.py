"""Builds appearances.js from the Lord of the Rings Wiki source citations.

A character "appears in" a work when the wiki's article for them cites it
(e.g. {{Hlink}} = The Hobbit, {{TRoPlink}} = The Rings of Power).
Usage: python tools/build-appearances.py   (fetches ~170 wiki pages, writes data/characters/*.json)
"""
import json, re, urllib.request, concurrent.futures as cf, pathlib

root = pathlib.Path(__file__).resolve().parent.parent
details = {}
for _p in (root / "data" / "characters").glob("*.json"):
    _c = json.loads(_p.read_text(encoding="utf-8"))
    if "details" in _c: details[_c["key"]] = _c["details"]

def fetch(kv):
    k, v = kv
    t = v["u"].rsplit("/wiki/", 1)[1]
    u = ("https://lotr.fandom.com/api.php?action=query&prop=revisions&rvprop=content&rvslots=main"
         "&redirects=1&format=json&formatversion=2&titles=" + t)
    for _ in range(3):
        try:
            r = json.load(urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "me-site/1.0"}), timeout=30))
            return k, r["query"]["pages"][0]["revisions"][0]["slots"]["main"]["content"]
        except Exception:
            pass
    return k, ""

with cf.ThreadPoolExecutor(8) as ex:
    pages = dict(ex.map(fetch, details.items()))

FILM = {"film", "films", "film1", "film2", "film3"}
BOOK = {"", "book1", "book2", "book3", "ext"}
def works(txt):
    """Books need 2+ citations. Screen credits follow the infobox's actor line when it names a
    production; with an unlabelled actor they need 2+ film citations."""
    n = {}
    for tpl, media in re.findall(r"\{\{(\w+link)\s*(?:\|\s*(?:media\s*=\s*)?([\w-]*))?", txt):
        m = media or ""
        key = None
        if tpl == "LotRlink": key = "lotr" if m in BOOK else "lotrf" if m in FILM else None
        elif tpl == "Hlink": key = "hob" if m == "" else "hobf" if m in FILM else None
        elif tpl == "CTlink": key = "sil" if m == "s" else "ut" if m in {"u", "ushort"} else "hom"
        elif tpl == "TRoPlink": key = "rop"
        elif tpl == "Melink" and m in {"history", "peoples", "shaping", "nature", "lost1", "lost2", "morgoth"}: key = "hom"
        if key: n[key] = n.get(key, 0) + 1
    am = re.search(r"\|\s*actor\s*=([^\n]*)", txt)
    actor = am.group(1) if am else ""
    has_actor = bool(re.sub(r"[\s<br/>]", "", actor))
    labelled = {k for k, pat in (("rop", r"TRoPlink|Rings of Power"), ("hobf", r"Hlink|Hobbit"),
                ("lotrf", r"LotRlink|LOTR|LotR|live-action|Lord of the Rings")) if re.search(pat, actor)}
    w = {k for k in ("hob", "lotr", "sil", "ut") if n.get(k, 0) >= 2}
    if n.get("hom", 0) >= 2: w.add("hom")
    if n.get("rop", 0) >= 1 and (not labelled or "rop" in labelled): w.add("rop")
    if labelled: w |= labelled | {k for k in ("hobf", "lotrf") if n.get(k, 0) >= 3}
    elif has_actor:
        w |= {k for k in ("hobf", "lotrf") if n.get(k, 0) >= 2}
    if "rop" in w and not n.get("rop"): w.discard("rop")
    return sorted(w)

AGES = ["YT", "FA", "SA", "TA", "FO"]
def ages(facts, w=()):
    f = dict(facts)
    born, died = f.get("Born", ""), f.get("Died", "")
    pat = r"\b(YT|FA|SA|TA|FO)\b|Years of the Trees|First Age|Second Age|Third Age|Fourth Age"
    idx = lambda t: [AGES.index({"Years of the Trees": "YT", "First Age": "FA", "Second Age": "SA", "Third Age": "TA", "Fourth Age": "FO"}.get(m.group(0), m.group(0))) for m in re.finditer(pat, t)]
    b, d = idx(born), idx(died)
    if not b and not d: return []
    story = {"sil": 1, "lotr": 3, "lotrf": 3, "hob": 3, "hobf": 3, "rop": 2}
    lo = min(b + d); hi = max(d) if d else max([story[k] for k in w if k in story] + [lo])
    return AGES[lo:hi + 1]

BEING_KEYS, BEING_ROP = set(), {"Stranger", "Orcs", "Trolls"}
def _keys(l):
    for o in l:
        if o.get("n"): BEING_KEYS.add(o.get("w") or o["n"])
        _keys(o.get("c", []))
for _t in json.loads((root / "data" / "beings.json").read_text(encoding="utf-8")).values(): _keys(_t["roots"])
BEING_KEYS -= {"Gandalf", "Khamûl", "Sauron", "Halbrand"}

n = 0
for p in sorted((root / "data" / "characters").glob("*.json")):
    c = json.loads(p.read_text(encoding="utf-8"))
    k = c["key"]
    if k not in details:
        continue
    w = works(pages.get(k, ""))
    if k in BEING_KEYS:
        # creatures and wizards are cited in many side works; keep the main books and films only
        w = [x for x in w if x in {"hob", "lotr", "sil", "hobf", "lotrf"} or (x == "rop" and k in BEING_ROP)]
    a = ages(details[k]["f"], w)
    if w or a: c["appear"] = {"w": w, "a": a}
    else: c.pop("appear", None)
    p.write_text("{\n" + ",\n".join(f" {json.dumps(x)}: {json.dumps(v, ensure_ascii=False)}" for x, v in c.items()) + "\n}\n", encoding="utf-8")
    n += 1
print(n, "characters updated; now run: python tools/build-data.py")
