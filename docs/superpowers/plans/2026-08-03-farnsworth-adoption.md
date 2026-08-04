# Farnsworth Site Adoption of design-system v0.7.1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move farnsworthsteps.com from design-system v0.6.1 to v0.7.1, adopting the sticky header shell, the promoted section and footer components, and the real Farnsworth wordmark, without introducing horizontal overflow at 320px or 375px.

**Architecture:** Part 3 of the three-part sequence specced in `docs/superpowers/specs/2026-08-02-site-adoption-design.md`. Parts 1 (kit v0.7.1) and 2 (Burnside adoption) are done. Farnsworth has no partials, so the header and footer are inline on **four** pages and each edit happens four times. The sequencing is deliberate: the CTA relocation (Task 3) lands **before** the wordmark swap (Task 4), because the relocation fixes an overflow the live site already has and the wordmark swap is what would otherwise make it far worse.

**Tech Stack:** Static HTML + CSS built by `www/web/build.mjs` (esbuild for `boot.ts`, file copies for everything else), served by a Cloudflare Worker with assets. Tests are vitest, `readFileSync` plus string matching against **built output** in `www/public/`. Task 3 adds the first browser-driven layout check in the family, as a separate script.

**Working directory for every command and path in this plan:**
`/Users/leewang/dev/farnsworthsteps/.claude/worktrees/farnsworth-v071-adoption`
This is a git worktree on branch `worktree-farnsworth-v071-adoption`. Task 7 Step 3 is the one exception; it touches a different repo and says so.

## Global Constraints

- **The pin exists in TWO places**: `package.json:10` and `www/package.json:11`. Bumping one leaves the site silently on old assets.
- **There are FOUR built pages, not three.** `www/web/build.mjs` copies `404.html` alongside `index.html`, `privacy/index.html` and `terms/index.html`, and `www/test/html-files.ts`'s `htmlFiles()` walks all four. Its own comment states the convention: "Site-wide rules have to run against all of them, not just the one page whoever wrote the assertion had open." Any chrome this plan adds goes on all four.
- **`htmlFiles()` names have no leading slash.** `PUBLIC` ends in `/`, so `f.replace(PUBLIC, "")` yields `index.html`, not `/index.html`. Expected-failure messages in this plan use the unslashed form.
- **No em-dashes anywhere in public copy.** `www/test/copy.spec.ts` enforces the character and its three entity spellings across every built page.
- **Never write "Farnsworth Steps".** `copy.spec.ts` strips `farnsworthsteps` then fails on `farnsworth steps`, case-insensitively, on every page. Image `alt` text must be `Farnsworth`. This differs from Burnside, whose real name *is* "Burnside Steps"; do not copy its markup verbatim.
- **`www/CLAIMS.md` assertions must stay green in both directions.** New footer copy is scanned by the forbidden-claims table on every page. Forbidden today: `profile photo`, `calendar invit`, `menu bar`, `Continuity Camera`, `image markup`, `Apple Silicon`.
- **Do not disturb these counts** in `www/test/sections.spec.ts`, which assert exactly 2 across the whole home page: `action="/api/waitlist"`, `method="post"`, `class="cf-turnstile"`, `type="email"`, and the bare word `required`.
- **Quote rule text, not line numbers, when editing `www/web/styles.css`.** Successive tasks delete from that file, so every line number after the first deletion is stale. This plan gives the text to match.
- **Take a worktree before committing.** Other sessions have been active in these repos. Use explicit paths in `git add`, never `-A` or `.`. Never `git stash`.
- Baseline to preserve or grow: **91 tests green** via `pnpm --dir www test`.

## What changes visibly at this bump, beyond the structural work

Three deltas ride along with v0.7.1 that no task in this plan causes and every reviewer should expect to see. Verified by diffing the installed v0.6.1 `dist/ui.css` against the v0.7.1 kit.

1. **Every heading gets lighter.** v0.6.1 declares no `font-weight` on `.ds-display`, `.ds-h1`, `.ds-h2` or `.ds-quote`, so `<h1>` and `<h2>` inherit the UA's `bold` and, since Canela ships only 300/400/500 weights, render as **synthetic bold**. v0.7.1 adds `font-weight: 400` to all of them. Farnsworth has one `.ds-display`, nine `.ds-h2` section titles, and `.ds-h1`/`.ds-h2` throughout `/privacy` and `/terms`. This is the most visually obvious change in the release.
2. **Desktop nav links shrink** from 16px to 14px: v0.7.1 adds `font-size: var(--ds-text-sm)` to `.ds-nav__links`.
3. **Every button gets narrower by 16px.** `.ds-btn` horizontal padding moves from `--ds-space-5` (24px) to `--ds-space-4` (16px). This is why the nav CTA is 150.2px under v0.7.1 where it measured 166.2px under v0.6.1.

## Measurements this plan is built on

The spec required these and they changed the plan's shape. All overflow figures are **viewport-relative**, computed as `24 + navContent - viewport`: the container contributes only its left padding, because the overflow runs rightward.

Captured 2026-08-03 in Chromium against the real self-hosted fonts, on the built site served from `www/public/`:

| Configuration | 375px | 320px | Basis |
|---|---|---|---|
| Today, v0.6.1, as live | 0px | **24px** | measured |
| v0.7.1 toggle fix only, text wordmark kept | 0px | ~27px | derived |
| v0.7.1 + wordmark SVG, spec as written | **~80px** | **~135px** | derived |
| v0.7.1 + wordmark SVG + CTA in the collapsed menu | 0px | 0px | measured |

**Measured component widths, v0.6.1, at 375px:** brand text span 84.4, gap 24, toggle **28.4** (compressed, `flex-shrink` absent), gap 24, CTA 166.2. Sum **327.0** against 327.0 available. The bar has exactly zero slack today and is held together only by the toggle compressing, which is precisely what v0.7.1 stops.

**The derived rows** substitute the two values v0.7.1 changes: the toggle holds 40px instead of compressing, and the CTA is 150.2px instead of 166.2px (16px of padding, see delta 3 above). Row 3 is `192.7 + 24 + 40 + 24 + 150.2 = 430.9`. The equivalent measurement taken under v0.6.1 button metrics was 96px and 151px; the v0.7.1 figures are smaller only because the button is narrower, and the conclusion is unchanged.

**Row 4 is measured and is unaffected by the button change,** because the CTA is not in the bar: `192.7 + 24 + 40 = 256.7` against 327 (375px) and 272 (320px).

The wordmark is `viewBox="0 0 5462 737"`, aspect **7.4111:1**, so at `--ds-brand-nav-h: 26px` it renders **192.7px** wide, 108.3px more than the text span it replaces. Both brand tokens arrive with this bump; v0.6.1's theme file has neither.

**Two pre-existing overflow bugs found, both on the live site at 320px, both independent of this adoption:**

1. The nav CTA's right edge lands at **344.4** in a 320 viewport. Task 3 fixes this as a side effect.
2. The Turnstile widget `.cf-turnstile` is a fixed **300px** and ends at x=**324**. **Not fixed here**, filed separately in Task 7. Turnstile's flexible size still has a 300px minimum, so the fix is a container or scale decision, not a one-liner, and it does not belong in a kit-adoption change.

**Consequence to state plainly rather than bury:** because bug 2 is deferred, **farnsworthsteps.com still overflows a 320px viewport by 4px after this work lands.** The spec asked for an assertion that document `scrollWidth` does not exceed the viewport at 320 and 375. That literal form is unsatisfiable at 320px until Turnstile is fixed, so Task 3 delivers a stronger per-element sweep instead and excludes the vendor widget explicitly. This is a deliberate substitution, not an oversight.

**Founder decision already taken (2026-08-03):** below 720px the "Join the waitlist" CTA moves out of the always-visible bar and into the collapsed menu. On a waitlist-capture page that is a product change, not a layout detail, and it was signed off with the alternatives costed. The alternative that keeps the CTA in the bar with a short "Join" label at `.ds-btn--sm` metrics fits 375px and still overflows 320px by ~45px.

---

### Task 1: Bump the pin in both manifests, and prove the kit's content arrived

**Files:**
- Modify: `package.json:10`
- Modify: `www/package.json:11`
- Create: `www/test/pin.spec.ts`
- Modify: `www/test/assets.spec.ts` (append one describe block)

**Interfaces:**
- Consumes: nothing.
- Produces: `www/public/ui.css` containing the v0.7.1 `[data-ds-nav-toggle]` rule, which every later task depends on for the toggle's `flex-shrink: 0` and centring.

- [ ] **Step 1: Write the failing tests**

Create `www/test/pin.spec.ts`:

```ts
// @vitest-environment node

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// The pin lives in two manifests. Bumping one and not the other leaves the site building
// against whichever pnpm resolves first, with no error and no visible symptom until a
// component silently renders on old CSS. This is the specific failure the spec calls out
// twice, and it is worth an assertion rather than a comment.
const read = (rel: string) =>
  JSON.parse(readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8"));

const DEP = "@greenwichsteps/design-system";

describe("design-system pin", () => {
  it("is declared in both manifests", () => {
    expect(read("../../package.json").dependencies[DEP]).toBeDefined();
    expect(read("../package.json").dependencies[DEP]).toBeDefined();
  });

  it("is the same tag in both manifests", () => {
    const root = read("../../package.json").dependencies[DEP];
    const www = read("../package.json").dependencies[DEP];
    expect(www, `root pins ${root}, www pins ${www}`).toBe(root);
  });

  it("pins a tag rather than a branch", () => {
    // A branch pin re-resolves on every install, so a kit change lands here unannounced.
    // Pinning a tag is what insulated the original build from GRE-165 landing mid-flight.
    const root = read("../../package.json").dependencies[DEP];
    expect(root, `expected a #vX.Y.Z tag, got ${root}`).toMatch(/#v\d+\.\d+\.\d+$/);
  });
});
```

Append to `www/test/assets.spec.ts`:

```ts
// GRE-237: this suite asserted the kit stylesheets existed but never that they contained
// anything, so a build that copied a stale or empty ui.css passed. These check content that
// only exists at or after the pinned version, which is what makes the pin bump verifiable
// rather than merely declared.
describe("kit content, not just kit filenames", () => {
  it("ships the v0.7.1 nav-toggle rule, centring included", () => {
    const ui = readFileSync(at("ui.css"), "utf8");
    const rule = ui.match(/\[data-ds-nav-toggle\]\s*\{[^}]*\}/);
    expect(rule, "ui.css declares no [data-ds-nav-toggle] rule").not.toBeNull();
    // flex-shrink is the tap-target fix; justify-content is the centring fix. Both shipped
    // in v0.7.1 and both are load-bearing for this site, so assert the properties rather
    // than the selector alone.
    expect(rule![0]).toContain("flex-shrink");
    expect(rule![0]).toContain("justify-content");
  });

  it("ships the promoted section component's divider rule", () => {
    // The adjacent-sibling rule specifically, not the bare class name: ".ds-section" alone
    // is satisfied by ".ds-section__title", so a kit missing the dividers would still pass.
    // This is the rule Task 5 actually depends on.
    expect(readFileSync(at("ui.css"), "utf8")).toContain(".ds-section + .ds-section");
  });

  it("ships the promoted footer shell", () => {
    expect(readFileSync(at("ui.css"), "utf8")).toContain(".ds-footer__cols");
  });

  it("ships the sticky header component", () => {
    expect(readFileSync(at("ui.css"), "utf8")).toContain(".ds-header");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --dir www test`
Expected: FAIL. All three `pin.spec.ts` cases pass already (both manifests are at `#v0.6.1`, which is identical and matches the tag pattern), and the four `assets.spec.ts` additions fail, the first with "ui.css declares no [data-ds-nav-toggle] rule". v0.6.1's kit has no such rule, no `.ds-section`, no `.ds-footer__cols` and no `.ds-header`.

- [ ] **Step 3: Bump both pins**

In **both** `package.json:10` and `www/package.json:11`, change `#v0.6.1` to `#v0.7.1` in:

```json
    "@greenwichsteps/design-system": "git+https://github.com/greenwichsteps/design-system.git#v0.6.1"
```

- [ ] **Step 4: Reinstall so the new tag is fetched**

Run: `pnpm install`
Expected: `+ @greenwichsteps/design-system 0.7.1`. The specifier URL changed, so no `--force` is needed; if it still reports 0.6.1, then use `pnpm install --force`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm --dir www test`
Expected: PASS, 91 + 7 = **98 tests**.

**The page now renders worse, not better, and stays that way until Task 3.** Two things regress in this interval. The toggle stops compressing, so the bar loses its only source of slack. More seriously, v0.6.1 positioned the open mobile menu with a hardcoded `inset: 56px 0 auto` while v0.7.1 uses `inset: 100% 0 auto`; there is still no positioned ancestor until Task 2 adds `.ds-header`, so between here and there the open menu resolves `100%` against the initial containing block and renders one full viewport height down, i.e. off-screen. The suite is green throughout because nothing in it reads these rules.

- [ ] **Step 6: Commit**

```bash
git add package.json www/package.json pnpm-lock.yaml www/test/pin.spec.ts www/test/assets.spec.ts
git commit -m "chore: pin design-system v0.7.1 in both manifests

Adds assertions for the pin parity trap and for kit content rather than
kit filenames, which is the GRE-237 gap."
```

---

### Task 2: Restructure the header into the kit's sticky shell on all four pages

**Files:**
- Modify: `www/web/index.html:24-37`
- Modify: `www/web/privacy/index.html:22-26`
- Modify: `www/web/terms/index.html:22-26`
- Modify: `www/web/404.html:16-17` (insert; the page currently has no header at all)
- Modify: `www/web/boot.ts:4,23`
- Modify: `www/web/styles.css` (delete the local nav-toggle block)
- Modify: `www/test/sections.spec.ts` (append one describe block)
- Modify: `www/test/theme.spec.ts` (insert one case)

**Interfaces:**
- Consumes: `.ds-header` from Task 1's `ui.css`.
- Produces: `<header class="ds-header">` wrapping `<div class="ds-container">` wrapping `<div class="ds-nav">` on all four pages; the `allPages()` helper that Tasks 5 and 6 reuse; and `--ds-header-h` published at runtime by `initStickyHeader`.

**`404.html` gets the header too.** It is a built page that `htmlFiles()` walks, and it currently ships no navigation at all: a visitor who lands there has one "Back to the start" button and nothing else. It takes the same brand-only header as `/privacy` and `/terms`.

**Why three elements and not two.** The kit's `header.css` says it outright: `.ds-nav` sets `padding-block`, and collapsing the container onto `.ds-nav` would zero the container's `padding-inline`, putting the bar's contents 24px left of every section's. Do not merge them.

**Why `<div class="ds-nav">` and not `<header class="ds-nav">`.** The outer element is now the `<header>` landmark. Keeping the inner one as a `<header>` nests a banner inside a banner.

- [ ] **Step 1: Write the failing tests**

Append to `www/test/sections.spec.ts`:

```ts
import { htmlFiles, PUBLIC } from "./html-files";

// Every built page, 404 included. Farnsworth has no header partial, so the restructure
// happens four times by hand and missing one leaves that page's bar misaligned against its
// own sections by 24px, which is subtle enough to survive a glance. Names carry no leading
// slash: PUBLIC ends in "/", so the replace yields "index.html".
const allPages = () =>
  htmlFiles().map((f) => ({ name: f.replace(PUBLIC, ""), html: readFileSync(f, "utf8") }));

describe("sticky header shell", () => {
  it("wraps every page's nav in the kit header", () => {
    const missing = allPages().filter((p) => !p.html.includes('class="ds-header"')).map((p) => p.name);
    expect(missing, `pages with no .ds-header: ${missing.join(", ")}`).toEqual([]);
  });

  it("nests header > container > nav on every page, in that order", () => {
    for (const p of allPages()) {
      const header = p.html.indexOf('class="ds-header"');
      expect(header, `${p.name}: no .ds-header`).toBeGreaterThan(-1);
      const container = p.html.indexOf('class="ds-container"', header);
      const nav = p.html.indexOf('class="ds-nav', header);
      expect(container, `${p.name}: no .ds-container inside .ds-header`).toBeGreaterThan(header);
      expect(nav, `${p.name}: .ds-nav must sit inside the container, not replace it`).toBeGreaterThan(container);
    }
  });

  it("leaves no page with a bare .ds-nav outside a .ds-header", () => {
    // The old shape was .ds-container > header.ds-nav with no .ds-header at all. If a page
    // keeps it, the collapsed nav menu's `position: absolute; inset: 100% 0 auto` has no
    // positioned ancestor and resolves against the viewport instead of the bar.
    const bad = allPages().filter((p) => /<header class="ds-nav/.test(p.html)).map((p) => p.name);
    expect(bad, `pages still using <header class="ds-nav">: ${bad.join(", ")}`).toEqual([]);
  });
});
```

In `www/test/theme.spec.ts`, insert this **before** the closing `});` of the existing `describe("theming", ...)` block:

```ts
  it("boots the sticky header, which is what publishes --ds-header-h", () => {
    // reset.css feeds --ds-header-h into scroll-padding-top. Without initStickyHeader that
    // custom property is never written, the fallback 0px applies, and every in-page anchor
    // lands under the sticky bar. Nothing else in the build would report that.
    //
    // Matched on the ".ds-header" string literal rather than the identifier: the build
    // minifies, so esbuild renames the imported binding but cannot rewrite a string.
    expect(readFileSync(at("boot.js"), "utf8")).toContain("ds-header");
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --dir www test`
Expected: FAIL with `pages with no .ds-header: 404.html, index.html, privacy/index.html, terms/index.html` and a `boot.js` missing `ds-header`.

- [ ] **Step 3: Restructure the home page header**

In `www/web/index.html`, replace **lines 24-37** (the block ends with the `</div>` on line 37, not the `</header>` on line 36; deleting 24-36 leaves an orphan closing tag):

```html
<div class="ds-container">
  <header class="ds-nav site-nav">
    <a class="ds-nav__brand" href="/" aria-label="Farnsworth home">
      <span class="site-wordmark">Farnsworth</span>
    </a>
    <div class="ds-nav__links site-nav__links" data-ds-nav="main">
      <a class="ds-link site-nav__link" href="#inbox">Features</a>
      <a class="ds-link site-nav__link" href="#pricing">Pricing</a>
      <a class="ds-link site-nav__link" href="#faq">Questions</a>
    </div>
    <button class="ds-iconbtn" data-ds-nav-toggle="main" aria-label="Menu">&#8801;</button>
    <a class="ds-btn ds-btn--accent" href="#hero">Join the waitlist</a>
  </header>
</div>
```

with:

```html
<header class="ds-header">
  <div class="ds-container">
    <div class="ds-nav site-nav">
      <a class="ds-nav__brand" href="/" aria-label="Farnsworth home">
        <span class="site-wordmark">Farnsworth</span>
      </a>
      <div class="ds-nav__links site-nav__links" data-ds-nav="main">
        <a class="ds-link site-nav__link" href="#inbox">Features</a>
        <a class="ds-link site-nav__link" href="#pricing">Pricing</a>
        <a class="ds-link site-nav__link" href="#faq">Questions</a>
      </div>
      <button class="ds-iconbtn" data-ds-nav-toggle="main" aria-label="Menu">&#8801;</button>
      <a class="ds-btn ds-btn--accent" href="#hero">Join the waitlist</a>
    </div>
  </div>
</header>
```

The brand stays a text span for now; Task 4 swaps it. The CTA stays in the bar for now; Task 3 moves it.

- [ ] **Step 4: Restructure the privacy and terms headers**

In **both** `www/web/privacy/index.html` and `www/web/terms/index.html`, replace:

```html
<div class="ds-container">
  <header class="ds-nav">
    <a class="ds-nav__brand" href="/" aria-label="Farnsworth home"><span class="site-wordmark">Farnsworth</span></a>
  </header>
</div>
```

with:

```html
<header class="ds-header">
  <div class="ds-container">
    <div class="ds-nav">
      <a class="ds-nav__brand" href="/" aria-label="Farnsworth home"><span class="site-wordmark">Farnsworth</span></a>
    </div>
  </div>
</header>
```

- [ ] **Step 5: Give 404.html the same header**

In `www/web/404.html`, insert the identical block between `<body>` (line 16) and `<main class="ds-container">` (line 17), so the page reads:

```html
<body>
<header class="ds-header">
  <div class="ds-container">
    <div class="ds-nav">
      <a class="ds-nav__brand" href="/" aria-label="Farnsworth home"><span class="site-wordmark">Farnsworth</span></a>
    </div>
  </div>
</header>
<main class="ds-container">
```

- [ ] **Step 6: Boot the sticky header**

In `www/web/boot.ts` line 4, change:

```ts
import { initTheme, initNav } from "@greenwichsteps/design-system/ui.mjs";
```

to:

```ts
import { initTheme, initNav, initStickyHeader } from "@greenwichsteps/design-system/ui.mjs";
```

and after line 23 (`safeInit("initNav", initNav);`) add:

```ts
// Publishes the measured bar height as --ds-header-h, which reset.css feeds into
// scroll-padding-top so in-page anchors clear the sticky bar rather than tucking under it.
// It also toggles the hairline on scroll. The height is the part that matters: without it
// every "#pricing" style link lands with its heading hidden behind the bar.
safeInit("initStickyHeader", initStickyHeader);
```

- [ ] **Step 7: Delete the now-dead local nav rules**

In `www/web/styles.css`, delete this whole block (currently lines 8-11, but match on the text):

```css
/* The kit reveals .ds-nav__links above 720px, so the toggle is only for narrow screens. */
[data-ds-nav-toggle] { display: none; }
@media (max-width: 720px) { [data-ds-nav-toggle] { display: inline-flex; } }
.ds-nav__brand { flex-shrink: 0; }
```

All four lines are now the kit's job: `layout.css` declares `[data-ds-nav-toggle] { display: none; flex-shrink: 0; align-items: center; justify-content: center; }`, the matching 720px query, and `.ds-nav__brand { flex-shrink: 0 }`. The local copy declares only `display`, so it is the kit's rule minus three properties. Keeping it is duplication, not insurance.

- [ ] **Step 8: Run tests to verify they pass**

Run: `pnpm --dir www test`
Expected: PASS, **102 tests**.

- [ ] **Step 9: Verify the bar in a browser, at 1280 and 375**

```bash
pnpm --dir www build
cd www/public && python3 -m http.server 4173
```

Confirm, by scrolling rather than by reading the CSS:
- the bar stays at the top of the viewport, and the hairline appears on scroll and reverts at the top;
- `getComputedStyle(document.documentElement).getPropertyValue('--ds-header-h')` is non-empty and reads **59px at both widths**. The arithmetic: `.ds-nav` `padding-block: var(--ds-space-2)` is 8px each side, the tallest child is the `.ds-btn` CTA at 16px (`line-height: 1` on a 16px base) + 24px vertical padding + 2px border = 42px, and `.ds-header` adds a 1px bottom border. 8 + 42 + 8 + 1 = 59. It is 59 at *both* widths because the CTA is still in the bar at every width until Task 3; the 57px mobile value (8 + 40px toggle + 8 + 1) arrives only once Task 3 moves it out.
- clicking a nav link lands its heading **below** the bar, not under it;
- headings now render in real Canela 400 rather than synthetic bold, which is expected (see "What changes visibly" above).

Note that neither local server applies `_headers`, so the production CSP is not exercised by any browser check in this plan. `initStickyHeader` writes `sentinel.style.cssText`, which is CSSOM and not governed by `style-src`, so there is no known risk; it is simply unverified.

- [ ] **Step 10: Commit**

```bash
git add www/web/index.html www/web/privacy/index.html www/web/terms/index.html www/web/404.html www/web/boot.ts www/web/styles.css www/test/sections.spec.ts www/test/theme.spec.ts
git commit -m "feat: adopt the kit's sticky header shell on all four pages

Three elements, one job each: .ds-header for the sticky chrome, .ds-container
for the gutter, .ds-nav for the row. 404.html gets the header too; it is a
built page htmlFiles() walks and it previously shipped no navigation at all.

Boots initStickyHeader so --ds-header-h is published and anchors clear the
bar. Deletes the local nav-toggle and brand flex-shrink rules, both now the
kit's."
```

---

### Task 3: Move the CTA into the collapsed menu below 720px, and guard against overflow

**Files:**
- Modify: `www/web/index.html` (nav block from Task 2)
- Modify: `www/web/styles.css` (append)
- Create: `www/test/layout.mjs`
- Modify: `www/package.json` (add `playwright` devDependency and a `test:layout` script)
- Modify: `www/test/sections.spec.ts` (append one describe block)

**Interfaces:**
- Consumes: the `.ds-nav` structure from Task 2.
- Produces: `.site-nav__cta` (bar, above 720px) and `.site-nav__cta-menu` (inside `.ds-nav__links`, below 720px); the `test:layout` script that Tasks 4 and 6 rely on.

**This task fixes a bug that is live today.** At 320px the nav CTA's right edge is at 344.4 against a 320 viewport. v0.7.1 does not cause it; v0.7.1 makes it worse by removing the toggle's compression.

**Why a duplicated anchor rather than one moved element.** Above 720px the CTA belongs at the right of the bar; below 720px it belongs in the menu. `.ds-nav__links` is a flex **row** above 720px, so an element parked inside it would sit among the links in the centred group, not at the right. Two anchors, each shown at its own breakpoint, is the ordinary responsive-nav shape. Neither adds any of the strings the count assertions in Global Constraints track.

- [ ] **Step 1: Write the failing static test**

Append to `www/test/sections.spec.ts`:

```ts
// The nav cannot hold brand + toggle + CTA below 720px. Derived from measurements taken
// 2026-08-03 with the real fonts, at v0.7.1 button metrics: brand 192.7 (wordmark SVG,
// 7.4111:1 at --ds-brand-nav-h 26px) + gap 24 + toggle 40 + gap 24 + CTA 150.2 = 430.9
// against 327 available at 375px, so about 80px of horizontal overflow, and about 135px at
// 320px. The CTA moves into the collapsed menu instead.
//
// This is the cheap guard. The real measurement is www/test/layout.mjs, which needs a
// browser and is not in the default suite.
describe("narrow-viewport nav", () => {
  it("carries a menu copy of the CTA inside the collapsed nav links", () => {
    const html = home();
    const links = html.match(/<div class="ds-nav__links[^"]*"[^>]*>([\s\S]*?)<\/div>/);
    expect(links, "no .ds-nav__links block found").not.toBeNull();
    expect(links![1], "the collapsed menu has no CTA").toContain("site-nav__cta-menu");
  });

  it("hides exactly one of the two CTAs at each breakpoint", () => {
    const css = readFileSync(fileURLToPath(new URL("../public/styles.css", import.meta.url)), "utf8");
    // Default state: bar CTA shown, menu CTA hidden.
    expect(css).toMatch(/\.site-nav__cta-menu\s*\{[^}]*display:\s*none/);
    // Below the kit's own 720px breakpoint the pair swaps.
    const mq = css.match(/@media \(max-width: 720px\)\s*\{([\s\S]*?)\n\}/);
    expect(mq, "no 720px media query in styles.css").not.toBeNull();
    expect(mq![1], "bar CTA is not hidden below 720px").toMatch(/\.site-nav__cta\s*\{[^}]*display:\s*none/);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --dir www test`
Expected: FAIL, **both** cases. The first with "the collapsed menu has no CTA", the second with "no 720px media query in styles.css": Task 2 Step 7 deleted the only one the file had.

- [ ] **Step 3: Add the menu CTA and class the bar CTA**

In `www/web/index.html`, inside the `.ds-nav__links` div, after the Questions link, add:

```html
        <a class="ds-btn ds-btn--accent site-nav__cta-menu" href="#hero">Join the waitlist</a>
```

and add the `site-nav__cta` class to the existing bar CTA:

```html
      <a class="ds-btn ds-btn--accent site-nav__cta" href="#hero">Join the waitlist</a>
```

- [ ] **Step 4: Add the breakpoint rules**

Append to `www/web/styles.css`:

```css
/* The bar carries the CTA above 720px; the collapsed menu carries it below, because the bar
   physically cannot hold all three children at that width. Derived from measurements taken
   2026-08-03 against the real fonts, at v0.7.1 button metrics: brand 192.7 + gap 24 +
   toggle 40 + gap 24 + CTA 150.2 = 430.9 against 327 available at 375px.

   Shrinking the mark is not an alternative: keeping the CTA leaves the wordmark an 88.8px
   budget at 375px and 33.8px at 320px, which at its 7.4111:1 aspect means a 12.0px and a
   4.6px tall mark. A short "Join" label at .ds-btn--sm metrics measured 59.9px and still
   overflowed 320px by about 45px.

   Equal specificity with .ds-btn, (0,1,0), resolved by source order: styles.css loads after
   ui.css on every page, so these win. 720px is the kit's own breakpoint, the one that hides
   .ds-nav__links and reveals the toggle. */
.site-nav__cta-menu { display: none; }
@media (max-width: 720px) {
  .site-nav__cta { display: none; }
  .site-nav__cta-menu { display: inline-flex; }
}
```

- [ ] **Step 5: Run the static test to verify it passes**

Run: `pnpm --dir www test`
Expected: PASS, **104 tests**.

- [ ] **Step 6: Add the browser layout harness**

Add to `www/package.json` devDependencies:

```json
    "playwright": "^1.50.0",
```

and to scripts, after `"test"`:

```json
    "test:layout": "pnpm build && node test/layout.mjs",
```

**Deliberately not part of `pnpm test`.** CLAUDE.md promises a fresh clone runs `pnpm --dir www test` with no setup, and Playwright needs a browser binary. Two things keep that promise: the script is separate, and `pnpm-workspace.yaml`'s build allowlist (`allowBuilds: esbuild, workerd`) does not name playwright, so its postinstall browser download does not run on a plain `pnpm install`. **Do not add `playwright` to that allowlist**, because it would silently make every fresh clone download several hundred MB.

Create `www/test/layout.mjs`:

```js
// The first browser-driven check in this family. Every other spec is readFileSync plus
// string matching, which proves markup shape and cannot see layout: the 24px horizontal
// overflow this file catches at 320px shipped to production with 91 tests green.
//
// Plain JS run by node, not a vitest spec, so it stays out of the default `test` script and
// out of `tsc --noEmit`.
// Run it with: pnpm --dir www test:layout
// One-time:    pnpm --dir www exec playwright install chromium

import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join, extname } from "node:path";

const PUBLIC = fileURLToPath(new URL("../public/", import.meta.url));
const PORT = 4178;
const TYPES = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript",
                ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon",
                ".woff2": "font/woff2", ".webmanifest": "application/manifest+json" };

const PAGES = ["/", "/privacy/", "/terms/", "/404.html"];
const WIDTHS = [320, 375, 768, 1280];

const server = createServer(async (req, res) => {
  let path = decodeURIComponent(req.url.split("?")[0]);
  if (path.endsWith("/")) path += "index.html";
  try {
    const body = await readFile(join(PUBLIC, path));
    res.writeHead(200, { "content-type": TYPES[extname(path)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404).end("not found");
  }
});
// Without this, a busy port surfaces as an uncaught EADDRINUSE from a promise that never
// settles, which reads as a hang rather than as the one-line problem it is.
server.on("error", (e) => {
  console.error(`static server could not bind port ${PORT}: ${e.message}`);
  process.exit(1);
});
await new Promise((r) => server.listen(PORT, r));

const failures = [];
let browser;

try {
  // Inside the try, not before it: the likeliest first-run failure is that
  // `playwright install chromium` has not been run, and launching outside the try skips
  // the cleanup below entirely and leaves the server listening.
  browser = await chromium.launch();
  const page = await browser.newPage();

  // Turnstile is blocked outright rather than allowlisted after the fact. Two reasons.
  // Its widget is a fixed 300px that ends at x=324 in a 320 viewport, which is a real
  // pre-launch bug filed separately and NOT this adoption's to fix. And letting it load
  // makes the run nondeterministic: the widget injects an unclassed iframe whose arrival
  // depends on network timing, so the same commit would pass or fail by luck.
  //
  // The cost is stated plainly: this harness cannot see any layout problem involving the
  // Turnstile widget, including the 4px overflow the site still has at 320px. When that bug
  // is fixed, delete this route and the widget comes under the sweep.
  await page.route("https://challenges.cloudflare.com/**", (r) => r.abort());

  for (const path of PAGES) {
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`http://localhost:${PORT}${path}`, { waitUntil: "load" });
      // Fonts change every measured width on this page. Measuring before they settle reports
      // fallback metrics. Returns nothing: a resolved FontFaceSet does not serialize.
      await page.evaluate(async () => { await document.fonts.ready; });

      const found = await page.evaluate(() => {
        const limit = document.documentElement.clientWidth;
        const out = [];
        for (const el of document.querySelectorAll("*")) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 && r.height === 0) continue;
          if (r.right > limit + 0.5 || r.left < -0.5) {
            const cls = el.className?.baseVal ?? el.className ?? "";
            out.push({
              sel: el.tagName.toLowerCase() + (cls ? "." + String(cls).trim().split(/\s+/).join(".") : ""),
              right: +r.right.toFixed(1),
            });
          }
        }
        return { limit, out };
      });

      for (const o of found.out) {
        failures.push(`${path} @${width}px: ${o.sel} right edge ${o.right} > ${found.limit}`);
      }
    }
  }

  // The nav is the element this adoption changed, so assert its fit directly rather than
  // relying on the page-wide sweep, which a future full-width section could mask.
  //
  // Note this measures RENDERED widths, so whenever flex-shrink absorbs a deficit the sum
  // equals `available` and this reports "fits". It catches genuine overflow; it is blind to
  // the tap-target compression that motivated v0.7.1, which is what the kit's flex-shrink: 0
  // and the assertions in sections.spec.ts are for.
  for (const width of [320, 375]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: "load" });
    await page.evaluate(async () => { await document.fonts.ready; });
    const nav = await page.evaluate(() => {
      const n = document.querySelector(".ds-nav");
      if (!n) return null;
      const kids = [...n.children].filter((c) => getComputedStyle(c).display !== "none");
      const gap = parseFloat(getComputedStyle(n).gap) || 0;
      const content = kids.reduce((s, c) => s + c.getBoundingClientRect().width, 0) + gap * (kids.length - 1);
      return { available: n.getBoundingClientRect().width, content: +content.toFixed(1), kids: kids.length };
    });
    if (!nav) {
      failures.push(`nav @${width}px: no .ds-nav on the home page`);
    } else if (nav.content > nav.available + 0.5) {
      failures.push(`nav @${width}px: ${nav.kids} visible children need ${nav.content} in ${nav.available}`);
    } else {
      console.log(`nav @${width}px: ${nav.content} in ${nav.available}, ${(nav.available - nav.content).toFixed(1)} slack`);
    }
  }
} finally {
  // Both must run even when a page throws, or the run leaks a Chromium process and a
  // listening socket, and the next invocation fails on EADDRINUSE for the wrong reason.
  // Optional-chained because browser is undefined if chromium.launch() itself threw.
  await browser?.close();
  server.close();
  server.closeAllConnections?.();
}

if (failures.length) {
  console.error("Horizontal overflow:\n" + failures.map((f) => "  " + f).join("\n"));
  process.exit(1);
}
console.log(`No horizontal overflow across ${PAGES.length} pages x ${WIDTHS.length} widths.`);
```

- [ ] **Step 7: Install the browser and run the layout check**

```bash
pnpm install
pnpm --dir www exec playwright install chromium
pnpm --dir www test:layout
```

Expected: PASS. Until Task 4 the brand is still the 84.4px text span, so expect roughly `nav @320px: 148.4 in 272` and `nav @375px: 148.4 in 327`. The absolute numbers change in Task 4; what must hold now and then is that nothing overflows.

If `playwright install` cannot reach the network, say so and stop rather than skipping the step: Tasks 4 and 6 both gate on this script.

The printed `available` figures assume overlay scrollbars. A headless Chromium configured with classic scrollbars reports `clientWidth` 15px narrower, so slightly different numbers there are not a failure; only a non-zero exit is.

- [ ] **Step 8: Verify the collapsed menu by opening it**

This task creates a new user-visible element that no static test and no sweep can see, because `.ds-nav__links` is `display: none` until `initNav` adds `is-open`, and the sweep deliberately measures the closed bar.

Serve the built site, and at both 375px and 320px:
- click the toggle and confirm the panel opens **flush under the bar** rather than a viewport-height below it. This is the payoff of Task 2: `inset: 100% 0 auto` now resolves against `.ds-header`'s `position: sticky` containing block;
- confirm "Join the waitlist" appears in the panel, is full width, and is tappable;
- confirm nothing overflows horizontally with the menu open;
- click the toggle again and confirm it closes.

- [ ] **Step 9: Commit**

```bash
git add www/web/index.html www/web/styles.css www/package.json pnpm-lock.yaml www/test/layout.mjs www/test/sections.spec.ts
git commit -m "fix: move the nav CTA into the collapsed menu below 720px

The bar cannot hold brand, toggle and CTA at 375px or 320px. This also fixes
a 24px horizontal overflow the live site has today at 320px, where the CTA's
right edge lands at 344.4 in a 320 viewport.

Adds the first browser-driven layout check in the family, as a separate
test:layout script so the default suite still needs no setup. It blocks
Turnstile rather than allowlisting it, so the run is deterministic; the cost
is that the widget's own 320px overflow stays invisible to it."
```

---

### Task 4: Swap the header wordmark for the real identity SVG

**Files:**
- Modify: `www/web/index.html` (brand anchor)
- Modify: `www/web/privacy/index.html` (brand anchor)
- Modify: `www/web/terms/index.html` (brand anchor)
- Modify: `www/web/404.html` (brand anchor)
- Modify: `www/web/styles.css` (delete the `.site-wordmark` rule)
- Modify: `www/test/assets.spec.ts` (append one describe block)

**Interfaces:**
- Consumes: the `.ds-nav__brand` anchors from Task 2, and Task 3's headroom.
- Produces: `<img src="/identity/farnsworth/wordmark.svg" alt="Farnsworth">` inside every `.ds-nav__brand`.

GRE-222 shipped this wordmark and the site already uses it for favicons, `og:image` and the Twitter card, but never in the header, which still renders the name as live text.

**Do not add a height to the img.** The kit's `.ds-nav__brand img` is `(0,1,1)` against a site rule's `(0,1,0)`, so the kit wins and a local height loses silently rather than erroring. Height comes from `--ds-brand-nav-h: 26px`, which arrives with this bump.

**`alt="Farnsworth"`, never `alt="Farnsworth Steps"`.** See Global Constraints.

- [ ] **Step 1: Write the failing test**

Append to `www/test/assets.spec.ts`:

```ts
// The wordmark is outlined to paths precisely so it renders correctly inside an <img>,
// where the host page's @font-face rules cannot reach it. Live text in the header was the
// pre-GRE-222 placeholder and is not the brand. Uses the file's existing pages(), which
// walks all four built pages: every one of them carries a brand anchor after Task 2.
describe("header wordmark", () => {
  it("renders the identity SVG in every page's nav brand", () => {
    for (const p of pages()) {
      const brand = p.html.match(/<a class="ds-nav__brand"[^>]*>([\s\S]*?)<\/a>/);
      expect(brand, `${p.name}: no .ds-nav__brand anchor`).not.toBeNull();
      expect(brand![1], `${p.name}: nav brand is not the wordmark SVG`).toContain(
        "/identity/farnsworth/wordmark.svg",
      );
    }
  });

  it("carries no live-text wordmark anywhere", () => {
    const bad = pages().filter((p) => p.html.includes("site-wordmark")).map((p) => p.name);
    expect(bad, `pages still rendering the wordmark as text: ${bad.join(", ")}`).toEqual([]);
  });

  it("names the product, not the stairway, in alt text", () => {
    // copy.spec.ts fails the whole build on "Farnsworth Steps". Burnside's mark legitimately
    // uses alt="Burnside Steps"; copying that shape here breaks the suite.
    let checked = 0;
    for (const p of pages()) {
      const imgs = [...p.html.matchAll(/<img[^>]*wordmark\.svg[^>]*>/g)].map((m) => m[0]);
      for (const img of imgs) {
        checked++;
        expect(img, `${p.name}: wordmark img has no alt`).toMatch(/alt="[^"]+"/);
        expect(img.toLowerCase(), `${p.name}: alt says "Farnsworth Steps"`).not.toContain("farnsworth steps");
      }
    }
    expect(checked, "no wordmark images found, so this test proves nothing").toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --dir www test`
Expected: FAIL with `404.html: nav brand is not the wordmark SVG` (or whichever page `htmlFiles()` walks first).

- [ ] **Step 3: Swap the home page brand**

In `www/web/index.html`, replace:

```html
      <a class="ds-nav__brand" href="/" aria-label="Farnsworth home">
        <span class="site-wordmark">Farnsworth</span>
      </a>
```

with:

```html
      <a class="ds-nav__brand" href="/" aria-label="Farnsworth home">
        <img src="/identity/farnsworth/wordmark.svg" alt="Farnsworth">
      </a>
```

- [ ] **Step 4: Swap the other three brands**

In `www/web/privacy/index.html`, `www/web/terms/index.html` and `www/web/404.html`, replace:

```html
      <a class="ds-nav__brand" href="/" aria-label="Farnsworth home"><span class="site-wordmark">Farnsworth</span></a>
```

with:

```html
      <a class="ds-nav__brand" href="/" aria-label="Farnsworth home"><img src="/identity/farnsworth/wordmark.svg" alt="Farnsworth"></a>
```

- [ ] **Step 5: Delete the retired font rule**

In `www/web/styles.css`, delete this line (match on the text; its line number has moved since Task 2 deleted from the same file):

```css
.site-wordmark { font-family: var(--ds-font-sans); font-weight: 700; letter-spacing: -0.02em; }
```

Leave the `.ds-nav__brand { text-decoration: none; }` rule alone: the brand anchor still has no kit class and would otherwise fall through to the UA underline.

- [ ] **Step 6: Run both suites**

Run: `pnpm --dir www test`
Expected: PASS, **107 tests**.

Run: `pnpm --dir www test:layout`
Expected: PASS, now printing `nav @320px: 256.7 in 272` and `nav @375px: 256.7 in 327`.

- [ ] **Step 7: Look at it**

Rebuild, serve, and confirm on all four pages at 1280 and 375: the mark renders about 26px tall and 193px wide, is not stretched, and inverts correctly in dark mode. The SVG carries its own `prefers-color-scheme` block, which is what makes a single external file self-invert inside an `<img>`.

Also confirm `--ds-header-h` is now **57px** below 720px, where it was 59px at the end of Task 2: the CTA left the bar in Task 3, so the tallest child is the 40px toggle. It stays 59px at desktop.

- [ ] **Step 8: Commit**

```bash
git add www/web/index.html www/web/privacy/index.html www/web/terms/index.html www/web/404.html www/web/styles.css www/test/assets.spec.ts
git commit -m "feat: put the real wordmark in the header on all four pages

GRE-222's mark was used for favicons, og:image and the Twitter card but the
header still rendered live text. No local height: .ds-nav__brand img is
(0,1,1) and the kit wins, so a site rule would lose silently."
```

---

### Task 5: Adopt the promoted section component

**Files:**
- Modify: `www/web/index.html` (9 `.site-section` and 9 `.site-section__title` occurrences)
- Modify: `www/web/styles.css` (delete the two `.site-section` rules)
- Modify: `www/test/sections.spec.ts` (append one describe block)

**Interfaces:**
- Consumes: `.ds-section` from Task 1's `ui.css`, and `allPages()` from Task 2.
- Produces: no new interface.

The nine sections are `#gmail-api`, `#inbox`, `#grid-gmail`, `#accounts`, `#compose`, `#privacy`, `#macos`, `#pricing`, `#faq`. Only `index.html` has any.

**What visibly changes.** `.site-section` sets padding only; `.ds-section` adds `.ds-section + .ds-section { border-top }`. The page gains hairlines between consecutive sections where it had none. That is the adoption, not a regression.

**The `.site-facts` collision does not occur, and here is why rather than an assurance.** `.site-facts` carries `border-block` and sits between `#hero` (a `.ds-hero`, not a section) and `#gmail-api`. The kit's rule is adjacent-sibling: `#gmail-api` draws a `border-top` only if its **previous sibling** is a `.ds-section`, and `.site-facts` is not one. So the strip keeps its own single line on each side and nothing doubles. Verify by measurement in Step 5 rather than trusting the paragraph.

- [ ] **Step 1: Write the failing test**

Append to `www/test/sections.spec.ts`:

```ts
describe("section component", () => {
  it("uses the kit's section on every content block", () => {
    const html = home();
    // Counted separately, and deliberately NOT with one \bds-section\b pass. An underscore
    // is a word character and a hyphen is not, so \b after "section" does not match inside
    // "ds-section__title": a single pass silently counts the nine sections and none of the
    // nine titles, then passes against whatever total someone wrote down. claims.spec.ts
    // documents the same trap for ds-card vs ds-card__title.
    const sections = [...html.matchAll(/class="ds-section"/g)].length;
    const titles = [...html.matchAll(/ds-section__title/g)].length;
    expect(sections, `expected 9 .ds-section blocks, found ${sections}`).toBe(9);
    expect(titles, `expected 9 .ds-section__title headings, found ${titles}`).toBe(9);
  });

  it("leaves no local section class behind", () => {
    const bad = allPages().filter((p) => p.html.includes("site-section")).map((p) => p.name);
    expect(bad, `pages still using .site-section: ${bad.join(", ")}`).toEqual([]);
  });

  it("declares no local section rule that would shadow the kit", () => {
    const css = readFileSync(fileURLToPath(new URL("../public/styles.css", import.meta.url)), "utf8");
    expect(css, "styles.css still declares .site-section").not.toContain(".site-section");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --dir www test`
Expected: FAIL with `expected 9 .ds-section blocks, found 0`.

- [ ] **Step 3: Rename the classes**

Verify the counts before and after rather than trusting the editor. Note the final `grep -c` exits non-zero when it finds nothing, which is the success case here, hence the `|| true`:

```bash
grep -c 'class="site-section"' www/web/index.html          # expect 9
grep -c 'ds-h2 site-section__title' www/web/index.html     # expect 9
sed -i '' 's/class="site-section"/class="ds-section"/g; s/site-section__title/ds-section__title/g' www/web/index.html
grep -c 'class="ds-section"' www/web/index.html            # expect 9
grep -c 'ds-h2 ds-section__title' www/web/index.html       # expect 9
grep -c 'site-section' www/web/index.html || true          # expect 0
```

`sed -i ''` is BSD syntax and correct on this platform.

- [ ] **Step 4: Delete the local rules**

In `www/web/styles.css`, delete these two lines (match on text):

```css
.site-section { padding: var(--ds-space-8) 0; }
.site-section__title { margin-bottom: var(--ds-space-5); }
```

Both are the kit's now. The kit uses `padding-block` rather than `padding: X 0`; the shorthand's implicit `0` for `padding-inline` was harmless here only because every section nests a `.ds-container`.

- [ ] **Step 5: Run tests and check the facts strip for a doubled rule**

Run: `pnpm --dir www test`
Expected: PASS, **110 tests**.

Then rebuild, serve, and in the browser at 1280px:

```js
const facts = document.querySelector('.site-facts');
const next = facts.nextElementSibling;
({
  factsBorderBottom: getComputedStyle(facts).borderBottomWidth,   // expect "1px"
  nextBorderTop: getComputedStyle(next).borderTopWidth,           // expect "0px"
  factsIsSection: facts.classList.contains('ds-section'),         // expect false
});
```

If `nextBorderTop` is `1px` there **is** a doubled rule; resolve it by dropping whichever of the two is redundant, never by adding a third rule to hide it.

- [ ] **Step 6: Commit**

```bash
git add www/web/index.html www/web/styles.css www/test/sections.spec.ts
git commit -m "refactor: adopt the promoted .ds-section component

Nine sections and nine titles renamed; the local padding rules delete. The
page gains the kit's adjacent-sibling dividers. .site-facts keeps its own
border-block and does not double, because it is not itself a .ds-section so
the adjacent-sibling rule never fires across it."
```

---

### Task 6: Adopt the grouped footer shell on all four pages

**Files:**
- Modify: `www/web/index.html:355-364`
- Modify: `www/web/privacy/index.html:88-95`
- Modify: `www/web/terms/index.html:63-70`
- Modify: `www/web/404.html` (insert; the page currently has no footer)
- Modify: `www/web/styles.css` (delete the old footer link rule, add the identity-block span)
- Modify: `www/test/sections.spec.ts` (append one describe block)

**Interfaces:**
- Consumes: `.ds-footer__cols` from Task 1's `ui.css`, and `allPages()` from Task 2.
- Produces: the two-group footer that makes the v0.7.0 promotion honest. PATTERNS.md's row updates in Task 7.

Two groups, which is everything the site has:
- **Product**: Features, Pricing, Questions
- **Company**: Privacy, Terms, Contact

**The group count needs no media query; the identity block does.** The kit's track list is `repeat(auto-fit, minmax(9rem, 1fr))`, which serves two groups without one, so do not add a `grid-template-columns` override. But the identity block is a separate problem the kit's own comment anticipates ("consumers who want a wider block can add `grid-column: span` or a custom `grid-template-columns`). The Farnsworth wordmark is 7.4111:1, so at `--ds-brand-foot-h: 32px` it wants **237.2px**. With three grid children at 375px, auto-fit produces two 147.5px tracks, and `reset.css`'s `img { max-width: 100% }` scales the mark down to about **19.9px, smaller than the nav's 26px**. Step 4 fixes that.

**Cross-page hrefs must be absolute-with-fragment (`/#pricing`), not bare (`#pricing`).** The same footer ships on all four pages, where a bare fragment points at nothing.

**Do not add a height to the footer img.** `.ds-footer__id img` is the mirror of the nav trap: the mark **grows** to `--ds-brand-foot-h`. Neither errors.

- [ ] **Step 1: Write the failing test**

Append to `www/test/sections.spec.ts`:

```ts
describe("grouped footer", () => {
  it("adopts the kit shell on every page", () => {
    const missing = allPages().filter((p) => !p.html.includes("ds-footer__cols")).map((p) => p.name);
    expect(missing, `pages with no kit footer shell: ${missing.join(", ")}`).toEqual([]);
  });

  it("carries both groups on every page", () => {
    for (const p of allPages()) {
      expect(p.html, `${p.name}: no Product group`).toContain('id="foot-product"');
      expect(p.html, `${p.name}: no Company group`).toContain('id="foot-company"');
    }
  });

  it("labels each group for assistive tech", () => {
    // .ds-footer__label is a styled h2; without aria-labelledby the lists are anonymous
    // stacks of links to a screen reader.
    for (const p of allPages()) {
      expect(p.html, `${p.name}: Product list is unlabelled`).toContain('aria-labelledby="foot-product"');
      expect(p.html, `${p.name}: Company list is unlabelled`).toContain('aria-labelledby="foot-company"');
    }
  });

  it("uses cross-page anchors, which work from every page", () => {
    // A bare "#pricing" in a footer that ships on four pages resolves on exactly one.
    for (const p of allPages()) {
      const start = p.html.indexOf("ds-footer__cols");
      expect(start, `${p.name}: no footer to check`).toBeGreaterThan(-1);
      const bare = [...p.html.slice(start).matchAll(/href="(#[^"]+)"/g)].map((m) => m[1]);
      expect(bare, `${p.name}: footer uses bare fragments: ${bare.join(", ")}`).toEqual([]);
    }
  });

  it("renders the footer wordmark", () => {
    for (const p of allPages()) {
      const id = p.html.match(/<div class="ds-footer__id">([\s\S]*?)<\/div>/);
      expect(id, `${p.name}: no .ds-footer__id block`).not.toBeNull();
      expect(id![1], `${p.name}: footer identity block has no wordmark`).toContain("wordmark.svg");
    }
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --dir www test`
Expected: FAIL with `pages with no kit footer shell: 404.html, index.html, privacy/index.html, terms/index.html`.

- [ ] **Step 3: Replace the home page footer**

In `www/web/index.html`, replace lines 355-364 with:

```html
<footer class="ds-footer">
  <div class="ds-container">
    <div class="ds-footer__cols">
      <div class="ds-footer__id">
        <img src="/identity/farnsworth/wordmark.svg" alt="Farnsworth">
        <p>A native Mac email client for Gmail, built on the Gmail API. $12 a year.</p>
      </div>
      <div>
        <h2 class="ds-footer__label" id="foot-product">Product</h2>
        <ul class="ds-footer__list" aria-labelledby="foot-product">
          <li><a class="ds-footer__link" href="/#inbox">Features</a></li>
          <li><a class="ds-footer__link" href="/#pricing">Pricing</a></li>
          <li><a class="ds-footer__link" href="/#faq">Questions</a></li>
        </ul>
      </div>
      <div>
        <h2 class="ds-footer__label" id="foot-company">Company</h2>
        <ul class="ds-footer__list" aria-labelledby="foot-company">
          <li><a class="ds-footer__link" href="/privacy">Privacy</a></li>
          <li><a class="ds-footer__link" href="/terms">Terms</a></li>
          <li><a class="ds-footer__link" href="mailto:hello@greenwichsteps.com">Contact</a></li>
        </ul>
      </div>
    </div>
    <div class="ds-footer__base">
      <span>Farnsworth is made by Greenwich Steps LLC.</span>
      <span>Copyright 2026.</span>
    </div>
  </div>
</footer>
```

The lede repeats `Gmail API` and `$12`, both already-required Shipping claims that appear elsewhere on the home page, so it adds no new claim. It contains none of the six forbidden phrases and no em-dash. There is no Home link because the brand anchor in the header is the route home on every page.

- [ ] **Step 4: Put the same footer on the other three pages**

Use the **identical block** in `www/web/privacy/index.html` (replacing lines 88-95), `www/web/terms/index.html` (replacing lines 63-70), and `www/web/404.html` (inserting between `</main>` and `<script src="/boot.js"></script>`). The old per-page "Home / Privacy" and "Home / Terms" strips are superseded.

- [ ] **Step 5: Fix the identity block's width and delete the retired rule**

In `www/web/styles.css`, delete this rule (match on text):

```css
.ds-footer .ds-link + .ds-link { margin-left: var(--ds-space-4); }
```

It spaced the old inline `.ds-link` row. The new footer uses `.ds-footer__link` inside `.ds-footer__list`, a flex column with its own gap, so it now matches nothing.

Then append:

```css
/* The wordmark is 7.4111:1, so at --ds-brand-foot-h (32px) it wants 237.2px, wider than the
   kit's 9rem minimum track. Left alone, auto-fit hands the identity block a 147.5px track at
   375px and reset.css's `img { max-width: 100% }` scales the mark down to about 19.9px,
   smaller than the nav's 26px. Spanning the full row below the kit's own 720px breakpoint
   gives it the whole container instead.
   Residual, stated rather than hidden: between 720px and about 824px the identity block sits
   in a three-track row narrower than 237.2px, so the mark renders between 27.4px (at 721px,
   where the track is 203.0px) and 32px (at 823.5px, where the track first reaches 237.2px).
   Worst case is a 4.6px shortfall in one band and is not worth a second breakpoint. */
@media (max-width: 720px) {
  .ds-footer__id { grid-column: 1 / -1; }
}
```

- [ ] **Step 6: Run both suites**

Run: `pnpm --dir www test`
Expected: PASS, **115 tests**.

Run: `pnpm --dir www test:layout`
Expected: PASS, no overflow on any of the four pages at any of the four widths.

- [ ] **Step 7: Look at it**

Rebuild, serve, and confirm on all four pages:
- the two group columns sit side by side at 375px and stack only below about 368px, which is
  where auto-fit drops to a single 9rem track;
- the footer mark renders at **32px at 375px and at 1280px** (the Step 5 rule is what makes the 375px case true; without it the mark is about 19.9px there);
- the Company links work from `/privacy`, `/terms` and `/404.html`;
- the `/#pricing` link from `/privacy` lands on the home page with the heading clear of the sticky bar.

- [ ] **Step 8: Commit**

```bash
git add www/web/index.html www/web/privacy/index.html www/web/terms/index.html www/web/404.html www/web/styles.css www/test/sections.spec.ts
git commit -m "feat: adopt the kit's grouped footer on all four pages

Two groups, Product and Company, which is everything the site has. The
auto-fit track list serves two groups with no media query, but the identity
block needs one: the wordmark wants 237px at --ds-brand-foot-h and auto-fit
hands it a 147.5px track at 375px, which reset.css scales down to 19.9px.

Cross-page anchors are absolute, because this footer now ships on four pages
where a bare fragment resolves to nothing."
```

---

### Task 7: Update the records the code cannot infer

**Files:**
- Modify: `www/web/build.mjs:38` (comment)
- Modify: `CLAUDE.md` (three places, listed below)
- Modify: `/Users/leewang/dev/design-system/PATTERNS.md` (footer row). **Separate repo, separate worktree, separate commit**

**Interfaces:**
- Consumes: everything above.
- Produces: nothing code depends on.

- [ ] **Step 1: Correct the build script's version comment**

In `www/web/build.mjs` line 38, change `design-system's export map (as of v0.6.1) covers` to `(as of v0.7.1)`. Re-read the rest of that comment and confirm its claims about `themes/*` and `identity/*` still hold at v0.7.1; correct them if not, rather than leaving a comment that was true one tag ago.

- [ ] **Step 2: Update CLAUDE.md**

The baseline count `91` appears in **three** load-bearing places, not one. Update all of them to the final number:
- the Fresh clone block's `# 91 pass, needs no setup`;
- the marketing-page paragraph's `91 tests, all asserting against built output`;
- the Roadmap read's `pnpm --dir www test` green (91).

In the Fresh clone section, after the existing `pnpm install && pnpm --dir www test` line, add:

```
pnpm --dir www exec playwright install chromium   # optional, only for test:layout
pnpm --dir www test:layout                        # browser layout check, not in `pnpm test`
```

and a sentence: `www/test/layout.mjs` is the only check in this repo that needs a browser, which is why it is a separate script and why `playwright` is deliberately absent from `pnpm-workspace.yaml`'s `allowBuilds` list. The default suite stays setup-free. It is also the only thing that can see horizontal overflow; every other spec is `readFileSync` plus string matching and proves markup shape, not layout.

In the marketing-page paragraph, change `Design system pinned to the **v0.6.1 tag**` to `**v0.7.1 tag**`, and note that pin parity is now asserted by `www/test/pin.spec.ts` rather than only by a comment.

- [ ] **Step 3: Update PATTERNS.md in the design-system repo**

Absolute path, because `../design-system` does not resolve from this worktree: `/Users/leewang/dev/design-system/PATTERNS.md`.

The footer row's Project(s) cell currently reads `burnside-www (farnsworth-www adopting)`. Change it to `burnside-www, farnsworth-www`. This is what makes the v0.7.0 promotion honest: two real consumers, which is the promotion rule's own threshold. The `section` and `nav-toggle` rows already list both consumers and need no edit.

That repo has no worktree yet (`/Users/leewang/dev/design-system/.claude/worktrees/` is empty). Create one before committing, per the guardrail, and commit there rather than from this worktree.

- [ ] **Step 4: File the issue this work found but did not fix.** DONE, filed as **GRE-252**

**Turnstile widget overflows a 320px viewport.** The widget is a fixed 300px and ends at x=324 inside `.ds-container`'s 24px gutters. Present on the live site today and still present after this work. Turnstile's flexible size still has a 300px minimum, so the fix is a container or transform decision. The issue must reference the `page.route` block in `www/test/layout.mjs`, which has to be deleted when this is fixed so the widget comes back under the sweep.

- [ ] **Step 5: Run everything one last time**

```bash
pnpm --dir www test        # expect 115
pnpm --dir www test:layout # expect clean across 4 pages x 4 widths
pnpm --dir www typecheck
```

- [ ] **Step 6: Commit**

```bash
git add www/web/build.mjs CLAUDE.md
git commit -m "docs: record the v0.7.1 adoption and the layout check

Corrects the build script's version comment, updates all three test counts,
and documents test:layout as the one check that needs a browser and why it
is deliberately not in the default suite."
```

---

## Verification before this merges

- `pnpm --dir www test` green at 115.
- `pnpm --dir www test:layout` green: four pages, four widths.
- All four pages **built and looked at**, at 1280 and 375. The sticky bar confirmed by scrolling, not inferred from the CSS being present.
- The collapsed menu **opened** at 375 and 320, with the CTA in it, the panel flush under the bar, and no overflow while open.
- Anchor jumps confirmed to clear the bar, including a cross-page one (`/privacy` to `/#pricing`).
- Headings confirmed to render in real Canela 400 rather than synthetic bold, on all four pages.
- Footer mark confirmed at 32px at 375px and 1280px.
- `www/CLAIMS.md` assertions green in both directions.
- Dark mode checked on all four pages: the wordmark self-inverts, and the accent ramp flips to `#8285F2` with `--ds-on-accent` at `#121317`.
- **Known and accepted:** farnsworthsteps.com still overflows a 320px viewport by 4px, from the Turnstile widget, filed in Task 7 Step 4. This is a deliberate deferral, not an oversight, and it is the reason the spec's literal document-`scrollWidth` assertion was replaced by a per-element sweep that excludes the vendor widget.
