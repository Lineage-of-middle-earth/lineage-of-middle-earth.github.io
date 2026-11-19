# Character data

One JSON file per character in `characters/`. Edit these, never the generated `*.js` files in the project root.

```json
{
 "key": "Galadriel",              // name used by the site (matches the family tree)
 "details": {"s": "...", "f": [["Race","Elves"]], "u": "wiki url"},
 "gallery": [{"f": "images/g/x.webp", "c": "caption", "t": "art|movie|series|game"}],
 "portrait": "images/x.webp",
 "appear": {"w": ["lotr","rop"], "a": ["FA","SA"]}   // works + ages
}
```

Work codes: `sil` Silmarillion, `ut` Unfinished Tales, `hom` History of Middle-earth, `hob` Hobbit, `lotr` Lord of the Rings, `hobf` Hobbit films, `lotrf` LotR films, `rop` Rings of Power. Ages: `YT FA SA TA FO`.

After editing:

```
python tools/build-data.py      # regenerates details.js, gallery.js, portraits.js(on), appearances.js
node tools/build-seo.mjs        # regenerates characters/*, sitemap.xml, robots.txt
```

`python tools/build-appearances.py` re-derives `appear` for every character from the Lord of the Rings Wiki (overwrites hand edits to `appear`).

The family tree itself (names, parents, spouses, notes) still lives in `index.html`.

## Wizards, Species & Monsters, Sauron's Forms

The three trees live in `beings.json`, with each entry's About text in `beings-about.json`. Portraits for them are in `images/b/`.

```
python tools/build-beings.py       # builds beings.js, fetches missing portraits, writes data/characters/*.json
python tools/build-appearances.py  # re-derives "Appears in"; Sauron's Forms use fixed values from beings.json
python tools/build-data.py
node tools/build-seo.mjs
```

To add an entry, add a node to `beings.json` (`n`, `s`, optional `nt`, `k` for film characters, `w` for a different wiki title, `img` to reuse a local image) and a sentence in `beings-about.json`.
