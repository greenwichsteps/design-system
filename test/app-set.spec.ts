import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// GRE-615: the app set, the patterns Burnside's dashboard is built from. Selectors
// are matched as whole entries in a rule's selector list with comments stripped, so
// a longer class name or a comment that names a class cannot satisfy a test.
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const css = readFileSync(join(root, "dist/ui.css"), "utf8");

type Rule = { raw: string; selectors: string[]; body: string };

function stripComments(s: string): string {
  return s.replace(/\/\*[\s\S]*?\*\//g, "");
}

function parseRules(s: string): Rule[] {
  return [...s.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({
    raw: m[1].trim(),
    selectors: m[1].split(",").map((x) => x.trim()),
    body: m[2],
  }));
}

// Returns the body of every `@media <query> { ... }` block, found by brace matching,
// plus the stylesheet with those blocks removed so flat rules never include them.
function splitMedia(s: string, query: string): { flat: string; media: string[] } {
  const head = `@media ${query}`;
  const media: string[] = [];
  let flat = "";
  let i = 0;
  while (i < s.length) {
    const at = s.indexOf(head, i);
    if (at === -1) { flat += s.slice(i); break; }
    flat += s.slice(i, at);
    const open = s.indexOf("{", at);
    let depth = 1;
    let j = open + 1;
    while (depth > 0 && j < s.length) {
      if (s[j] === "{") depth++;
      else if (s[j] === "}") depth--;
      j++;
    }
    media.push(s.slice(open + 1, j - 1));
    i = j;
  }
  return { flat, media };
}

const QUERY = "(max-width: 720px)";
const WIDE = "(min-width: 721px)";
const clean = stripComments(css);
const wideSplit = splitMedia(clean, WIDE);
const split = splitMedia(wideSplit.flat, QUERY);
const wideRules = wideSplit.media.flatMap(parseRules);
const flatRules = parseRules(split.flat);
const mediaRules = split.media.flatMap(parseRules);

function decls(body: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const d of body.split(";")) {
    const k = d.indexOf(":");
    if (k === -1) continue;
    out[d.slice(0, k).trim()] = d.slice(k + 1).trim();
  }
  return out;
}

// Declarations of every flat rule whose selector list has `sel` as a whole entry.
function flat(sel: string): Record<string, string> {
  return Object.assign({}, ...flatRules.filter((r) => r.selectors.includes(sel)).map((r) => decls(r.body)));
}
function narrow(sel: string): Record<string, string> {
  return Object.assign({}, ...mediaRules.filter((r) => r.selectors.includes(sel)).map((r) => decls(r.body)));
}
function wide(sel: string): Record<string, string> {
  return Object.assign({}, ...wideRules.filter((r) => r.selectors.includes(sel)).map((r) => decls(r.body)));
}
function exists(sel: string, from = flatRules): boolean {
  return from.some((r) => r.selectors.includes(sel));
}

describe("app set: stack and radius scope", () => {
  it("spaces direct children with a stack gap that defaults to space-4", () => {
    expect(exists(".ds-stack > * + *")).toBe(true);
    expect(flat(".ds-stack > * + *")["margin-block-start"]).toBe("var(--ds-stack-gap, var(--ds-space-4))");
  });

  it("tight and loose only change the gap variable", () => {
    expect(flat(".ds-stack--tight")).toEqual({ "--ds-stack-gap": "var(--ds-space-2)" });
    expect(flat(".ds-stack--loose")).toEqual({ "--ds-stack-gap": "var(--ds-space-6)" });
  });

  // Custom properties inherit, so without this reset a plain stack nested in a
  // loose one would gap at the loose value. Source order is what lets the
  // modifiers (same specificity) win over the reset.
  it("every stack resets its own gap to space-4, before the modifiers", () => {
    expect(flat(".ds-stack")).toEqual({ "--ds-stack-gap": "var(--ds-space-4)" });
    const at = (sel: string) => flatRules.findIndex((r) => r.selectors.includes(sel));
    expect(at(".ds-stack")).toBeGreaterThanOrEqual(0);
    expect(at(".ds-stack")).toBeLessThan(at(".ds-stack--tight"));
    expect(at(".ds-stack")).toBeLessThan(at(".ds-stack--loose"));
  });

  it("never sets display on a stack rule", () => {
    const hits = flatRules.filter((r) => r.selectors.some((s) => /\.ds-stack\b/.test(s)) && "display" in decls(r.body));
    expect(hits).toEqual([]);
  });

  it("tightens the radii inside .ds-app and .ds-app-scope only", () => {
    const sel = ":where(.ds-app, .ds-app-scope)";
    const hits = flatRules.filter((r) => r.raw === sel);
    expect(hits).toHaveLength(1);
    expect(decls(hits[0].body)).toEqual({ "--ds-radius-md": "8px", "--ds-radius-lg": "12px" });
    // No other rule may set the radius tokens, in any block.
    const others = [...flatRules, ...mediaRules, ...wideRules].filter(
      (r) => r.raw !== sel && /--ds-radius-(md|lg)\s*:/.test(r.body));
    expect(others).toEqual([]);
  });

  it("sorts app.css before badge.css in the published stylesheet", () => {
    const a = css.indexOf("/* app.css */");
    const b = css.indexOf("/* badge.css */");
    expect(a).toBeGreaterThanOrEqual(0);
    expect(b).toBeGreaterThan(a);
  });
});

describe("app set: shell and side nav", () => {
  it("lays .ds-app out as a sidebar column and a flexible main column", () => {
    const d = flat(".ds-app");
    expect(d["display"]).toBe("grid");
    expect(d["grid-template-columns"]).toBe("248px minmax(0, 1fr)");
    expect(d["min-height"]).toBe("100vh");
  });

  it("collapses to one column at 720px", () => {
    expect(narrow(".ds-app")["grid-template-columns"]).toBe("minmax(0, 1fr)");
  });

  // A short sidebar must not be stretched by min-height: 100vh sharing spare height.
  it("sizes the narrow rows so only the main row takes spare height", () => {
    expect(narrow(".ds-app")["grid-template-rows"]).toBe("auto 1fr");
  });

  it("draws the sidebar as a bordered surface column", () => {
    const d = flat(".ds-app__sidebar");
    expect(d["border-right"]).toBe("1px solid var(--ds-border)");
    expect(d["background"]).toBe("var(--ds-surface)");
    expect(d["display"]).toBe("flex");
    expect(d["flex-direction"]).toBe("column");
    expect(d["padding"]).toBe("var(--ds-space-4) var(--ds-space-3)");
    expect(d["gap"]).toBe("var(--ds-space-5)");
  });

  // Above 720px the sidebar is pinned to the viewport and its nav grows, which pushes the
  // foot to the bottom with no margin (the margin guard below forbids margin-top: auto).
  it("pins the sidebar to the viewport above 720px and lets the nav grow", () => {
    const d = wide(".ds-app__sidebar");
    expect(d["position"]).toBe("sticky");
    expect(d["top"]).toBe("0");
    expect(d["height"]).toBe("100vh");
    expect(d["overflow-y"]).toBe("auto");
    expect(wide(".ds-app__sidebar .ds-sidenav")["flex"]).toBe("1 1 auto");
    // Under 720px nothing is pinned and the foot simply follows the nav.
    expect(narrow(".ds-app__sidebar")["position"]).toBeUndefined();
    expect(flat(".ds-app__sidebar")["position"]).toBeUndefined();
    expect(flat(".ds-sidenav")["flex"]).toBeUndefined();
  });

  it("stacks the sidebar foot as a column", () => {
    const d = flat(".ds-app__sidebar-foot");
    expect(d["display"]).toBe("flex");
    expect(d["flex-direction"]).toBe("column");
    expect(d["gap"]).toBe("var(--ds-space-3)");
  });

  it("moves the sidebar border to the bottom at 720px", () => {
    const n = narrow(".ds-app__sidebar");
    expect(n["border-right"]).toBe("0");
    expect(n["border-bottom"]).toBe("1px solid var(--ds-border)");
  });

  it("never hides the sidebar", () => {
    const hide = (rs: Rule[]) =>
      rs.filter((r) => r.selectors.some((s) => /\.ds-app__sidebar\b/.test(s)) && decls(r.body)["display"] === "none");
    expect(hide(flatRules)).toEqual([]);
    expect(hide(mediaRules)).toEqual([]);
  });

  it("lets the main column shrink and pads it", () => {
    const d = flat(".ds-app__main");
    expect(d["min-width"]).toBe("0");
    expect(d["padding"]).toBe("var(--ds-space-6) var(--ds-space-6) var(--ds-space-10)");
  });

  it("stacks side nav items vertically, then wraps them in a row at 720px", () => {
    const d = flat(".ds-sidenav");
    expect(d["display"]).toBe("flex");
    expect(d["flex-direction"]).toBe("column");
    const n = narrow(".ds-sidenav");
    expect(n["flex-direction"]).toBe("row");
    expect(n["flex-wrap"]).toBe("wrap");
  });

  it("styles side nav items", () => {
    const d = flat(".ds-sidenav__item");
    expect(d["font-size"]).toBe("14px");
    expect(d["font-weight"]).toBe("500");
    expect(d["padding"]).toBe("var(--ds-space-2) var(--ds-space-3)");
    expect(d["border-radius"]).toBe("var(--ds-radius-sm)");
    expect(d["color"]).toBe("var(--ds-text-muted)");
    expect(flat(".ds-sidenav__item:hover")["background"]).toBe("var(--ds-hover)");
    // The muted text measured 4.06:1 on the dark hover tint, so hover lifts it to full strength.
    expect(flat(".ds-sidenav__item:hover")["color"]).toBe("var(--ds-text)");
  });

  it("marks the current page with the hover fill and full-strength text", () => {
    const d = flat('.ds-sidenav__item[aria-current="page"]');
    expect(d["background"]).toBe("var(--ds-hover)");
    expect(d["color"]).toBe("var(--ds-text)");
  });
});

describe("app set: page header and list", () => {
  it("lays the page header out as a wrapping flex row", () => {
    const d = flat(".ds-pagehead");
    expect(d["display"]).toBe("flex");
    expect(d["flex-wrap"]).toBe("wrap");
    expect(d["align-items"]).toBe("flex-end");
    expect(d["justify-content"]).toBe("space-between");
    expect(d["gap"]).toBe("var(--ds-space-4)");
  });

  it("sets the title in the sans face, not the display face", () => {
    const d = flat(".ds-pagehead__title");
    expect(d["font-family"]).toBe("var(--ds-font-sans)");
    expect(d["font-size"]).toBe("1.5rem");
    // The brief said 600, but the sans family ships 400/500/700 and font-weight.spec.ts
    // refuses a weight with no face. 600 would render as the 700 face anyway.
    expect(d["font-weight"]).toBe("700");
    expect(d["line-height"]).toBe("1.2");
    expect(d["font-family"]).not.toMatch(/display/);
  });

  it("shrinks a lede to 16px inside a page header with one dedicated rule", () => {
    const hits = flatRules.filter((r) => r.selectors.includes(".ds-pagehead .ds-lede"));
    expect(hits).toHaveLength(1);
    expect(hits[0].selectors).toEqual([".ds-pagehead .ds-lede"]);
    expect(decls(hits[0].body)["font-size"]).toBe("var(--ds-text-base)");
    // The marketing lede is left alone.
    expect(flat(".ds-lede")["font-size"]).toBe("var(--ds-text-lg)");
  });

  it("lays header actions out as a flex row", () => {
    const d = flat(".ds-pagehead__actions");
    expect(d["display"]).toBe("flex");
    expect(d["gap"]).toBe("var(--ds-space-2)");
    expect(d["flex-wrap"]).toBe("wrap");
  });

  it("draws the list as a bordered rounded surface", () => {
    const d = flat(".ds-list");
    expect(d["background"]).toBe("var(--ds-surface)");
    expect(d["border"]).toBe("1px solid var(--ds-border)");
    expect(d["border-radius"]).toBe("var(--ds-radius-lg)");
    expect(d["list-style"]).toBe("none");
    expect(d["padding"]).toBe("0");
  });

  it("lays list rows out as wrapping flex rows", () => {
    const d = flat(".ds-list__row");
    expect(d["display"]).toBe("flex");
    expect(d["flex-wrap"]).toBe("wrap");
    expect(d["align-items"]).toBe("center");
    expect(d["gap"]).toBe("var(--ds-space-4)");
    expect(d["padding"]).toBe("var(--ds-space-4) var(--ds-space-5)");
  });

  it("gives a row a flexible main cell so trailing actions sit at the end", () => {
    const d = flat(".ds-list__main");
    expect(d["flex"]).toBe("1 1 auto");
    expect(d["min-width"]).toBe("0");
  });

  it("separates adjacent rows with a top border", () => {
    expect(flat(".ds-list__row + .ds-list__row")["border-top"]).toBe("1px solid var(--ds-border)");
  });
});

describe("app set: settings sections and message", () => {
  it("draws the settings container as a bordered rounded surface", () => {
    const d = flat(".ds-settings");
    expect(d["background"]).toBe("var(--ds-surface)");
    expect(d["border"]).toBe("1px solid var(--ds-border)");
    expect(d["border-radius"]).toBe("var(--ds-radius-lg)");
  });

  it("lays each section out as a wrapping aside and body pair", () => {
    const d = flat(".ds-settings__section");
    expect(d["display"]).toBe("flex");
    expect(d["flex-wrap"]).toBe("wrap");
    expect(d["gap"]).toBe("var(--ds-space-5) var(--ds-space-8)");
    expect(d["padding"]).toBe("var(--ds-space-6)");
    expect(flat(".ds-settings__section + .ds-settings__section")["border-top"]).toBe("1px solid var(--ds-border)");
  });

  it("sizes the aside and body so the body takes the spare width and wraps below 360px", () => {
    const a = flat(".ds-settings__aside");
    expect(a["flex"]).toBe("1 1 220px");
    expect(a["max-width"]).toBe("320px");
    const b = flat(".ds-settings__body");
    expect(b["flex"]).toBe("999 1 360px");
    expect(b["min-width"]).toBe("0");
  });

  it("styles a message as a quiet bordered block", () => {
    const d = flat(".ds-message");
    expect(d["display"]).toBe("block");
    expect(d["padding"]).toBe("var(--ds-space-3) var(--ds-space-4)");
    expect(d["border-radius"]).toBe("var(--ds-radius-md)");
    expect(d["border"]).toBe("1px solid var(--ds-border)");
    expect(d["background"]).toBe("var(--ds-hover)");
    expect(d["color"]).toBe("var(--ds-text)");
    expect(d["font-size"]).toBe("var(--ds-text-sm)");
  });

  it("is not a badge, so no rule on a message rounds it to a pill", () => {
    const hits = flatRules.filter((r) => r.selectors.some((s) => /\.ds-message\b/.test(s)) && /radius-pill/.test(r.body));
    expect(hits).toEqual([]);
  });

  it("tints danger and success messages from the tone over the surface", () => {
    for (const [mod, tone] of [["danger", "--ds-danger"], ["success", "--ds-success-fg"]] as const) {
      const d = flat(`.ds-message--${mod}`);
      const mix = new RegExp(`^color-mix\\(in srgb, var\\(${tone}\\) \\d+%, var\\(--ds-surface\\)\\)$`);
      expect(d["border-color"], `${mod} border-color`).toMatch(mix);
      expect(d["background"], `${mod} background`).toMatch(mix);
      // GRE-615 browser check: the raw tone measured 3.1 to 4.3 against its tint, under 4.5.
      // Mixing 60/40 into the theme's text colour measured 5.98 (dark) and 7.88 (light).
      expect(d["color"], `${mod} color`).toBe(`color-mix(in srgb, var(${tone}) 60%, var(--ds-text))`);
    }
  });
});

// A margin on any other app rule ties the stack rule on specificity (0,1,0) and wins
// by source order, silently cancelling the gap for that element. reset.css already
// zeroes margins, so the stack rule is the only place a margin belongs.
describe("app set: margins belong to the stack", () => {
  it("declares no margin property outside the stack rule, flat or in a media query", () => {
    const src = stripComments(readFileSync(join(root, "components/app.css"), "utf8"));
    const parts = splitMedia(src, QUERY);
    const all = [...parseRules(parts.flat), ...parts.media.flatMap(parseRules)];
    expect(all.length).toBeGreaterThan(10);
    const offenders = all
      .filter((r) => !(r.selectors.length === 1 && r.selectors[0] === ".ds-stack > * + *"))
      .flatMap((r) => Object.keys(decls(r.body)).filter((p) => /^margin/.test(p)).map((p) => `${r.selectors.join(", ")} sets ${p}`));
    expect(offenders).toEqual([]);
  });
});
