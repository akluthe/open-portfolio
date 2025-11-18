// Resume base template. Runtime inserts rendered sections at the marker below.
// Conforms to standard US letter dimensions so exported PDFs print cleanly.
#set page(width: 8.5in, height: 11in, margin: 0.8in)
#set text(font: "New Computer Modern", size: 11pt)
#set par(justify: true, leading: 1.3em)
#set heading(numbering: none)

{{CONTENT}}
