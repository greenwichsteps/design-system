import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(__dirname, "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");
const header = () => read("components/header.css");

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
    // [^{]* rather than [^)]*: the condition is (backdrop-filter: blur(1px)),
    // and a negated-) class halts at the inner paren, leaving the outer one
    // unconsumed.
    expect(header()).toMatch(/@supports\s*\([^{]*backdrop-filter[^{]*\)\s*\{[\s\S]*backdrop-filter/);
  });

  it("drops to opaque under prefers-reduced-transparency", () => {
    const q = /@media\s*\(prefers-reduced-transparency:\s*reduce\)\s*\{([\s\S]*?)\n\}/.exec(header())?.[1] ?? "";
    expect(q).toContain("backdrop-filter: none");
    expect(q).toMatch(/background:\s*var\(--ds-bg\)/);
  });

  it("shows the hairline only once scrolled", () => {
    expect(header()).toMatch(/\.ds-header\s*\{[^}]*border-bottom:\s*1px solid transparent/);
    expect(header()).toMatch(/\.ds-header\.is-scrolled\s*\{[^}]*border-bottom-color:\s*var\(--ds-border\)/);
  });

  it("carries a -webkit- prefixed backdrop-filter for Safari", () => {
    expect(header()).toContain("-webkit-backdrop-filter");
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
