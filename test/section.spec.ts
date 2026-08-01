import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(__dirname, "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");
const section = () => read("components/section.css");

describe(".ds-section", () => {
  it("carries the block padding both sites already used", () => {
    expect(section()).toMatch(/\.ds-section\s*\{[^}]*padding-block:\s*var\(--ds-space-8\)/);
  });

  it("spaces the section title", () => {
    expect(section()).toMatch(/\.ds-section__title\s*\{[^}]*margin-bottom:\s*var\(--ds-space-5\)/);
  });

  it("divides adjacent sections only", () => {
    // Adjacent-sibling, not a border on every section: otherwise the first
    // draws a rule under the hero and the last draws one above the footer.
    expect(section()).toMatch(/\.ds-section \+ \.ds-section\s*\{[^}]*border-top:\s*1px solid var\(--ds-border\)/);
  });

  it("is listed as promoted in the pattern ledger", () => {
    expect(read("PATTERNS.md")).toMatch(/promoted → `components\/section\.css`/);
  });
});
