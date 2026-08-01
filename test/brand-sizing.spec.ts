import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(__dirname, "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");
const layout = () => read("components/layout.css");

function rule(css: string, selector: string): string | undefined {
  const re = new RegExp(`(^|\\})\\s*${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`, "m");
  return re.exec(css)?.[2];
}

describe("brand sizing", () => {
  it("does not pin a height on the brand anchor", () => {
    // A fixed anchor height clips nothing and grows nothing: a taller mark just
    // overflows it, so the bar silently refuses to accommodate the asset.
    const decls = rule(layout(), ".ds-nav__brand");
    expect(decls, ".ds-nav__brand rule not found").toBeTruthy();
    expect(decls).not.toMatch(/(^|;)\s*height\s*:/);
  });

  it("sizes the brand image from a token", () => {
    expect(layout()).toMatch(/\.ds-nav__brand img\s*\{[^}]*height:\s*var\(--ds-brand-nav-h/);
  });

  it("uses padding-block on .ds-nav, never the padding shorthand", () => {
    // .ds-nav sits inside .ds-container. `padding: X 0` would zero the
    // container's padding-inline if the two were ever combined on one element,
    // putting the bar's contents 24px left of every section's.
    const decls = rule(layout(), ".ds-nav");
    expect(decls, ".ds-nav rule not found").toBeTruthy();
    expect(decls).not.toMatch(/(^|;)\s*padding\s*:/);
    expect(decls).toMatch(/padding-block:\s*var\(--ds-space-2\)/);
  });

  it("declares both brand height tokens in every brand theme", () => {
    for (const brand of ["farnsworth", "burnside"]) {
      const css = read(`themes/${brand}.css`);
      expect(css, `${brand} missing --ds-brand-nav-h`).toContain("--ds-brand-nav-h");
      expect(css, `${brand} missing --ds-brand-foot-h`).toContain("--ds-brand-foot-h");
    }
  });

  it("gives Burnside a taller footer mark than Farnsworth", () => {
    // Burnside's footer uses the stacked mark (2.27:1), Farnsworth's is one line
    // (7.41:1). Matching glyph size means Burnside's box must be far taller.
    const grab = (b: string) =>
      Number(/--ds-brand-foot-h:\s*(\d+)px/.exec(read(`themes/${b}.css`))?.[1]);
    expect(grab("burnside")).toBeGreaterThan(grab("farnsworth"));
  });
});

describe("chrome scale", () => {
  it("scales nav links below body size", () => {
    expect(layout()).toMatch(/\.ds-nav__links\s*\{[^}]*font-size:\s*var\(--ds-text-sm\)/);
  });

  it("trims .ds-btn horizontal padding to space-4", () => {
    const decls = rule(read("components/button.css"), ".ds-btn");
    expect(decls).toMatch(/padding:\s*var\(--ds-space-3\)\s+var\(--ds-space-4\)/);
  });

  it("keeps .ds-btn--sm after .ds-btn in source order", () => {
    // Equal specificity: --sm wins only by coming later. A future edit that
    // reorders them silently inflates every small button back to full size.
    const css = read("components/button.css");
    expect(css.indexOf(".ds-btn--sm")).toBeGreaterThan(css.indexOf(".ds-btn {"));
  });
});
