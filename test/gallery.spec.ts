import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { JSDOM } from "jsdom";

const root = join(__dirname, "..");
// True when `cls` is a whole token of some class attribute in `html`. Tokens are split on
// whitespace, so `ds-stack--tight` and `ds-app__main` never satisfy `ds-stack` or `ds-app`.
export function hasClassToken(html: string, cls: string): boolean {
  return [...html.matchAll(/\bclass="([^"]*)"/g)].some((m) => m[1].split(/\s+/).includes(cls));
}
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
    "ds-hero",
    "ds-header",
    "ds-section",
    "ds-footer__cols"
  ])(
    "demonstrates %s in a real class attribute",
    (cls) => { expect(hasClassToken(sections(), cls)).toBe(true); }
  );

  it("matches whole class tokens, never a longer class that contains the name", () => {
    expect(hasClassToken('<div class="ds-stack--tight">', "ds-stack")).toBe(false);
    expect(hasClassToken('<div class="ds-app__main ds-stack--loose">', "ds-app")).toBe(false);
    expect(hasClassToken('<div class="ds-app__main ds-app">', "ds-app")).toBe(true);
    expect(hasClassToken('<div class="x\n  ds-stack">', "ds-stack")).toBe(true);
  });

  // A static demo message is not a live announcement; role="alert" would be wrong in a real page.
  it("does not mark the static app demo as an alert", () => {
    const html = readFileSync(join(root, "gallery/sections/app.html"), "utf8").replace(/<!--[\s\S]*?-->/g, "");
    expect(html).not.toMatch(/role="alert"/);
  });

  it("shows the short Burnside mark where the header is demonstrated", () => {
    expect(sections()).toContain("wordmark-short");
  });

  // GRE-597. The roles only make sense side by side: a lede shown alone does not show
  // how it differs from a paragraph, nor a note from a field hint.
  it("demonstrates all four text roles together in one section", () => {
    const html = readFileSync(join(root, "gallery/sections/text-roles.html"), "utf8").replace(/<!--[\s\S]*?-->/g, "");
    for (const cls of ["ds-lede", "ds-note", "ds-help"])
      expect(hasClassToken(html, cls), cls).toBe(true);
    expect(html).toMatch(/<p>[^<]+<\/p>/); // a plain, unclassed paragraph
    // GRE-603: the hint sits INSIDE a real field, not merely beside one.
    const doc = new JSDOM(html).window.document;
    expect(doc.querySelector(".ds-field .ds-help")).not.toBeNull();
  });

  // GRE-615. The app set is only legible as a whole screen, so one section composes it.
  it("demonstrates the app set as one composed screen", () => {
    const html = readFileSync(join(root, "gallery/sections/app.html"), "utf8").replace(/<!--[\s\S]*?-->/g, "");
    for (const cls of ["ds-app", "ds-app__sidebar", "ds-app__sidebar-foot", "ds-sidenav__item", "ds-pagehead", "ds-list__row", "ds-list__main", "ds-settings__section", "ds-message--danger", "ds-message--success", "ds-stack"])
      expect(hasClassToken(html, cls), cls).toBe(true);
    expect(html).toMatch(/<a[^>]*class="[^"]*\bds-sidenav__item\b[^"]*"[^>]*aria-current="page"|<a[^>]*aria-current="page"[^>]*class="[^"]*\bds-sidenav__item\b/);
    // GRE-620: one item of each element, so the two can be compared by eye.
    expect(html).toMatch(/<button[^>]*class="[^"]*\bds-sidenav__item\b/);
    // GRE-617: a menu at the row end, using the end-aligned modifier.
    expect(html).toMatch(/<div[^>]*class="[^"]*\bds-menu\b[^"]*"/);
    expect(hasClassToken(html, "ds-menu--end")).toBe(true);
    // GRE-619: a row whose name is long enough to wrap on a phone, with an action after it.
    const mains = [...html.matchAll(/<span[^>]*class="[^"]*\bds-list__main\b[^"]*"[^>]*>([^<]*)<\/span>/g)].map((m) => m[1]);
    expect(mains.some((t) => t.length > 80 && /long name/i.test(t))).toBe(true);
    // GRE-603: read as a DOM, so the class match is a whole token (`ds-help-foo` fails)
    // and the hint must be inside the invalid field whose input it describes.
    const doc = new JSDOM(html).window.document;
    const input = doc.querySelector(".ds-field[data-invalid] [aria-describedby]");
    expect(input).not.toBeNull();
    const hint = doc.getElementById(input!.getAttribute("aria-describedby")!);
    expect(hint?.classList.contains("ds-help")).toBe(true);
    expect(hint!.closest(".ds-field")).toBe(input!.closest(".ds-field"));
  });
});
