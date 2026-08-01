import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = join(__dirname, "..");
const sections = () =>
  readdirSync(join(root, "gallery/sections"))
    .filter((f) => f.endsWith(".html"))
    .map((f) => readFileSync(join(root, "gallery/sections", f), "utf8"))
    .join("\n");

describe("gallery coverage", () => {
  // GRE-149: hero shipped in v0.4.0 with no gallery section at all.
  // Assertions use regex to match class names as actual attribute tokens,
  // not prose substrings or collisions like "ds-section__title".
  it.each([
    { name: "ds-hero", pattern: /class="[^"]*\bds-hero\b[^"]*"/ },
    { name: "ds-header", pattern: /class="[^"]*\bds-header\b[^"]*"/ },
    { name: "ds-section", pattern: /class="[^"]*\bds-section\b[^"]*"/ },
    { name: "ds-footer__cols", pattern: /class="[^"]*\bds-footer__cols\b[^"]*"/ }
  ])(
    "demonstrates $name in a real class attribute",
    ({ pattern }) => { expect(sections()).toMatch(pattern); }
  );

  it("shows the short Burnside mark where the header is demonstrated", () => {
    expect(sections()).toContain("wordmark-short");
  });
});
