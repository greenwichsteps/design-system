# Page Chrome and Type Scale Implementation Plan (v0.7.0)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship design-system v0.7.0: a sticky full-bleed header, corrected display type weight, chrome-scaled nav and buttons, section dividers, a promoted footer shell, and a short Burnside wordmark for the header slot.

**Architecture:** All work is in `greenwichsteps/design-system` except Task 8, which adds a `--short` mode to an outliner script in `greenwichsteps/burnsidesteps` and commits its SVG output back here. CSS components are plain files in `components/`, concatenated alphabetically after `reset.css` into `dist/ui.css` by `scripts/build.mjs`. Behaviors are individually-exported TypeScript in `behaviors/`, built twice: `dist/ui.mjs` from the side-effect-free `index.ts`, and `dist/ui.js` from the auto-initializing `auto.ts`.

**Tech Stack:** Plain CSS (no preprocessor), TypeScript, esbuild, vitest + jsdom, fontkit, pnpm.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-01-page-chrome-design.md`. Where this plan and the spec disagree, the spec wins.
- Package manager is **pnpm**. Test command is `pnpm test`. Build is `pnpm build`.
- `vitest.config.ts` sets `globalSetup: ["./test/global-setup.ts"]`, which runs the build before collection. Tests may read `dist/` directly.
- Existing suite is **84 tests**. Every task must leave it green; the count only grows.
- **No em-dashes** in any committed prose, comment, or copy.
- Components are concatenated alphabetically after `reset.css`. A new `components/header.css` sorts between `form.css` and `hero.css`. Do not rely on source order across files; within a file, order matters.
- `.ds-btn--sm` shares specificity with `.ds-btn` and wins only by source order. Never move it above `.ds-btn` in `components/button.css`.
- Behaviors must stay side-effect-free on import. New behaviors are exported from `behaviors/index.ts` and called from `initAll`, never invoked at module scope.
- The licensed `GT-America-Standard-Bold.otf` lives at `burnsidesteps/assets/fonts/GT-America/` and is gitignored. It must never enter the public design-system repo.
- Accessible names are always the **full** brand name (`Burnside Steps`), regardless of which mark is drawn.

---

### Task 1: Heading weight and the font-weight guard

The bug: `fonts.css` ships Canela at 300/400/500 only. Nothing states a `font-weight` for headings, so `<h1>`/`<h2>` take the UA default of 700 and the browser synthesises it, flattening Canela's thick/thin contrast. The guard matters more than the one-line fix, because it prevents recurrence and also covers `--ds-font-compressed`, which ships at 700 only.

**Files:**
- Create: `test/font-weight.spec.ts`
- Modify: `components/type.css:1-3`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing other tasks import. `.ds-display`, `.ds-h1`, `.ds-h2` gain `font-weight: 400`.

- [ ] **Step 1: Write the failing test**

Create `test/font-weight.spec.ts`:

```ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(__dirname, "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");

// --ds-font-display: 'Canela', Georgia, serif  ->  display: "Canela"
function fontTokenFamilies(): Record<string, string> {
  const out: Record<string, string> = {};
  const src = read("tokens/primitives.css");
  for (const m of src.matchAll(/--ds-font-([\w-]+)\s*:\s*'([^']+)'/g)) out[m[1]] = m[2];
  return out;
}

// @font-face { font-family: 'Canela'; font-weight: 300; ... }  ->  Canela: {300,400,500}
function declaredFaces(): Record<string, Set<number>> {
  const out: Record<string, Set<number>> = {};
  const src = read("fonts.css");
  for (const block of src.matchAll(/@font-face\s*\{([^}]*)\}/g)) {
    const fam = /font-family:\s*'([^']+)'/.exec(block[1])?.[1];
    const wt = /font-weight:\s*(\d+)/.exec(block[1])?.[1];
    if (!fam || !wt) continue;
    (out[fam] ??= new Set()).add(Number(wt));
  }
  return out;
}

// Every `selector { decls }` pair across components/, with the file it came from.
function ruleBlocks(): Array<{ file: string; selector: string; decls: string }> {
  const { readdirSync } = require("node:fs") as typeof import("node:fs");
  const files = readdirSync(join(root, "components")).filter((f) => f.endsWith(".css"));
  const rules: Array<{ file: string; selector: string; decls: string }> = [];
  for (const file of files) {
    const src = read(`components/${file}`).replace(/\/\*[\s\S]*?\*\//g, "");
    for (const m of src.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      rules.push({ file, selector: m[1].trim(), decls: m[2] });
    }
  }
  return rules;
}

describe("font weights are backed by a real face", () => {
  it("never requests a weight the family does not ship", () => {
    const families = fontTokenFamilies();
    const faces = declaredFaces();
    const offenders: string[] = [];

    for (const { file, selector, decls } of ruleBlocks()) {
      const tok = /font-family:\s*var\(--ds-font-([\w-]+)\)/.exec(decls)?.[1];
      const wt = /font-weight:\s*(\d+)/.exec(decls)?.[1];
      if (!tok || !wt) continue;
      const fam = families[tok];
      if (!fam) continue;
      const available = faces[fam];
      if (!available || !available.has(Number(wt))) {
        offenders.push(
          `${file}: ${selector} asks ${fam} for ${wt}, ships ${available ? [...available].sort().join("/") : "nothing"}`
        );
      }
    }
    expect(offenders).toEqual([]);
  });

  // The original defect was a MISSING weight, not a wrong one: with nothing stated,
  // <h1>/<h2> inherit the UA default of 700 and Canela has no 700 face. Requiring an
  // explicit weight on the display classes is what closes that hole.
  it("states an explicit weight on every display class", () => {
    const missing: string[] = [];
    for (const cls of [".ds-display", ".ds-h1", ".ds-h2"]) {
      const rule = ruleBlocks().find((r) => r.selector === cls);
      expect(rule, `${cls} rule not found in components/`).toBeTruthy();
      if (!/font-weight:\s*\d+/.test(rule!.decls)) missing.push(cls);
    }
    expect(missing).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run test/font-weight.spec.ts`

Expected: the first test PASSES (nothing states a bad weight today), the second FAILS with `missing` equal to `[".ds-display", ".ds-h1", ".ds-h2"]`. That asymmetry is the point: the bug was an absence, not a wrong value.

- [ ] **Step 3: State the weight**

In `components/type.css`, add `font-weight: 400` to the three display classes. Replace the first three lines:

```css
.ds-display { font-family: var(--ds-font-display); font-size: var(--ds-text-display); font-weight: 400; line-height: 1.02; letter-spacing: -0.02em; }
.ds-h1 { font-family: var(--ds-font-display); font-size: var(--ds-text-3xl); font-weight: 400; line-height: 1.05; }
.ds-h2 { font-family: var(--ds-font-display); font-size: var(--ds-text-2xl); font-weight: 400; line-height: 1.1; }
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm exec vitest run test/font-weight.spec.ts`
Expected: 2 passed.

Then run the whole suite: `pnpm test`
Expected: 86 passed (84 + 2).

- [ ] **Step 5: Commit**

```bash
git add components/type.css test/font-weight.spec.ts
git commit -m "fix: state display type weight so Canela is not synthesised

fonts.css ships Canela at 300/400/500 only, and nothing stated a weight
for headings, so <h1>/<h2> took the UA default of 700 and the browser
faked it. Synthetic bold dilates the outline uniformly, which flattens
the thick/thin contrast the face exists for.

The guard is the durable half: it fails on any stated weight with no
matching face, and separately requires the display classes to state one
at all, which is the shape the original bug had."
```

---

### Task 2: Brand height tokens, and removing the fixed anchor height

`.ds-nav__brand { height: 24px }` is wrong in kind, not degree. A fixed anchor height lets a taller mark overflow silently instead of growing the bar. Height moves onto the asset and comes from a per-brand token, because Farnsworth's mark is one line (5462x737) and Burnside's full mark is stacked (4251x1870), so no shared number can serve both.

**Files:**
- Modify: `components/layout.css:6-7`
- Modify: `themes/farnsworth.css`, `themes/burnside.css`
- Create: `test/brand-sizing.spec.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `--ds-brand-nav-h` and `--ds-brand-foot-h`, declared per brand theme. Task 4 relies on `.ds-nav` using `padding-block`. Task 7 relies on `--ds-brand-foot-h`.

- [ ] **Step 1: Write the failing test**

Create `test/brand-sizing.spec.ts`:

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run test/brand-sizing.spec.ts`
Expected: 5 failed. `.ds-nav__brand` still has `height: 24px`, `.ds-nav` still uses the `padding` shorthand, and neither theme declares the tokens.

- [ ] **Step 3: Rewrite the nav rules**

In `components/layout.css`, replace lines 6 and 7:

```css
/* padding-block, not `padding: X 0`. This element sits inside .ds-container, and
   the shorthand's implicit 0 would overwrite the container's padding-inline,
   putting the bar's contents 24px left of every section's. */
.ds-nav { display: flex; align-items: center; gap: var(--ds-space-5); padding-block: var(--ds-space-2); }
/* No height here. Height belongs on the asset, from a per-brand token: a fixed
   anchor height does not grow for a taller mark, it just lets it overflow. */
.ds-nav__brand { display: inline-flex; align-items: center; flex-shrink: 0; }
.ds-nav__brand img { display: block; height: var(--ds-brand-nav-h, 26px); width: auto; }
```

- [ ] **Step 4: Declare the tokens**

In `themes/farnsworth.css`, inside the `[data-theme-brand="farnsworth"]` block, after the `--ds-logo` line:

```css
  /* One line, 5462x737. Nav and footer differ because the footer has room. */
  --ds-brand-nav-h: 26px;
  --ds-brand-foot-h: 32px;
```

In `themes/burnside.css`, inside the `:root, [data-theme-brand="burnside"]` block, after the `--ds-logo` line:

```css
  /* Nav draws the short mark (4264x737, same 737 as Farnsworth, so 26px matches
     it exactly). The footer draws the full stacked mark (4251x1870), which needs
     81px to put its glyphs at the same size as Farnsworth's 32px. */
  --ds-brand-nav-h: 26px;
  --ds-brand-foot-h: 81px;
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm exec vitest run test/brand-sizing.spec.ts`
Expected: 5 passed.

Run: `pnpm test`
Expected: 91 passed.

- [ ] **Step 6: Commit**

```bash
git add components/layout.css themes/farnsworth.css themes/burnside.css test/brand-sizing.spec.ts
git commit -m "fix: brand height is a per-brand token, not a fixed anchor height

Farnsworth's wordmark is one line at 7.41:1 and Burnside's full mark is
stacked at 2.27:1, so a shared height gives Burnside half the glyph size.
Height moves onto the asset and comes from --ds-brand-nav-h and
--ds-brand-foot-h, declared per brand theme.

.ds-nav also moves to padding-block. The padding shorthand's implicit 0
overwrites .ds-container's padding-inline, which measured as a 24px
misalignment between the bar and every section on both sites."
```

---

### Task 3: Nav and button scale

The kit runs header chrome at body size. Measured against the reference sites: Resend 14px nav type with a 40px button, Exa 15px and 33px, Vapi 15px and 32px, all on a 16px body. `.ds-btn` keeps its 16px type and 42px height because hero CTAs are primary actions; only the horizontal padding moves.

**Files:**
- Modify: `components/button.css:1-6`
- Modify: `components/layout.css` (the `.ds-nav__links` rule)
- Modify: `test/brand-sizing.spec.ts`

**Interfaces:**
- Consumes: `.ds-nav` from Task 2.
- Produces: nothing new. Consumers put `.ds-btn--sm` on the nav CTA.

- [ ] **Step 1: Write the failing test**

Append to `test/brand-sizing.spec.ts`, inside the existing file at top level:

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run test/brand-sizing.spec.ts`
Expected: the first two fail, the ordering test passes (`button.css` is already correct and this pins it).

- [ ] **Step 3: Scale the nav links**

In `components/layout.css`, replace the `.ds-nav__links` rule:

```css
.ds-nav__links { display: flex; gap: var(--ds-space-5); font-size: var(--ds-text-sm); }
```

- [ ] **Step 4: Trim the button**

In `components/button.css`, change line 3's padding from `var(--ds-space-3) var(--ds-space-5)` to `var(--ds-space-3) var(--ds-space-4)`. Add above the `.ds-btn--sm` line:

```css
/* Must stay below .ds-btn: equal specificity, so this wins by source order only. */
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm exec vitest run test/brand-sizing.spec.ts`
Expected: 8 passed.

Run: `pnpm test`
Expected: 94 passed.

- [ ] **Step 6: Commit**

```bash
git add components/button.css components/layout.css test/brand-sizing.spec.ts
git commit -m "fix: scale header chrome below body size

Nav links drop to --ds-text-sm and .ds-btn loses 8px per side. The kit
was alone in running header chrome at body size: Resend uses 14px, Exa
15px, Vapi 15px, all against a 16px body. .ds-btn keeps its 16px type
and 42px height because hero CTAs are primary actions and should not
shrink to chrome size; consumers put .ds-btn--sm on the nav CTA."
```

---

### Task 4: `.ds-header` component

`position: sticky` is bounded by the parent's content box, and today's markup wraps the header in a container sized to exactly the header's height, so sticky travel is zero. This adds the full-bleed wrapper that gives it somewhere to travel, plus the fill and the hairline.

**Files:**
- Create: `components/header.css`
- Modify: `components/layout.css` (the `.ds-nav__links.is-open` media query)
- Modify: `components/reset.css`
- Create: `test/header.spec.ts`

**Interfaces:**
- Consumes: `.ds-nav` and `.ds-container` from Task 2.
- Produces: `.ds-header` (sticky wrapper) and the `is-scrolled` class contract that Task 5's behavior toggles. Reads `--ds-header-h`, which Task 5 writes.

- [ ] **Step 1: Write the failing test**

Create `test/header.spec.ts`:

```ts
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
    expect(header()).toMatch(/@supports\s*\(backdrop-filter[^)]*\)\s*\{[\s\S]*backdrop-filter/);
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run test/header.spec.ts`
Expected: 7 failed. `components/header.css` does not exist.

- [ ] **Step 3: Create the component**

Create `components/header.css`:

```css
/* Full-bleed sticky chrome. The consumer nests a .ds-container inside this, and
   a .ds-nav inside that: three elements, one job each.
   Do NOT collapse the container onto this element or onto .ds-nav. .ds-nav's
   padding would zero the container's padding-inline and the bar's contents end
   up 24px left of every section's. */
.ds-header {
  position: sticky; top: 0; z-index: 20;
  background: var(--ds-bg);
  border-bottom: 1px solid transparent;
  transition: border-color var(--ds-dur) var(--ds-ease);
}

/* Translucency is enhancement, never the base: without backdrop-filter a
   transparent bar is unreadable, so only browsers that can blur get the alpha. */
@supports (backdrop-filter: blur(1px)) {
  .ds-header {
    background: color-mix(in srgb, var(--ds-bg) 72%, transparent);
    -webkit-backdrop-filter: blur(12px) saturate(1.6);
    backdrop-filter: blur(12px) saturate(1.6);
  }
}

/* macOS Reduce Transparency governs exactly this effect. */
@media (prefers-reduced-transparency: reduce) {
  .ds-header {
    background: var(--ds-bg);
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
  }
}

/* No rule at rest, so the bar is invisible furniture at the top of the page and
   only asserts itself in motion. initStickyHeader toggles the class. */
.ds-header.is-scrolled { border-bottom-color: var(--ds-border); }
```

- [ ] **Step 4: Reserve the anchor offset**

In `components/reset.css`, change the `html` rule:

```css
/* --ds-header-h is written by initStickyHeader from the measured bar. The 0px
   default keeps this inert on pages with no sticky header. */
html { -webkit-text-size-adjust: 100%; scroll-padding-top: var(--ds-header-h, 0px); }
```

- [ ] **Step 5: Fix the mobile dropdown**

In `components/layout.css`, in the `@media (max-width: 720px)` block, replace `inset: 56px 0 auto` with `inset: 100% 0 auto`:

```css
@media (max-width: 720px) { .ds-nav__links { display: none; } .ds-nav__links.is-open { display: flex; position: absolute; inset: 100% 0 auto; flex-direction: column; background: var(--ds-surface); padding: var(--ds-space-5); } }
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm exec vitest run test/header.spec.ts`
Expected: 7 passed.

Run: `pnpm test`
Expected: 101 passed.

- [ ] **Step 7: Commit**

```bash
git add components/header.css components/reset.css components/layout.css test/header.spec.ts
git commit -m "feat: .ds-header, full-bleed sticky page chrome

position: sticky is bounded by the parent's content box, and both sites
wrapped the header in a container sized to exactly the header, so sticky
travel was zero and adding the property alone did nothing.

Opaque base with translucency behind @supports, an opaque branch for
prefers-reduced-transparency, and a hairline that arrives only once
scrolled. The mobile dropdown stops hardcoding 56px, which was the old
bar height and resolved against the initial containing block."
```

---

### Task 5: `initStickyHeader` behavior

Two jobs: toggle `is-scrolled` from a sentinel, and publish the measured bar height as `--ds-header-h` so anchor jumps clear the bar. An `IntersectionObserver` on a 1px sentinel avoids per-frame scroll work. Scroll-driven CSS animations would remove the JS entirely but are still behind a flag in Firefox.

**Files:**
- Create: `behaviors/sticky-header.ts`
- Modify: `behaviors/index.ts`
- Modify: `test/behaviors.spec.ts`

**Interfaces:**
- Consumes: `.ds-header` and the `is-scrolled` contract from Task 4.
- Produces: `export function initStickyHeader(root: ParentNode = document): void`, exported from `behaviors/index.ts` and called by `initAll`.

- [ ] **Step 1: Write the failing test**

Append to `test/behaviors.spec.ts`:

```ts
import { initStickyHeader } from "../behaviors/sticky-header";

// jsdom has no IntersectionObserver and no layout, so both are stubbed. The
// callback is captured so the test can drive the intersection directly.
function stubIO() {
  const instances: Array<{ cb: IntersectionObserverCallback; target?: Element }> = [];
  class IO {
    cb: IntersectionObserverCallback;
    constructor(cb: IntersectionObserverCallback) { this.cb = cb; instances.push({ cb: this.cb }); }
    observe(target: Element) { instances[instances.length - 1].target = target; }
    disconnect() {}
    unobserve() {}
  }
  vi.stubGlobal("IntersectionObserver", IO);
  return {
    fire(isIntersecting: boolean) {
      instances.forEach((i) => i.cb([{ isIntersecting } as IntersectionObserverEntry], {} as IntersectionObserver));
    },
  };
}

describe("sticky header", () => {
  it("adds is-scrolled when the sentinel leaves the viewport", () => {
    const io = stubIO();
    document.body.innerHTML = `<header class="ds-header"></header>`;
    initStickyHeader();
    const hdr = document.querySelector(".ds-header")!;
    expect(hdr.classList.contains("is-scrolled")).toBe(false);
    io.fire(false);
    expect(hdr.classList.contains("is-scrolled")).toBe(true);
    io.fire(true);
    expect(hdr.classList.contains("is-scrolled")).toBe(false);
  });

  it("publishes the measured bar height as --ds-header-h", () => {
    stubIO();
    document.body.innerHTML = `<header class="ds-header"></header>`;
    const hdr = document.querySelector(".ds-header")! as HTMLElement;
    hdr.getBoundingClientRect = () => ({ height: 48 }) as DOMRect;
    initStickyHeader();
    expect(document.documentElement.style.getPropertyValue("--ds-header-h")).toBe("48px");
  });

  it("does nothing and does not throw when no header is present", () => {
    stubIO();
    document.body.innerHTML = `<div>no chrome here</div>`;
    expect(() => initStickyHeader()).not.toThrow();
    expect(document.documentElement.style.getPropertyValue("--ds-header-h")).toBe("");
  });

  it("survives an environment with no IntersectionObserver", () => {
    // Old Safari and any SSR pass. The height should still be published.
    vi.stubGlobal("IntersectionObserver", undefined);
    document.body.innerHTML = `<header class="ds-header"></header>`;
    const hdr = document.querySelector(".ds-header")! as HTMLElement;
    hdr.getBoundingClientRect = () => ({ height: 44 }) as DOMRect;
    expect(() => initStickyHeader()).not.toThrow();
    expect(document.documentElement.style.getPropertyValue("--ds-header-h")).toBe("44px");
  });
});
```

Add a cleanup line to the existing `beforeEach` in this file so the custom property does not leak between tests:

```ts
beforeEach(() => { document.body.innerHTML = ""; document.documentElement.removeAttribute("data-theme"); document.documentElement.style.removeProperty("--ds-header-h"); localStorage.clear(); });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run test/behaviors.spec.ts`
Expected: FAIL, cannot resolve `../behaviors/sticky-header`.

- [ ] **Step 3: Write the behavior**

Create `behaviors/sticky-header.ts`:

```ts
// Sticky header chrome. Two jobs, both cheap.
//
// 1. Toggle `is-scrolled` so the hairline arrives once the page moves. A 1px
//    sentinel plus IntersectionObserver does this without a scroll listener,
//    so there is no per-frame work on the main thread.
// 2. Publish the measured bar height as --ds-header-h, which reset.css feeds
//    into scroll-padding-top so anchor jumps clear the bar instead of tucking
//    under it. Measured rather than assumed, because the height moves with the
//    brand token and the viewport.
export function initStickyHeader(root: ParentNode = document): void {
  const header = root.querySelector<HTMLElement>(".ds-header");
  if (!header) return;

  const publishHeight = () => {
    const h = Math.round(header.getBoundingClientRect().height);
    document.documentElement.style.setProperty("--ds-header-h", `${h}px`);
  };
  publishHeight();
  if (typeof window !== "undefined") window.addEventListener("resize", publishHeight, { passive: true });

  // Absent in older Safari and in any server-side pass. The height above is the
  // part that matters for correctness; the hairline is decoration.
  if (typeof IntersectionObserver === "undefined") return;

  const sentinel = document.createElement("div");
  sentinel.setAttribute("aria-hidden", "true");
  sentinel.style.cssText = "position:absolute;top:0;left:0;height:1px;width:1px;pointer-events:none;";
  header.parentNode?.insertBefore(sentinel, header);

  new IntersectionObserver((entries) => {
    header.classList.toggle("is-scrolled", !entries[0].isIntersecting);
  }).observe(sentinel);
}
```

- [ ] **Step 4: Export it**

Rewrite `behaviors/index.ts` imports and exports to include the new behavior. Add the import beside the others, add it to the export list, and call it in `initAll`:

```ts
import { initStickyHeader } from "./sticky-header.js";
```

```ts
export { initClipboard, initTheme, initNav, initStickyHeader, initMenu, initTabs, initModal, toast, initToast };
export function initAll(root: ParentNode = document): void {
  initClipboard(root); initTheme(root); initNav(root); initStickyHeader(root); initMenu(root); initTabs(root); initModal(root); initToast(root);
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm exec vitest run test/behaviors.spec.ts`
Expected: all pass, 4 new.

Run: `pnpm test`
Expected: 105 passed.

- [ ] **Step 6: Commit**

```bash
git add behaviors/sticky-header.ts behaviors/index.ts test/behaviors.spec.ts
git commit -m "feat: initStickyHeader behavior

Toggles is-scrolled from a 1px sentinel via IntersectionObserver, so no
scroll listener and no per-frame work, and publishes the measured bar
height as --ds-header-h for scroll-padding-top.

Degrades cleanly: with no IntersectionObserver the height is still
published and only the hairline is lost. Side-effect-free on import per
GRE-128; initAll is what runs it."
```

---

### Task 6: `.ds-section`

Both sites already declare identical `.site-section` rules, so PATTERNS.md's ≥2-project promotion rule has genuinely fired. The divider is an adjacent-sibling border so the first section carries no rule under the hero and the last carries none above the footer.

**Files:**
- Create: `components/section.css`
- Create: `test/section.spec.ts`
- Modify: `PATTERNS.md`

**Interfaces:**
- Consumes: nothing.
- Produces: `.ds-section`, `.ds-section__title`.

- [ ] **Step 1: Write the failing test**

Create `test/section.spec.ts`:

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run test/section.spec.ts`
Expected: 4 failed, `components/section.css` does not exist.

- [ ] **Step 3: Create the component**

Create `components/section.css`:

```css
/* Promoted from burnside-www and farnsworth-www, which declared byte-identical
   .site-section rules. PATTERNS.md's >=2-project rule. */
.ds-section { padding-block: var(--ds-space-8); }
.ds-section__title { margin-bottom: var(--ds-space-5); }
/* Adjacent-sibling so the first section draws no rule under the hero and the
   last draws none above the footer, which already has its own border-top. */
.ds-section + .ds-section { border-top: 1px solid var(--ds-border); }
```

- [ ] **Step 4: Record the promotion**

In `PATTERNS.md`, add a row to the table:

```markdown
| section | burnside-www, farnsworth-www | 2026-08-01 | Vertical rhythm and divider for a marketing page's stacked content blocks | promoted → `components/section.css` (`.ds-section`) |
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm exec vitest run test/section.spec.ts`
Expected: 4 passed.

Run: `pnpm test`
Expected: 109 passed.

- [ ] **Step 6: Commit**

```bash
git add components/section.css test/section.spec.ts PATTERNS.md
git commit -m "feat: promote .ds-section with a hairline divider

Both sites declared identical .site-section rules, so the ledger's
>=2-project rule had already fired. Adds the divider that was missing:
adjacent-sibling border-top, so the first section draws no rule under
the hero and the last none above the footer."
```

---

### Task 7: `.ds-footer` shell

GRE-235 claims two consumers. It has one: `hosted/web/styles.css` contains no footer rules at all. The promotion still proceeds because Farnsworth adopts the shell during site adoption, which makes the rule fire honestly. Only structure moves; Burnside's five tuned grid tracks are content and stay local.

**Files:**
- Modify: `components/layout.css` (the existing `.ds-footer` rule stays; the shell is added)
- Create: `components/footer.css`
- Create: `test/footer.spec.ts`
- Modify: `PATTERNS.md`

**Interfaces:**
- Consumes: `--ds-brand-foot-h` from Task 2.
- Produces: `.ds-footer__cols`, `__id`, `__label`, `__list`, `__link`, `__base`.

- [ ] **Step 1: Write the failing test**

Create `test/footer.spec.ts`:

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run test/footer.spec.ts`
Expected: 6 failed, `components/footer.css` does not exist.

- [ ] **Step 3: Create the component**

Create `components/footer.css`:

```css
/* Grouped footer shell. Structure only, no content opinion: the track list is
   auto-fit rather than a fixed set of columns, so a consumer with two groups
   and a consumer with five both work and neither site's shape is baked in.
   The base .ds-footer rule (border-top, padding, muted colour) is in layout.css. */
.ds-footer__cols {
  display: grid; align-items: start; gap: var(--ds-space-6);
  grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
}
/* The identity block runs wider than a link column, so it claims two tracks. */
.ds-footer__id { max-width: 26ch; grid-column: span 2; }
.ds-footer__id img { display: block; height: var(--ds-brand-foot-h, 32px); width: auto; }
/* The kit resets every margin, so without this the lede sits flush on the mark. */
.ds-footer__id p { margin-top: var(--ds-space-4); font-size: var(--ds-text-sm); color: var(--ds-text-muted); }

/* Sized as the mono eyebrow the family already uses for a small label, rather
   than inventing a second vocabulary for the same job. */
.ds-footer__label {
  font-family: var(--ds-font-mono); font-size: var(--ds-text-xs); font-weight: 400;
  letter-spacing: .1em; text-transform: uppercase;
  color: var(--ds-text-muted); margin-bottom: var(--ds-space-4);
}
.ds-footer__list {
  list-style: none; margin: 0; padding: 0;
  display: flex; flex-direction: column; gap: var(--ds-space-3);
  font-size: var(--ds-text-sm);
}
/* Deliberately not .ds-link, which underlines in accent. Right for a link in
   prose, wrong for a wall of navigation. */
.ds-footer__link { color: var(--ds-text-muted); text-decoration: none; }
.ds-footer__link:hover { color: var(--ds-text); }

.ds-footer__base {
  display: flex; flex-wrap: wrap; justify-content: space-between;
  gap: var(--ds-space-3) var(--ds-space-5);
  margin-top: var(--ds-space-8); padding-top: var(--ds-space-5);
  border-top: 1px solid var(--ds-border);
  font-size: var(--ds-text-sm); color: var(--ds-text-muted);
}
```

- [ ] **Step 4: Record the promotion**

In `PATTERNS.md`, add a row:

```markdown
| footer | burnside-www, farnsworth-www | 2026-08-01 | Grouped link footer with an identity block and a baseline row | promoted → `components/footer.css` (`.ds-footer__cols`). Structure only: per-consumer `grid-template-columns` overrides stay local, because track ratios are tuned to a specific set of groups. |
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm exec vitest run test/footer.spec.ts`
Expected: 6 passed.

Run: `pnpm test`
Expected: 115 passed.

- [ ] **Step 6: Commit**

```bash
git add components/footer.css test/footer.spec.ts PATTERNS.md
git commit -m "feat: promote the grouped footer shell

Structure only. The grid is auto-fit rather than a fixed track list, so
a two-group and a five-group consumer both work without the kit
learning either one's shape; per-consumer track ratios stay local.

Note GRE-235's premise was wrong: it claims burnside-www and
burnside-hosted both use this, but hosted/web/styles.css has no footer
rules at all. The promotion holds because farnsworth-www adopts the
shell during site adoption, which is the genuine second consumer."
```

---

### Task 8: Burnside short wordmark

Spans two repos. The outliner needs the licensed font, which lives in `burnsidesteps` and is gitignored; it writes finished SVGs that get committed here. Measured: the short mark is 4264x737, and 737 is identical to Farnsworth's, because both are GT America Bold cap-to-ascender with no descender. The two brands therefore match exactly at the same rendered height.

**Files:**
- Modify: `../burnsidesteps/scripts/outline-wordmark.mjs`
- Create: `identity/burnside/wordmark-short.svg`, `wordmark-short-light.svg`, `wordmark-short-dark.svg`
- Modify: `test/identity.spec.ts`
- Modify: `PATTERNS.md`

**Interfaces:**
- Consumes: `--ds-brand-nav-h` from Task 2.
- Produces: three SVG assets under `identity/burnside/`, copied to `dist/identity/burnside/` by the existing `cpSync` in `scripts/build.mjs`. No build change needed.

- [ ] **Step 1: Write the failing test**

Append to `test/identity.spec.ts`:

```ts
describe("burnside short wordmark", () => {
  const shortPath = (v = "") => join(root, `identity/burnside/wordmark-short${v}.svg`);

  it("ships a master and both pinned variants", () => {
    for (const v of ["", "-light", "-dark"]) {
      expect(existsSync(shortPath(v)), `missing wordmark-short${v}.svg`).toBe(true);
    }
  });

  it("is one line, the same height as Farnsworth's mark", () => {
    // Both are GT America Bold cap-to-ascender. Equal viewBox height is what
    // lets one brand-height token value serve both brands' nav slots.
    const vb = (p: string) => /viewBox="0 0 (\d+) (\d+)"/.exec(readFileSync(p, "utf8"))!.slice(1).map(Number);
    const [, shortH] = vb(shortPath());
    const [, fwH] = vb(join(root, "identity/farnsworth/wordmark.svg"));
    expect(shortH).toBe(fwH);
  });

  it("is narrower than the full stacked mark is tall-equivalent, and wider than it", () => {
    const vb = (p: string) => /viewBox="0 0 (\d+) (\d+)"/.exec(readFileSync(p, "utf8"))!.slice(1).map(Number);
    const [sw, sh] = vb(shortPath());
    const [fw, fh] = vb(join(root, "identity/burnside/wordmark.svg"));
    expect(sw / sh).toBeGreaterThan(fw / fh); // one line is far wider per unit height
  });

  it("keeps the full brand name as the accessible name", () => {
    // The rendered mark says "Burnside". The accessible name must not.
    for (const v of ["", "-light", "-dark"]) {
      expect(readFileSync(shortPath(v), "utf8")).toContain('aria-label="Burnside Steps"');
    }
  });

  it("keeps the accent dot", () => {
    expect(readFileSync(shortPath("-light"), "utf8")).toContain("#FF4D9D");
    expect(readFileSync(shortPath("-dark"), "utf8")).toContain("#FF4D9D");
  });

  it("pins ink colour per variant and self-inverts only in the master", () => {
    expect(readFileSync(shortPath("-light"), "utf8")).toContain("#121317");
    expect(readFileSync(shortPath("-dark"), "utf8")).toContain("#F4F2EE");
    expect(readFileSync(shortPath(), "utf8")).toContain("prefers-color-scheme: dark");
  });
});
```

Check the top of `test/identity.spec.ts` for the existing `root`, `join`, `existsSync` and `readFileSync` imports and reuse them; add only what is missing.

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run test/identity.spec.ts`
Expected: 6 failed, the short mark does not exist.

- [ ] **Step 3: Branch in Burnside, then add a `--short` mode to the outliner**

The design-system worktree does not isolate `burnsidesteps`. Branch there first so the outliner change does not land on that repo's `main`:

```bash
cd /Users/leewang/dev/burnsidesteps
git status --short            # must be clean before branching; stop and report if not
git checkout -b gre-page-chrome-short-wordmark
```

Then in `/Users/leewang/dev/burnsidesteps/scripts/outline-wordmark.mjs`, change the usage line and add the mode. Replace lines 11 to 17:

```js
// Usage: node scripts/outline-wordmark.mjs <output.svg> [--short]
//
// Default emits the stacked "Burnside / Steps." master. --short emits the
// one-line "Burnside." used in constrained horizontal slots such as a sticky
// nav, where the stacked mark's two lines would either halve the glyph size or
// double the bar height. Same font, same tracking, same DOT_GAP: it is the same
// wordmark rendered short, not a different mark.
import * as fontkit from "fontkit";
import { existsSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const argv = process.argv.slice(2);
const SHORT = argv.includes("--short");
const OUT = argv.find((a) => !a.startsWith("--"));
if (!OUT) { console.error("usage: outline-wordmark.mjs <output.svg> [--short]"); process.exit(1); }
```

Then replace the layout section, from `const B = run("Burnside")` through the `const svg = ...` template, with a branch. Keep the existing stacked path exactly as it is and add the short path:

```js
const B = run("Burnside"), S = run("Steps"), D = run(".");

let width, height, wordPaths, dotPath, originX, baseline1, baseline2, indent;

if (SHORT) {
  // One line, one word. No descenders in "Burnside", so the box is
  // cap-to-ascender exactly like Farnsworth's mark, which is what lets a single
  // --ds-brand-nav-h value serve both brands.
  originX = B.inkL;
  baseline1 = Math.max(...B.glyphs.map(({ glyph }) => glyph.bbox.maxY));
  const dotX = B.adv + DOT_GAP;
  const depth = Math.max(0, -Math.min(...B.glyphs.map(({ glyph }) => glyph.bbox.minY)));
  width = Math.max(B.inkR, dotX + D.inkR) - originX;
  height = baseline1 + depth;
  wordPaths = pathFor(B, 0, baseline1);
  dotPath = pathFor(D, dotX, baseline1);
} else {
  indent = B.inkR - S.inkR;
  const inkTop = Math.max(...B.glyphs.map(({ glyph }) => glyph.bbox.maxY));
  baseline1 = inkTop;
  baseline2 = inkTop + LEADING;
  originX = B.inkL;
  const dotX = indent + S.adv + DOT_GAP;
  width = Math.max(B.inkR, dotX + D.inkR) - originX;
  height = baseline2 + (-font.layout("p").glyphs[0].bbox.minY);
  wordPaths = pathFor(B, 0, baseline1) + "\n    " + pathFor(S, indent, baseline2);
  dotPath = pathFor(D, dotX, baseline2);
}
```

`pathFor` closes over `originX`, which the branch now assigns. Leave `pathFor` exactly where it is in the file, textually below this block: it is a function *declaration*, so it hoists and is callable from inside the branch. The only change needed is that `originX` becomes `let` and is assigned in both arms before any `pathFor` call, which the code above already does.

Do not convert `pathFor` to a `const` arrow function. That would not hoist, and the calls inside the branch would throw a temporal-dead-zone `ReferenceError`.

Verify the stacked output is byte-identical to what is committed today, which is the real test that the refactor changed nothing:

```bash
node scripts/outline-wordmark.mjs /tmp/stacked-check.svg
diff /tmp/stacked-check.svg /Users/leewang/dev/design-system/identity/burnside/wordmark.svg && echo "stacked unchanged"
```

Expected: `stacked unchanged`. If it differs, the refactor altered the existing mark and must be corrected before proceeding.

- [ ] **Step 4: Generate the three assets**

Run from `/Users/leewang/dev/burnsidesteps`:

```bash
node scripts/outline-wordmark.mjs /Users/leewang/dev/design-system/identity/burnside/wordmark-short.svg --short
```

Expected stdout includes `viewBox 0 0 4264 737`.

The master self-inverts via `@media (prefers-color-scheme: dark)` in its `<style>` block, matching the existing `wordmark.svg`. The two pinned variants are the same paths with literal fills, because resvg applies `<style>` class rules but ignores every `@media` block, so rastering the master silently yields the light variant. Produce them by copying the master and replacing the `<style>` block with literal `fill` attributes: `#121317` word plus `#FF4D9D` dot for `-light`, `#F4F2EE` word plus `#FF4D9D` dot for `-dark`. Confirm against how `wordmark-light.svg` and `wordmark-dark.svg` are already shaped before writing.

Verify:

```bash
grep -c 'aria-label="Burnside Steps"' /Users/leewang/dev/design-system/identity/burnside/wordmark-short*.svg
```

Expected: `1` for each of the three files.

- [ ] **Step 5: Amend the identity rule**

In `PATTERNS.md`, under `## Identity rules`, replace the opening of the **No lockup** paragraph so it permits a short form. Add after that paragraph:

```markdown
**Short forms are permitted; lockups are not.** A brand may ship a short
wordmark for constrained horizontal slots, such as `wordmark-short.svg` drawing
"Burnside." for a sticky nav where the stacked mark would either halve the glyph
size or double the bar height. The condition is strict: a short form is the same
wordmark rendered short, produced by the same script from the same font with the
same tracking, and it **never changes the accessible name**. Every Burnside
variant carries `aria-label="Burnside Steps"` and consumers set the full name in
`alt`, whatever the mark draws. This is not a licence for a third design; it is a
second rendering of the one wordmark.
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm exec vitest run test/identity.spec.ts`
Expected: all pass, 6 new.

Run: `pnpm test`
Expected: 121 passed.

- [ ] **Step 7: Commit, both repos**

In `burnsidesteps`, on the `gre-page-chrome-short-wordmark` branch created in Step 3. Do not merge or push it; the controller reports it for review at the end:

```bash
cd /Users/leewang/dev/burnsidesteps
git add scripts/outline-wordmark.mjs
git commit -m "feat: --short mode on the wordmark outliner

Emits the one-line 'Burnside.' used in constrained horizontal slots.
Same font, same tracking, same DOT_GAP: the wordmark rendered short,
not a second mark. Output is committed into design-system."
```

In `design-system`:

```bash
git add identity/burnside/wordmark-short.svg identity/burnside/wordmark-short-light.svg identity/burnside/wordmark-short-dark.svg test/identity.spec.ts PATTERNS.md
git commit -m "feat: short Burnside wordmark for the header slot

4264x737. The 737 matches Farnsworth's mark exactly, because both are GT
America Bold cap-to-ascender with no descender, so one --ds-brand-nav-h
value serves both brands.

The alternatives were measured and both lose. The stacked mark at
matched glyph size needs an 82px bar against Farnsworth's 48px; a
one-line 'Burnside Steps.' fits the bar but overflows a 375px viewport
by 83px. The short mark is 48px and fits with the CTA still visible.

PATTERNS.md's identity rule is amended to permit short forms under an
explicit condition: same script, same font, and never a change to the
accessible name."
```

---

### Task 9: Gallery coverage

The gallery auto-globs `gallery/sections/*.html`, so adding a file is the whole registration step. This also closes GRE-149, which is the missing hero section.

**Files:**
- Create: `gallery/sections/chrome.html`, `gallery/sections/hero.html`
- Create: `test/gallery.spec.ts`

**Interfaces:**
- Consumes: every component from Tasks 4, 6, 7.
- Produces: nothing other tasks import.

- [ ] **Step 1: Write the failing test**

Create `test/gallery.spec.ts`:

```ts
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
  it.each([".ds-hero", ".ds-header", ".ds-section", ".ds-footer__cols"])(
    "demonstrates %s",
    (cls) => { expect(sections()).toContain(cls); }
  );

  it("shows the short Burnside mark where the header is demonstrated", () => {
    expect(sections()).toContain("wordmark-short");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run test/gallery.spec.ts`
Expected: 5 failed.

- [ ] **Step 3: Add the hero section**

Create `gallery/sections/hero.html`, following the markup style of an existing file such as `gallery/sections/card-table.html` (read it first for the heading and wrapper convention):

```html
<section class="g-sec" id="hero">
  <h2 class="g-sec__h">Hero</h2>
  <div class="ds-hero">
    <h1 class="ds-display">Display headline</h1>
    <p class="ds-hero__lede">A lede paragraph sitting under the display headline, at the width the component sets.</p>
    <div class="ds-hero__actions">
      <a class="ds-btn ds-btn--accent" href="#hero">Primary</a>
      <a class="ds-btn ds-btn--secondary" href="#hero">Secondary</a>
    </div>
  </div>
</section>
```

- [ ] **Step 4: Add the chrome section**

Create `gallery/sections/chrome.html`:

```html
<section class="g-sec" id="chrome">
  <h2 class="g-sec__h">Page chrome</h2>

  <!-- Not sticky in the gallery: one page showing many components cannot have
       several bars competing for the top of the viewport. -->
  <p class="ds-help">Rendered inline. On a real page .ds-header is sticky and gains its hairline on scroll.</p>
  <header class="ds-header" style="position: static">
    <div class="ds-container">
      <div class="ds-nav">
        <a class="ds-nav__brand" href="#chrome">
          <img src="./dist/identity/burnside/wordmark-short.svg" alt="Burnside Steps">
        </a>
        <div class="ds-nav__links" data-ds-nav="gallery">
          <a href="#chrome">Pricing</a><a href="#chrome">Docs</a><a href="#chrome">GitHub</a>
        </div>
        <a class="ds-btn ds-btn--sm ds-btn--secondary" href="#chrome">Start hosted</a>
      </div>
    </div>
  </header>

  <section class="ds-section">
    <div class="ds-container">
      <h2 class="ds-h2 ds-section__title">First section</h2>
      <p>Sections carry their own block padding.</p>
    </div>
  </section>
  <section class="ds-section">
    <div class="ds-container">
      <h2 class="ds-h2 ds-section__title">Second section</h2>
      <p>Adjacent siblings divide with a hairline. The first section has none above it.</p>
    </div>
  </section>

  <footer class="ds-footer">
    <div class="ds-container">
      <div class="ds-footer__cols">
        <div class="ds-footer__id">
          <img src="./dist/identity/burnside/wordmark.svg" alt="Burnside Steps">
          <p>The footer draws the full stacked mark, where height is cheap.</p>
        </div>
        <div>
          <h3 class="ds-footer__label" id="g-foot-a">Product</h3>
          <ul class="ds-footer__list" aria-labelledby="g-foot-a">
            <li><a class="ds-footer__link" href="#chrome">Pricing</a></li>
            <li><a class="ds-footer__link" href="#chrome">Questions</a></li>
          </ul>
        </div>
        <div>
          <h3 class="ds-footer__label" id="g-foot-b">Company</h3>
          <ul class="ds-footer__list" aria-labelledby="g-foot-b">
            <li><a class="ds-footer__link" href="#chrome">Privacy</a></li>
            <li><a class="ds-footer__link" href="#chrome">Terms</a></li>
          </ul>
        </div>
      </div>
      <div class="ds-footer__base"><span>&copy; 2026 Greenwich Steps</span><span>AGPL-3.0</span></div>
    </div>
  </footer>
</section>
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm exec vitest run test/gallery.spec.ts`
Expected: 5 passed.

Run: `pnpm build:gallery` then `pnpm test`
Expected: gallery builds without the missing-placeholder error; 126 passed.

- [ ] **Step 6: Commit**

```bash
git add gallery/sections/hero.html gallery/sections/chrome.html test/gallery.spec.ts
git commit -m "docs: gallery sections for hero and page chrome

Closes GRE-149: hero shipped in v0.4.0 with no gallery section. Chrome
covers .ds-header, .ds-section dividers and the footer shell in one
composition, with position:static on the header so several bars do not
compete for the top of a single gallery page."
```

---

### Task 10: Release v0.7.0

**Files:**
- Modify: `package.json:3`
- Modify: `README.md`

**Interfaces:**
- Consumes: everything above.
- Produces: tag `v0.7.0` on `main`, which is what the two site-adoption specs pin.

- [ ] **Step 1: Verify the whole suite from clean**

```bash
rm -rf dist && pnpm build && pnpm test
```

Expected: 126 passed, no failures, no skips.

- [ ] **Step 2: Verify the built artifacts actually contain the new CSS**

```bash
grep -c "position: sticky" dist/ui.css          # expect >= 1
grep -c "ds-footer__cols" dist/ui.css           # expect >= 1
grep -c "ds-section + .ds-section" dist/ui.css  # expect >= 1
grep -o "initStickyHeader" dist/ui.mjs | head -1  # expect a match
ls dist/identity/burnside/wordmark-short*.svg   # expect 3 files
```

Every one must produce output. `dist/` is rebuilt by `globalSetup`, so a stale artifact here means the build script missed a file.

- [ ] **Step 3: Bump the version**

In `package.json`, change `"version": "0.6.1"` to `"version": "0.7.0"`.

Minor, not patch: the header markup change is breaking for consumers, and at 0.x a minor bump is the signal for that.

- [ ] **Step 4: Document the breaking change**

In `README.md`, add a section recording the required markup migration:

```markdown
## v0.7.0 breaking change: header markup

`.ds-header` is new and the header must be restructured. Before:

```html
<div class="ds-container"><header class="ds-nav">…</header></div>
```

After:

```html
<header class="ds-header"><div class="ds-container"><div class="ds-nav">…</div></div></header>
```

`position: sticky` is bounded by the parent's content box, so the old nesting
gave the bar zero travel and no amount of CSS would have made it stick. Do not
collapse `.ds-container` and `.ds-nav` onto one element: `.ds-nav`'s padding
would zero the container's `padding-inline` and misalign the bar by 24px.

Call `initStickyHeader()` (or `initAll()`) to get the scroll hairline and the
`--ds-header-h` measurement that `scroll-padding-top` uses for anchor offsets.

Brand marks are sized by `--ds-brand-nav-h` and `--ds-brand-foot-h` per theme;
`.ds-nav__brand` no longer sets a height.
```

- [ ] **Step 5: Commit and tag**

```bash
git add package.json README.md
git commit -m "release: v0.7.0, page chrome and type scale

Breaking: header markup restructures to header > container > nav.

Sticky full-bleed .ds-header with blur behind @supports and a hairline
on scroll, display type at a real Canela weight instead of a synthesised
700, header chrome scaled below body size, .ds-section dividers, the
promoted .ds-footer shell, and a short Burnside wordmark so both brands'
bars land at 48px."
git tag v0.7.0
```

Do not push the tag until the two site-adoption specs are ready to consume it. A tag pointing at an unmerged branch is the exact problem GRE-235 recorded against v0.6.0 and v0.6.1.

- [ ] **Step 6: File the follow-ups**

Create Linear issues in the Design System project:

1. **Burnside short wordmark**, referenced by this plan's Task 8 as a prerequisite. Close it as done in the same pass if Task 8 has landed.
2. **`wordmark-dark.svg` keeps the light-theme accent.** Burnside's dark pinned variant fills its dot with `#3B3BD9`, the light-theme indigo, which measures 2.49:1 on the dark ground. Acceptable for a decorative dot, not for a letterform. Belongs with GRE-227, which is about exactly this class of defect, so add it there as a comment rather than filing a duplicate.

Also correct **GRE-235**'s description: it states the grouped footer has two consumers, burnside-www and burnside-hosted. `hosted/web/styles.css` contains no footer rules. Its stated blocker is resolved: design-system is on `main` and v0.5.1, v0.6.0 and v0.6.1 are all ancestors of it.

---

## Self-Review

**Spec coverage.** Section 1 header, Task 4 plus Task 5. Section 2 heading weight and guard, Task 1. Section 3 nav and button scale, Tasks 2 and 3. Section 4 `.ds-section`, Task 6. Section 5 footer shell and the GRE-235 correction, Task 7 and Task 10 Step 6. Section 6 brand height, short wordmark, identity rule amendment and tokens, Tasks 2 and 8. Section 7 gallery and ledger, Tasks 6, 7, 8, 9. Section 8 tests, distributed across every task. Risks, Task 10.

**Two spec items deliberately deferred, both belonging to site adoption rather than the kit:** Farnsworth's two-place version pin, and the possible `border-block` collision between `.ds-section` dividers and `.site-facts`. Both are recorded in the spec's Risks section and must appear in the site-adoption plan.

**Type consistency.** `initStickyHeader(root: ParentNode = document): void` is used identically in Task 5's test, implementation, `index.ts` export and `initAll` call. `--ds-header-h` is written in Task 5 and read in Task 4's `reset.css`. `--ds-brand-nav-h` is declared in Task 2 and read in Task 2's `layout.css`; `--ds-brand-foot-h` is declared in Task 2 and read in Task 7's `footer.css`. `is-scrolled` is defined in Task 4's CSS and toggled in Task 5's behavior.

**Test count trajectory:** 84 → 86 → 91 → 94 → 101 → 105 → 109 → 115 → 121 → 126. If a task's actual count differs, the step's expectation is wrong, not the test; reconcile before moving on.
