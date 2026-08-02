import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(__dirname, "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");
const layout = () => read("components/layout.css");

describe("nav toggle", () => {
  it("is hidden by default", () => {
    expect(layout()).toMatch(/\[data-ds-nav-toggle\]\s*\{[^}]*display:\s*none/);
  });

  it("does not shrink, so it cannot fall under the tap-target minimum", () => {
    // It is the only shrinkable child in the .ds-nav flex row, so without this it
    // absorbs the entire deficit at narrow widths and drops to roughly 22px.
    expect(layout()).toMatch(/\[data-ds-nav-toggle\]\s*\{[^}]*flex-shrink:\s*0/);
  });

  it("reveals at the same breakpoint that hides the links", () => {
    // The pairing is the whole point: a nav shows links or a toggle, never both.
    // Two different breakpoints would produce a window showing both or neither.
    const css = layout();
    const linkBreakpoints = [...css.matchAll(/@media\s*\(max-width:\s*(\d+)px\)[^{]*\{[^@]*\.ds-nav__links\s*\{[^}]*display:\s*none/g)]
      .map((m) => m[1]);
    const toggleBreakpoints = [...css.matchAll(/@media\s*\(max-width:\s*(\d+)px\)[^@]*\[data-ds-nav-toggle\]\s*\{[^}]*display:\s*inline-flex/g)]
      .map((m) => m[1]);
    expect(linkBreakpoints.length, "no media query hides .ds-nav__links").toBeGreaterThan(0);
    expect(toggleBreakpoints.length, "no media query reveals the toggle").toBeGreaterThan(0);
    expect(toggleBreakpoints[0]).toBe(linkBreakpoints[0]);
  });

  it("centres its glyph whichever display mode it displaces", () => {
    // This rule's display beats .ds-iconbtn's (equal specificity, and button.css
    // sorts before layout.css), turning an inline-grid box into a flex one.
    // .ds-iconbtn centres with place-items, and justify-items does nothing on a
    // flex container, so without these the glyph falls to flex-start in its 40px
    // square. Both live sites have exactly this bug today.
    const decls = /\[data-ds-nav-toggle\]\s*\{([^}]*)\}/.exec(layout())?.[1] ?? "";
    expect(decls).toMatch(/align-items:\s*center/);
    expect(decls).toMatch(/justify-content:\s*center/);
  });

  it("is demonstrated in the gallery with its breakpoint stated", () => {
    // The gallery renders at desktop, where the toggle is now correctly hidden,
    // so the section has to say so or it looks like a missing feature.
    // Anchored to the paragraph directly after the nav demo: a bare file-wide
    // search for "720px" would be satisfied by any stray mention anywhere, and
    // the toggle attribute alone was already present before this change.
    const section = read("gallery/sections/layout-overlay.html");
    const note = /<\/nav>\s*<p class="ds-help">([\s\S]*?)<\/p>/.exec(section);
    expect(note, "no ds-help line directly follows the nav demo").not.toBeNull();
    expect(note![1]).toMatch(/720px/);
  });

  it("is recorded as promoted in the pattern ledger", () => {
    expect(read("PATTERNS.md")).toMatch(/nav-toggle/);
  });
});
