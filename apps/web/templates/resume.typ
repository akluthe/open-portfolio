// ============================================================
//  resume.typ — entry point. The web app selects the layout via
//  `sys.inputs.style` (passed through the WASM compiler's `inputs`
//  option) and supplies the data through `resume.json` in the
//  virtual filesystem.
//
//  Styles: "classic" | "twocol" | "sidebar"
// ============================================================
#import "data.typ": resume-data
#import "classic.typ": classic
#import "twocol.typ": twocol
#import "sidebar.typ": sidebar

#let style = sys.inputs.at("style", default: "classic")

#let layouts = (
  classic: classic,
  twocol: twocol,
  sidebar: sidebar,
)

#if not layouts.keys().contains(style) {
  panic("Unknown style '" + style + "'. Use one of: classic, twocol, sidebar.")
}

#(layouts.at(style))(resume-data)
