// ============================================================
//  data.typ — resume content loaded from JSON at compile time.
//
//  The web app writes the resolved ResumeDocument to `resume.json`
//  in the compiler's virtual filesystem (see lib/typst-pdf.ts), and
//  this module decodes it. The shape mirrors
//  packages/shared-types/src/resume.ts.
// ============================================================

#let resume-data = json("resume.json")
