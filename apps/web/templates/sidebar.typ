// ============================================================
//  sidebar.typ — Variant C: dark slate left rail, mono-forward
// ============================================================
#import "theme.typ": *

#let rail-rule = rgb("#46505F")

#let sidebar(d) = {
  set page(
    paper: "us-letter",
    margin: 0pt,
    background: place(top + left, rect(width: 2.35in, height: 100%, fill: slate-deep)),
  )
  set text(font: sans, size: 9.5pt, fill: n800)
  set par(leading: 0.6em, spacing: 0.8em)

  grid(
    columns: (2.35in, 1fr),

    // ---------- dark left rail ----------
    pad(left: 0.42in, right: 0.3in, top: 0.6in, bottom: 0.5in)[
      #rect(width: 30pt, height: 4pt, fill: leaf)
      #v(14pt)
      #text(font: display, size: 21pt, weight: 800, fill: white, tracking: -0.02em)[#d.basics.name]
      #v(7pt)
      #text(font: mono, size: 8.5pt, fill: leaf)[#d.basics.title]

      #sec-label("Contact", fill: leaf, rule: rail-rule, above: 20pt)
      #for c in (
        d.contact.at("location", default: none),
        d.contact.at("email", default: none),
        d.contact.at("phone", default: none),
        d.contact.at("website", default: none),
      ).filter(x => x != none and x != "") {
        block(below: 4pt, width: 100%)[
          #text(font: mono, size: 8pt, fill: n300)[#c]
        ]
      }

      #if d.skills.len() > 0 {
        sec-label("Skills", fill: leaf, rule: rail-rule)
        skills-groups(d, name-fill: white, kw-fill: n300)
      }

      #if d.education.len() > 0 {
        sec-label("Education", fill: leaf, rule: rail-rule)
        for ed in d.education {
          block(below: 8pt, width: 100%)[
            #text(weight: 600, fill: white, size: 9pt)[#ed.school]
            #linebreak()
            #text(font: mono, size: 7.5pt, fill: n300)[#(
              ed.at("degree", default: ""), ed.at("period", default: ""),
            ).filter(x => x != "").join("  ·  ")]
          ]
        }
      }
    ],

    // ---------- main column ----------
    pad(left: 0.4in, right: 0.58in, top: 0.6in, bottom: 0.5in)[
      #if d.basics.at("summary", default: "") != "" {
        sec-label("Summary", above: 0pt)
        text(fill: n700)[#d.basics.summary]
      }
      #if d.experience.len() > 0 {
        sec-label("Experience")
        for e in d.experience { exp-entry(e) }
      }
      #if d.projects.len() > 0 {
        sec-label("Projects")
        for p in d.projects { proj-entry(p) }
      }
    ],
  )
}
