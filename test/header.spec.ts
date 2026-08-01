import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(__dirname, "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");
const header = () => read("components/header.css");

// Extracts an at-rule's body by brace counting. A regex cannot find a block's
// end: a nested rule's closing brace terminates the capture, and anchoring on a
// column-zero brace couples the test to the file's indentation.
function atRuleBody(css: string, header: RegExp): string | undefined {
  const m = header.exec(css);
  if (!m) return undefined;
  const open = css.indexOf("{", m.index);
  if (open < 0) return undefined;
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}" && --depth === 0) return css.slice(open + 1, i);
  }
  return undefined;
}

describe(".ds-header", () => {
  it("sticks to the top", () => {
    expect(header()).toMatch(/\.ds-header\s*\{[^}]*position:\s*sticky/);
    expect(header()).toMatch(/\.ds-header\s*\{[^}]*top:\s*0/);
  });

  it("is opaque in the base rule, translucent only under @supports", () => {
    // Progressive enhancement: a browser without backdrop-filter must get a
    // readable bar, not a transparent one.
    const base = /\.ds-header\s*\{([^}]*)\}/.exec(header())?.[1] ?? "";
    expect(base).toMatch(/background:\s*var\(--ds-bg\)/);
    expect(base).not.toContain("backdrop-filter");
    // Brace-counted, not a whole-file match: a whole-file "backdrop-filter"
    // check is satisfied by the unrelated backdrop-filter: none further down
    // in the prefers-reduced-transparency block, so the enhancement could be
    // deleted here and an unscoped assertion would not notice. Requiring
    // blur( rules out backdrop-filter: none too. The (?<!-) lookbehind on the
    // unprefixed check matters: without it, "backdrop-filter: blur(" also
    // matches as a bare substring of "-webkit-backdrop-filter: blur(", so a
    // mutation that neuters only the unprefixed property to `none` while
    // leaving -webkit-backdrop-filter: blur(...) alone would slip through.
    const supports = atRuleBody(header(), /@supports\s*\(backdrop-filter/);
    expect(supports).toBeDefined();
    expect(supports).toMatch(/(?<!-)backdrop-filter:\s*blur\(/);
    expect(supports).toMatch(/-webkit-backdrop-filter:\s*blur\(/);
  });

  it("drops to opaque under prefers-reduced-transparency", () => {
    // Brace-counted rather than regex-bounded: the previous \n\} anchor only
    // worked because the outer @media closed at column zero while the inner
    // rule closed indented, so any reformat would have broken it silently.
    const q = atRuleBody(header(), /@media\s*\(prefers-reduced-transparency:\s*reduce\)/) ?? "";
    expect(q).toContain("backdrop-filter: none");
    expect(q).toMatch(/background:\s*var\(--ds-bg\)/);
  });

  it("shows the hairline only once scrolled", () => {
    expect(header()).toMatch(/\.ds-header\s*\{[^}]*border-bottom:\s*1px solid transparent/);
    expect(header()).toMatch(/\.ds-header\.is-scrolled\s*\{[^}]*border-bottom-color:\s*var\(--ds-border\)/);
  });

  it("carries a -webkit- prefixed backdrop-filter for Safari", () => {
    // Scoped to the @supports block, not a whole-file check: the
    // prefers-reduced-transparency block also carries a -webkit-backdrop-filter,
    // just set to none, which a whole-file toContain cannot distinguish from
    // the real enhancement.
    const supports = atRuleBody(header(), /@supports\s*\(backdrop-filter/) ?? "";
    expect(supports).toMatch(/-webkit-backdrop-filter:\s*blur\(/);
  });
});

describe("anchor offset", () => {
  it("reserves scroll-padding for the bar, defaulting to zero", () => {
    // Zero default so the rule is inert until initStickyHeader measures the bar.
    expect(read("components/reset.css")).toMatch(/scroll-padding-top:\s*var\(--ds-header-h,\s*0px\)/);
  });
});

describe("mobile dropdown", () => {
  it("tracks the bar instead of hardcoding its height", () => {
    // Was `inset: 56px 0 auto`, the old bar height, resolved against the initial
    // containing block. .ds-header is positioned now, so it is the containing
    // block, and 56px is wrong for a 48px bar.
    const css = read("components/layout.css");
    const open = /\.ds-nav__links\.is-open\s*\{([^}]*)\}/.exec(css)?.[1] ?? "";
    expect(open).toMatch(/inset:\s*100%\s+0\s+auto/);
    expect(open).not.toMatch(/\d+px/);
  });
});
