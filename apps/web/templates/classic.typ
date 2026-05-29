// ============================================================
//  classic.typ — Variant A: classic single column
// ============================================================
#import "theme.typ": *

#let classic(d) = {
  set page(
    paper: "us-letter",
    margin: (x: 0.82in, top: 0.6in, bottom: 0.62in),
    background: place(top, rect(width: 100%, height: 4pt, fill: leaf)),
  )
  set text(font: sans, size: 9.7pt, fill: n800)
  set par(leading: 0.6em, spacing: 0.82em)

  // ---- Header (centered) ----
  align(center)[
    #text(font: display, size: 22pt, weight: 800, fill: slate-deep, tracking: -0.01em)[#d.basics.name]
    #v(5pt)
    #text(font: sans, size: 9.5pt, weight: 600, fill: leaf-darker, tracking: 0.12em)[#upper(d.basics.title)]
    #v(6pt)
    #let c = (
      d.contact.at("location", default: none),
      d.contact.at("email", default: none),
      d.contact.at("phone", default: none),
      d.contact.at("website", default: none),
    ).filter(x => x != none and x != "")
    #text(font: mono, size: 8pt, fill: n600)[#c.join("   ·   ")]
  ]
  v(4pt)
  line(length: 100%, stroke: 0.5pt + hairline)

  // ---- Summary ----
  let summary = d.basics.at("summary", default: "")
  if summary != "" {
    sec-label("Summary", above: 13pt)
    text(fill: n700)[#summary]
  }

  // ---- Experience ----
  if d.experience.len() > 0 {
    sec-label("Experience")
    for e in d.experience { exp-entry(e) }
  }

  // ---- Skills ----
  if d.skills.len() > 0 {
    sec-label("Skills")
    skills-inline(d)
  }

  // ---- Projects ----
  if d.projects.len() > 0 {
    sec-label("Projects")
    for p in d.projects { proj-entry(p) }
  }

  // ---- Education ----
  if d.education.len() > 0 {
    sec-label("Education")
    for ed in d.education { edu-entry(ed) }
  }
}
