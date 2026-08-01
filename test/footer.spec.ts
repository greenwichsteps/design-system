import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(__dirname, "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");
const footer = () => read("components/footer.css");

describe(".ds-footer shell", () => {
  it("ships every shell class", () => {
    for (const cls of ["__cols", "__id", "__label", "__list", "__link", "__base"]) {
      expect(footer(), `missing .ds-footer${cls}`).toContain(`.ds-footer${cls}`);
    }
  });

  it("uses an auto-fit grid so it serves any group count", () => {
    // Not a fixed track list: that would bake one site's group structure into
    // the kit, which is the thing the promotion rule exists to prevent.
    expect(footer()).toMatch(/grid-template-columns:\s*repeat\(auto-fit,\s*minmax\([^)]+\)\)/);
    // Reject any space-separated fr values (fixed track list), but allow the
    // legitimate minmax(9rem, 1fr) which has only one fr value.
    expect(footer()).not.toMatch(/grid-template-columns:[^}]*\d+\.?\d*fr\s+[^}]*\d+\.?\d*fr/);
  });

  it("stacks without a media query", () => {
    expect(footer()).not.toContain("@media");
  });

  it("sizes the footer brand from the token", () => {
    expect(footer()).toMatch(/\.ds-footer__id img\s*\{[^}]*height:\s*var\(--ds-brand-foot-h/);
  });

  it("does not underline footer links", () => {
    // A wall of navigation, not prose. .ds-link is right for a link in a
    // sentence and wrong here; both sites had already made this call locally.
    expect(footer()).toMatch(/\.ds-footer__link\s*\{[^}]*text-decoration:\s*none/);
  });

  it("is listed as promoted in the pattern ledger", () => {
    expect(read("PATTERNS.md")).toMatch(/promoted → `components\/footer\.css`/);
  });
});
