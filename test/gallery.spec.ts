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

  // GRE-597. The roles only make sense side by side: a lede shown alone does not show
  // how it differs from a paragraph, nor a note from a field hint.
  it("demonstrates all four text roles together in one section", () => {
    const html = readFileSync(join(root, "gallery/sections/text-roles.html"), "utf8").replace(/<!--[\s\S]*?-->/g, "");
    for (const cls of ["ds-lede", "ds-note", "ds-help"])
      expect(html).toMatch(new RegExp(`class="[^"]*\\b${cls}\\b[^"]*"`));
    expect(html).toMatch(/<p>[^<]+<\/p>/); // a plain, unclassed paragraph
    expect(html).toMatch(/class="[^"]*\bds-field\b/); // the hint sits in a real field
  });

  // GRE-615. The app set is only legible as a whole screen, so one section composes it.
  it("demonstrates the app set as one composed screen", () => {
    const html = readFileSync(join(root, "gallery/sections/app.html"), "utf8").replace(/<!--[\s\S]*?-->/g, "");
    for (const cls of ["ds-app", "ds-sidenav__item", "ds-pagehead", "ds-list__row", "ds-settings__section", "ds-message--danger", "ds-message--success", "ds-stack"])
      expect(html, cls).toMatch(new RegExp(`class="[^"]*\\b${cls}\\b[^"]*"`));
    expect(html).toMatch(/<a[^>]*class="[^"]*\bds-sidenav__item\b[^"]*"[^>]*aria-current="page"|<a[^>]*aria-current="page"[^>]*class="[^"]*\bds-sidenav__item\b/);
    const field = html.match(/<div[^>]*class="[^"]*\bds-field\b[^"]*"[^>]*data-invalid[^>]*>[\s\S]*?<\/div>\s*<\/div>|<div[^>]*data-invalid[^>]*class="[^"]*\bds-field\b[^"]*"[^>]*>[\s\S]*?<\/div>/);
    expect(field).not.toBeNull();
    const describedby = field![0].match(/aria-describedby="([^"]+)"/);
    expect(describedby).not.toBeNull();
    expect(field![0]).toMatch(new RegExp(`id="${describedby![1]}"[^>]*class="[^"]*\\bds-help\\b|class="[^"]*\\bds-help\\b[^"]*"[^>]*id="${describedby![1]}"`));
  });
});
