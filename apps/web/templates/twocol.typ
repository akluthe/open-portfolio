// ============================================================
//  twocol.typ — Variant B: two column, leaf-soft right rail
// ============================================================
#import "theme.typ": *

#let twocol(d) = {
  set page(
    paper: "us-letter",
    margin: 0pt,
    background: place(top + right, rect(width: 2.55in, height: 100%, fill: leaf-soft)),
  )
  set text(font: sans, size: 9.5pt, fill: n800)
  set par(leading: 0.6em, spacing: 0.8em)

  grid(
    columns: (1fr, 2.55in),

    // ---------- main column ----------
    pad(left: 0.6in, right: 0.34in, top: 0.62in, bottom: 0.5in)[
      #text(font: display, size: 26pt, weight: 800, fill: slate-deep, tracking: -0.02em)[#d.basics.name]
      #v(6pt)
      #text(font: sans, size: 9pt, weight: 600, fill: leaf-darker, tracking: 0.13em)[#upper(d.basics.title)]
      #if d.basics.at("summary", default: "") != "" [
        #v(10pt)
        #text(fill: n700)[#d.basics.summary]
      ]
      #if d.experience.len() > 0 {
        sec-label("Experience")
        for e in d.experience { exp-entry(e) }
      }
      #if d.projects.len() > 0 {
        sec-label("Projects")
        for p in d.projects { proj-entry(p) }
      }
    ],

    // ---------- right rail ----------
    pad(left: 0.3in, right: 0.5in, top: 0.66in, bottom: 0.5in)[
      #let crow(lbl, val) = if val != none and val != "" {
        block(below: 8pt, width: 100%)[
          #text(size: 7.5pt, weight: 600, fill: leaf-darker, tracking: 0.08em)[#upper(lbl)]
          #linebreak()
          #text(font: mono, size: 8pt, fill: n800)[#val]
        ]
      }
      #sec-label("Contact", above: 0pt)
      #crow("Location", d.contact.at("location", default: none))
      #crow("Email", d.contact.at("email", default: none))
      #crow("Phone", d.contact.at("phone", default: none))
      #crow("Website", d.contact.at("website", default: none))

      #if d.skills.len() > 0 {
        sec-label("Skills")
        skills-groups(d)
      }

      #if d.education.len() > 0 [
        #sec-label("Education")
        #for ed in d.education {
          block(below: 9pt, width: 100%)[
            #text(weight: 600, fill: slate-deep, size: 9pt)[#ed.school]
            #linebreak()
            #text(font: mono, size: 7.5pt, fill: n600)[#(
              ed.at("degree", default: ""), ed.at("period", default: ""),
            ).filter(x => x != "").join("  ·  ")]
          ]
        }
      ]
    ],
  )
}
