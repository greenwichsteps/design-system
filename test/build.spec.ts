import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
const root = join(__dirname, "..");

describe("build", () => {
  it("emits ui.css with reset first", () => {
    const css = readFileSync(join(root, "dist/ui.css"), "utf8");
    expect(css).toContain("box-sizing: border-box");
  });
  it("emits tokens.css with primitives + semantics", () => {
    const t = readFileSync(join(root, "dist/tokens.css"), "utf8");
    expect(t).toContain("--ds-ink: #121317");
    expect(t).toContain("--ds-bg: var(--ds-paper)");
  });
  it("emits themes, fonts.css and ui.js", () => {
    expect(existsSync(join(root, "dist/themes/burnside.css"))).toBe(true);
    expect(existsSync(join(root, "dist/themes/farnsworth.css"))).toBe(true);
    expect(existsSync(join(root, "dist/themes/dark.css"))).toBe(true);
    expect(existsSync(join(root, "dist/fonts.css"))).toBe(true);
    expect(existsSync(join(root, "dist/ui.js"))).toBe(true);
  });
});
