// ============================================================
//  theme.typ — shared tokens + render helpers for all 3 layouts
//  Omni design language: Inter / Inter Tight / JetBrains Mono,
//  leaf-green accent, warm-slate ink.
// ============================================================

// ---------- Brand + neutral tokens ----------
#let leaf        = rgb("#7CB342")
#let leaf-dark   = rgb("#5C8A2E")
#let leaf-darker = rgb("#3F6320")
#let leaf-soft   = rgb("#EAF3DC")
#let slate       = rgb("#3E4A5B")
#let slate-deep  = rgb("#2A3340")

#let n900 = rgb("#14181F")
#let n800 = rgb("#232932")
#let n700 = rgb("#353C49")
#let n600 = rgb("#4D5666")
#let n500 = rgb("#6B7585")
#let n400 = rgb("#97A1B0")
#let n300 = rgb("#C2CAD6")
#let n200 = rgb("#DDE2EA")
#let hairline = n200

// ---------- Font stacks (graceful fallback) ----------
#let sans    = ("Inter", "Helvetica Neue", "Arial", "Liberation Sans")
#let display = ("Inter Tight", "Inter", "Helvetica Neue", "Arial")
#let mono    = ("JetBrains Mono", "DejaVu Sans Mono", "Consolas")

// ---------- Small utilities ----------

// Join an array of content/none with a faint middot separator.
#let joined(parts, sep-fill: n400) = {
  let p = parts.filter(x => x != none)
  for (i, x) in p.enumerate() {
    if i > 0 { text(fill: sep-fill)[ #h(3pt) · #h(3pt) ] }
    x
  }
}

// Square leaf bullet list.
#let bullets(items, fill: leaf, gap: 0.5em) = list(
  marker: box(baseline: -1.5pt, rect(width: 4pt, height: 4pt, radius: 0.5pt, fill: fill)),
  body-indent: 7pt,
  indent: 1pt,
  spacing: gap,
  ..items.map(it => [#it]),
)

// Section eyebrow label + hairline rule.
#let sec-label(txt, fill: leaf-darker, rule: hairline, above: 15pt) = block(
  above: above, below: 7pt, width: 100%,
)[
  #text(font: sans, size: 8.5pt, weight: 600, fill: fill, tracking: 0.13em)[#upper(txt)]
  #v(3pt)
  #line(length: 100%, stroke: 0.5pt + rule)
]

// Role + right-aligned period on one row.
#let entry-head(role, period, fill: n900, size: 10.8pt, pfill: n500) = grid(
  columns: (1fr, auto),
  column-gutter: 10pt,
  align: (left + bottom, right + bottom),
  text(font: display, size: size, weight: 600, fill: fill, tracking: -0.005em)[#role],
  if period != none and period != "" {
    text(font: mono, size: 8pt, fill: pfill)[#period]
  } else { [] },
)

// ---------- Shared section renderers ----------

// Resolve a "period" label from an entry/sub-role dict that may carry either an
// explicit `period` string or `startDate`/`endDate` parts.
#let resolve-period(e) = {
  let p = e.at("period", default: none)
  if p != none and p != "" { return p }
  let s = e.at("startDate", default: "")
  let en = e.at("endDate", default: "")
  if s == "" and en == "" { return none }
  let start = if s != "" { s } else { "Present" }
  if en != "" { start + " — " + en } else { start }
}

// Render one sub-role: its title + period and bullets, kept together so a
// single role never splits across a page break.
#let sub-role-block(r, above: 7pt) = block(above: above, below: 0pt, width: 100%, breakable: false)[
  #entry-head(r.role, resolve-period(r), size: 9.6pt, fill: slate-deep)
  #let rh = r.at("highlights", default: ())
  #if rh.len() > 0 [ #v(3pt) #bullets(rh) ]
]

#let exp-entry(e, gap: 11pt) = {
  let roles = e.at("roles", default: ())
  if roles.len() > 0 {
    // Nested (multi-role) entry. These are inherently tall (a company with
    // several roles), so the entry itself is breakable across pages — otherwise
    // it orphans to the next page and leaves a large gap. We still glue the
    // company header to its first role (so the header never strands at a page
    // bottom) and keep each role's bullets together via `sub-role-block`.
    let loc = e.at("location", default: "")
    let header = {
      entry-head(e.company, resolve-period(e))
      if loc != "" {
        v(1.5pt)
        text(size: 9pt, fill: n600)[#text(fill: slate, weight: 600)[#loc]]
      }
    }
    block(below: gap, breakable: true, width: 100%)[
      // Header + first role glued together (non-breakable) to avoid a stranded
      // company heading; remaining roles flow and may break between roles.
      #if roles.len() > 0 {
        block(breakable: false, width: 100%)[
          #header
          #sub-role-block(roles.at(0))
        ]
        for r in roles.slice(1) { sub-role-block(r) }
      } else {
        header
      }
    ]
  } else {
    // Flat entry: legacy single-role rendering — kept together as one block.
    block(below: gap, breakable: false, width: 100%)[
      #entry-head(e.role, resolve-period(e))
      #v(1.5pt)
      #text(size: 9pt, fill: n600)[#joined((
        text(fill: slate, weight: 600)[#e.company],
        if e.at("location", default: "") != "" { e.location } else { none },
      ))]
      #let h = e.at("highlights", default: ())
      #if h.len() > 0 [ #v(4pt) #bullets(h) ]
    ]
  }
}

#let proj-entry(p, gap: 11pt) = block(below: gap, breakable: false, width: 100%)[
  #let url = p.at("url", default: "")
  #let url-label = if url != "" {
    link(url)[#text(fill: leaf-dark)[#url.replace("https://", "").replace("http://", "")]]
  } else { none }
  #entry-head(p.name, url-label)
  #if p.at("description", default: "") != "" [
    #v(1.5pt)
    #text(size: 9pt, fill: n600)[#p.description]
  ]
  #let h = p.at("highlights", default: ())
  #if h.len() > 0 [ #v(4pt) #bullets(h) ]
]

#let edu-entry(ed, gap: 9pt) = block(below: gap, breakable: false, width: 100%)[
  #entry-head(ed.school, ed.at("period", default: none))
  #v(1.5pt)
  #let meta = (
    ed.at("degree", default: ""),
    ed.at("field", default: ""),
  ).filter(x => x != "")
  #if meta.len() > 0 {
    text(font: mono, size: 8pt, fill: n600)[#meta.join("  ·  ")]
  }
  #let h = ed.at("highlights", default: ())
  #if h.len() > 0 [ #v(4pt) #bullets(h) ]
]

// Skills as inline "Group: kw, kw" lines (classic layout).
#let skills-inline(d) = {
  set par(leading: 0.7em)
  for s in d.skills [
    #text(fill: slate, weight: 600)[#s.name:] #h(2pt) #s.keywords.join(", ") \
  ]
}

// Skills as stacked groups (sidebar / rail layouts).
#let skills-groups(d, name-fill: slate-deep, kw-fill: n600, kw-sep: " · ") = {
  for s in d.skills {
    block(below: 9pt, width: 100%)[
      #text(weight: 600, fill: name-fill, size: 9pt)[#s.name]
      #linebreak()
      #text(fill: kw-fill, size: 8.5pt)[#s.keywords.join(kw-sep)]
    ]
  }
}
