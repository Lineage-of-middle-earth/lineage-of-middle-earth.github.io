// Builds a crawlable page for every character, plus the A-Z index, sitemap.xml and robots.txt.
// Run from the repo root after changing the data in index.html, details.js, portraits.js or gallery.js:
//   node tools/build-seo.mjs
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const SITE = "https://lineage-of-middle-earth.github.io";
const NAME = "Lineages of Middle-earth";
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const read = f => fs.readFileSync(path.join(root, f), "utf8");
const today = new Date().toISOString().slice(0, 10);

/* ---- load the same data the app uses ---- */
const html = read("index.html");
const dataSrc = html.slice(html.indexOf("const EM={"), html.indexOf("let cur="));
const ctx = vm.createContext({});
const D = vm.runInContext(
  [read("portraits.js"), read("details.js"), read("appearances.js"), read("beings.js"), read("gallery.js"), dataSrc,
   ";({T,ORDER,wt,SKIP,DETAILS,APPEAR,PORTRAITS,GALLERY})"].join("\n"), ctx);
const { T, ORDER, wt, SKIP, DETAILS, APPEAR, PORTRAITS, GALLERY } = D;
/* same works and story periods as WORKS in index.html */
const WORKS = {sil:["Books","The Silmarillion","First Age"],ut:["Books","Unfinished Tales","Ages of Middle-earth"],hom:["Books","The History of Middle-earth","Ages of Middle-earth"],hob:["Books","The Hobbit","TA 2941–2942"],lotr:["Books","The Lord of the Rings","TA 3018–3021"],
  hobf:["Films","The Hobbit trilogy","2012–2014, TA 2941"],lotrf:["Films","The Lord of the Rings trilogy","2001–2003, TA 3018"],rop:["Series","The Rings of Power","2022–, Second Age"]};
const AGEN = {YT:"Years of the Trees",FA:"First Age",SA:"Second Age",TA:"Third Age",FO:"Fourth Age"};

/* the GA tag and click tracking from index.html, so every page is measured the same way */
const gaStart = html.indexOf("<!-- Google tag (gtag.js) -->");
const gaEnd = html.indexOf("</script>", html.indexOf("ui_click")) + "</script>".length;
const GA = html.slice(gaStart, gaEnd);

/* ---- people index, built exactly as the app builds PEOPLE ---- */
const PEOPLE = {};
for (const k of ORDER) {
  let n = 0;
  (function walk(list, parent) {
    for (const o of list) {
      if (o.gap) { walk(o.c || [], parent); continue }
      const id = k + "-" + (n++);
      PEOPLE[id] = { id, o, tab: k, parent, kids: [] };
      if (parent) PEOPLE[parent].kids.push(id);
      walk(o.c || [], id);
    }
  })(T[k].roots, null);
}

export const slug = n => n.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
  .replace(/['‘’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
/* SKIP names are short or shared (Sam's son "Bilbo", two different "Finduilas"), so they get no page of their own */
const isPerson = n => /^[A-ZÀ-Þ]/.test(n) && !/^Other /.test(n) && !SKIP.has(n);

/* one page per name: a person who appears in several trees gets every appearance merged */
const byName = new Map();
for (const x of Object.values(PEOPLE)) {
  if (!isPerson(x.o.n)) continue;
  if (!byName.has(x.o.n)) byName.set(x.o.n, []);
  byName.get(x.o.n).push(x);
}
const slugs = new Map();
for (const n of byName.keys()) {
  const s = slug(n);
  if (slugs.has(s)) throw new Error(`slug clash: ${n} / ${slugs.get(s)}`);
  slugs.set(s, n);
}
const urlOf = n => `/characters/${slug(n)}/`;

/* ---- helpers ---- */
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const clip = (s, n) => s.length <= n ? s : s.slice(0, s.lastIndexOf(" ", n - 1)).replace(/[,;:·\s]+$/, "") + "…";
const tabLabel = k => T[k].label;
const colour = k => ({ elves: "var(--elf)", half: "var(--half)", men: "var(--men)", rohan: "var(--men)", hobbits: "var(--hob)", dwarves: "var(--dwa)", wizards: "var(--wiz)", species: "var(--spc)", villain: "var(--drk)", rop: "var(--gold)" })[k];
const link = n => isPerson(n) && byName.has(n) ? `<a href="${urlOf(n)}">${esc(n)}</a>` : esc(n);
const uniq = a => [...new Set(a)];

const CSS = `:root{--bg:#0b0b0d;--panel:#151518;--ink:#f2f2f3;--muted:#9a9aa2;--rule:#26262b;--gold:#d9a650;--elf:#86b4e0;--half:#b79be0;--men:#e08a80;--hob:#9cc77a;--dwa:#e7a062;color-scheme:dark}
@media (prefers-color-scheme:light){:root{--bg:#f7f4ee;--panel:#fff;--ink:#1d1b18;--muted:#5f5a52;--rule:#e2ddd3;--gold:#94681c;--elf:#2f6aa5;--half:#7046b0;--men:#b0473b;--hob:#4d7d2c;--dwa:#a9581b;color-scheme:light}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.6 Inter,system-ui,sans-serif}
.wrap{max-width:860px;margin:0 auto;padding:24px 16px 64px}a{color:var(--gold)}a:hover{text-decoration-thickness:2px}
nav.crumbs{font-size:14px;color:var(--muted)}nav.crumbs a{color:var(--muted)}
h1{font:400 clamp(32px,6vw,48px)/1.1 "Marcellus SC",serif;margin:16px 0 4px}h2{font:400 22px/1.2 "Marcellus SC",serif;margin:36px 0 12px;border-bottom:1px solid var(--rule);padding-bottom:8px}
.sub{color:var(--muted);font-size:18px;margin:0 0 12px}.tags{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 20px;padding:0;list-style:none}
.tags li{border:1px solid var(--c);color:var(--c);border-radius:99px;padding:2px 12px;font-size:13px}
.hero{display:grid;grid-template-columns:minmax(0,260px) 1fr;gap:24px;align-items:start}.hero img{width:100%;border-radius:14px;display:block;background:var(--panel)}
@media (max-width:640px){.hero{grid-template-columns:1fr}.hero img{max-width:320px}}
.lead{font-family:Alegreya,serif;font-size:19px;margin:0}.src{font-size:13px;color:var(--muted)}
dl{display:grid;grid-template-columns:max-content 1fr;gap:6px 20px;margin:0}dt{color:var(--muted)}dd{margin:0}
ul.people{list-style:none;padding:0;margin:0;display:flex;flex-wrap:wrap;gap:8px}ul.people li a{display:inline-block;background:var(--panel);border:1px solid var(--rule);border-radius:10px;padding:6px 12px;text-decoration:none;color:var(--ink)}ul.people li a:hover{border-color:var(--gold)}
.gal{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;margin:0;padding:0;list-style:none}.gal img{width:100%;aspect-ratio:3/4;object-fit:cover;border-radius:10px}.gal figcaption{font-size:13px;color:var(--muted)}figure{margin:0}
.cta{display:inline-block;margin-top:28px;background:var(--gold);color:#16130c;padding:10px 18px;border-radius:99px;text-decoration:none;font-weight:600}
.note{border-left:3px solid var(--gold);padding:4px 0 4px 14px;color:var(--muted)}footer{margin-top:48px;font-size:13px;color:var(--muted)}
.az h2{margin-top:28px}.az ul.people li a small{color:var(--muted)}`;

const page = ({ title, desc, canonical, image, body, jsonld }) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
${GA}
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="icon" href="/favicon.ico" sizes="48x48"><link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="article"><meta property="og:site_name" content="${NAME}">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${canonical}">${image ? `<meta property="og:image" content="${image}">` : ""}
<meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&family=Marcellus+SC&family=Alegreya&display=swap">
<style>${CSS}</style>
<script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, "\\u003c")}</script>
</head><body><div class="wrap">
${body}
<footer>${NAME} · family trees of Tolkien's Elves, Men, Hobbits and Dwarves. <a href="/">Open the interactive tree</a> · <a href="/characters/">All characters A–Z</a></footer>
</div></body></html>
`;

const crumbsLd = items => ({ "@type": "BreadcrumbList", itemListElement: items.map(([name, url], i) => ({ "@type": "ListItem", position: i + 1, name, item: SITE + url })) });

/* ---- character pages ---- */
const out = path.join(root, "characters");
fs.rmSync(out, { recursive: true, force: true });
const entries = [];

for (const [name, apps] of byName) {
  const first = apps[0], o = first.o, key = wt(name), det = key && DETAILS[key];
  const subs = uniq(apps.map(a => a.o.s).filter(Boolean));
  const tabs = uniq(apps.map(a => a.tab));
  const parents = uniq(apps.map(a => a.parent && PEOPLE[a.parent].o.n).filter(n => n && isPerson(n)));
  const kids = uniq(apps.flatMap(a => a.kids.map(k => PEOPLE[k].o.n)).filter(isPerson));
  const sibs = uniq(apps.flatMap(a => a.parent ? PEOPLE[a.parent].kids.map(k => PEOPLE[k].o.n) : []).filter(n => n !== name && isPerson(n)));
  const spouse = uniq(apps.map(a => a.o.sp).filter(Boolean));
  const notes = uniq(apps.map(a => a.o.nt).filter(Boolean));
  const img = (key && PORTRAITS[key]) || (key && GALLERY[key] && GALLERY[key][0].f) || null;
  const gal = (key && GALLERY[key] || []).filter(g => g.f !== img).slice(0, 6);
  const lineage = tabs.map(tabLabel).join(" & ");
  const canonical = SITE + urlOf(name);

  const title = `${name}: Family Tree, Parents & Children | ${NAME}`;
  const lead = det ? det.s : `${name}${subs[0] ? `, ${subs[0]}` : ""}, in the ${lineage} family tree of Middle-earth.`;
  const descBits = [`${name}${subs[0] ? ` (${subs[0]})` : ""}.`, det ? det.s : "",
    parents.length ? `Child of ${parents.join(" and ")}.` : "", kids.length ? `Parent of ${kids.slice(0, 3).join(", ")}${kids.length > 3 ? " and more" : ""}.` : ""];
  const desc = clip(descBits.filter(Boolean).join(" "), 158);

  const facts = (det && det.f || []).filter(([k]) => !/^(Spouse|Children|Parentage|Siblings)$/i.test(k));
  const ap = key && APPEAR[key], aw = ap ? ap.w : tabs.includes("rop") ? ["rop"] : o.k ? ["lotrf"] : [], aa = ap ? ap.a : [];
  const appears = [
    aa.length && `<dt>When</dt><dd>${aa.map(k => AGEN[k]).join(" → ")}</dd>`,
    ...["Books", "Films", "Series"].map(g => { const l = Object.keys(WORKS).filter(k => aw.includes(k) && WORKS[k][0] === g);
      return l.length && `<dt>${g}</dt><dd>${l.map(k => `${esc(WORKS[k][1])} (${esc(WORKS[k][2])})`).join("; ")}</dd>` }),
  ].filter(Boolean).join("");
  const fam = [
    parents.length && `<dt>Parent${parents.length > 1 ? "s" : ""}</dt><dd>${parents.map(link).join(", ")}</dd>`,
    spouse.length && `<dt>Spouse</dt><dd>${spouse.map(s => s.split(/,\s*/).map(p => link(p.replace(/\s*\((1st|2nd)\)$/, ""))).join(", ")).join("; ")}</dd>`,
    kids.length && `<dt>Children</dt><dd>${kids.map(link).join(", ")}</dd>`,
    sibs.length && `<dt>Siblings</dt><dd>${sibs.map(link).join(", ")}</dd>`,
  ].filter(Boolean).join("");

  const body = `<nav class="crumbs" aria-label="Breadcrumb"><a href="/">${NAME}</a> › <a href="/characters/">Characters</a> › ${esc(name)}</nav>
<article>
<h1>${esc(name)}</h1>
${subs.length ? `<p class="sub">${esc(subs.join(" · "))}</p>` : ""}
<ul class="tags">${tabs.map(t => `<li style="--c:${colour(t)}">${esc(tabLabel(t))}</li>`).join("")}${o.k ? `<li style="--c:var(--gold)">★ Key character</li>` : ""}</ul>
<div class="hero">${img ? `<img src="/${img}" alt="${esc(name)}" width="260" height="347">` : ""}<div>
<p class="lead">${esc(lead)}</p>
${det ? `<p class="src">From the <a href="${esc(det.u)}" rel="noopener">Lord of the Rings Wiki</a> (CC BY-SA).</p>` : ""}
</div></div>
${fam ? `<h2>Family of ${esc(name)}</h2><dl>${fam}</dl>` : ""}
${notes.map(n => `<p class="note">${esc(n)}</p>`).join("")}
${facts.length ? `<h2>Facts</h2><dl>${facts.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}</dl>` : ""}
${appears ? `<h2>Where and when ${esc(name)} appears</h2><dl>${appears}</dl>` : ""}
${gal.length ? `<h2>Images of ${esc(name)}</h2><ul class="gal">${gal.map(g => `<li><figure><img src="/${g.f}" alt="${esc(g.c || name)}" loading="lazy"><figcaption>${esc(g.c || "")}</figcaption></figure></li>`).join("")}</ul>` : ""}
${kids.length || sibs.length ? `<h2>Related characters</h2><ul class="people">${uniq([...parents, ...kids, ...sibs]).filter(n => byName.has(n)).map(n => `<li><a href="${urlOf(n)}">${esc(n)}</a></li>`).join("")}</ul>` : ""}
<a class="cta" href="/#${first.id}">See ${esc(name)} in the interactive family tree →</a>
</article>`;

  const person = { "@type": "Person", name, description: lead, url: canonical,
    ...(img && { image: SITE + "/" + img }),
    ...(parents.length && { parent: parents.map(n => ({ "@type": "Person", name: n, ...(byName.has(n) && { url: SITE + urlOf(n) }) })) }),
    ...(kids.length && { children: kids.map(n => ({ "@type": "Person", name: n, url: SITE + urlOf(n) })) }),
    ...(spouse.length && { spouse: spouse.flatMap(s => s.split(/,\s*/)).map(n => ({ "@type": "Person", name: n.replace(/\s*\((1st|2nd)\)$/, "") })) }),
    ...(det && { sameAs: det.u }) };
  const jsonld = { "@context": "https://schema.org", "@graph": [
    { "@type": "WebPage", "@id": canonical, url: canonical, name: title, description: desc, isPartOf: { "@type": "WebSite", name: NAME, url: SITE + "/" }, about: person, ...(img && { primaryImageOfPage: SITE + "/" + img }) },
    crumbsLd([[NAME, "/"], ["Characters", "/characters/"], [name, urlOf(name)]])] };

  const dir = path.join(out, slug(name));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), page({ title, desc, canonical, image: img && SITE + "/" + img, body, jsonld }));
  entries.push({ name, tabs, sub: subs[0] });
}

/* ---- A-Z index, grouped by lineage ---- */
const sorted = [...entries].sort((a, b) => a.name.localeCompare(b.name));
const azBody = `<nav class="crumbs" aria-label="Breadcrumb"><a href="/">${NAME}</a> › Characters</nav>
<h1>All characters</h1>
<p class="sub">${entries.length} Elves, Men, Hobbits and Dwarves of Tolkien's Middle-earth, each with their parents, spouse and children.</p>
<div class="az">${ORDER.map(k => {
    const list = sorted.filter(e => e.tabs.includes(k));
    return `<h2>${esc(T[k].label)}</h2><ul class="people">${list.map(e => `<li><a href="${urlOf(e.name)}">${esc(e.name)}${e.sub ? ` <small>${esc(clip(e.sub, 40))}</small>` : ""}</a></li>`).join("")}</ul>`;
  }).join("")}</div>
<a class="cta" href="/">Open the interactive family tree →</a>`;
fs.writeFileSync(path.join(out, "index.html"), page({
  title: `All Middle-earth Characters A–Z: Family Trees | ${NAME}`,
  desc: `Every character in the family trees of Tolkien's Middle-earth: ${entries.length} Elves, Men, Hobbits and Dwarves with their parents, spouses and children.`,
  canonical: SITE + "/characters/", image: null, body: azBody,
  jsonld: { "@context": "https://schema.org", "@graph": [
    { "@type": "CollectionPage", url: SITE + "/characters/", name: `All characters | ${NAME}` },
    crumbsLd([[NAME, "/"], ["Characters", "/characters/"]])] } }));

/* ---- sitemap and robots ---- */
const urls = ["/", "/characters/", ...sorted.map(e => urlOf(e.name))];
fs.writeFileSync(path.join(root, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `<url><loc>${SITE}${encodeURI(u)}</loc><lastmod>${today}</lastmod></url>`).join("\n")}
</urlset>
`);
fs.writeFileSync(path.join(root, "robots.txt"), `User-agent: *\nAllow: /\nDisallow: /tools/\n\nSitemap: ${SITE}/sitemap.xml\n`);

console.log(`${entries.length} character pages, index, sitemap.xml (${urls.length} urls), robots.txt`);
