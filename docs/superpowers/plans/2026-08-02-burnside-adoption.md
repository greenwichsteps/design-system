# Burnside adoption of design-system v0.7.1

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move burnsidesteps from design-system v0.5.1 to v0.7.1, adopting the sticky header, the promoted section and footer components, and fixing three content defects on the pricing pages.

**Architecture:** All work is in `greenwichsteps/burnsidesteps`, in `www/`. The header and footer are `<!--#include-->` partials with five including pages. The kit is a git dependency pinned by tag, so adoption is a pin bump plus markup and CSS changes. Local CSS that the kit now owns is deleted rather than left redundant, which is what makes the promotion real.

**Tech Stack:** Static HTML with a small include preprocessor, plain CSS, vitest, pnpm, Cloudflare Workers.

## Global Constraints

- Spec: `design-system/docs/superpowers/specs/2026-08-02-site-adoption-design.md`, **Part 2 only**. Part 3 is Farnsworth and is a separate plan; do not touch that repo.
- Repo: `/Users/leewang/dev/burnsidesteps`. Package manager is **pnpm**. Suite: `pnpm --dir www test`, which runs `pnpm build && vitest run`.
- **No em-dashes** in any committed file, comment, or commit message.
- **ANOTHER SESSION IS ACTIVE IN THIS REPO.** At the time of writing the checkout sat on branch `gre-249-dev-vars-guard`, not `main`. Take a worktree before committing, use explicit paths in `git add`, never `git add -A` or `.`, and never `git stash`: the stash stack is shared across worktrees. A concurrent session already committed onto another session's branch once in this repo, on 2026-08-01.
- The kit tag `v0.7.1` is pushed and resolvable on `origin`. Burnside currently pins `#v0.5.1` in **one** place, root `package.json:10`. There is no `www/package.json` pin.
- **Do not deploy.** This plan ends at a green suite and a visual check. Deployment is the founder's call.

### What the kit now provides, so nothing is duplicated

Deleting local CSS is the point of this work, not a side effect. The kit at v0.7.1 owns:

- `.ds-header` sticky chrome, `.ds-nav` at `padding-block: var(--ds-space-2)`, `.ds-nav__brand img` sized by `--ds-brand-nav-h`, `.ds-nav__links` at `--ds-text-sm`
- `[data-ds-nav-toggle]` hidden by default, revealed below 720px, with `flex-shrink: 0` and centring
- `.ds-section` with `padding-block: var(--ds-space-8)`, `.ds-section__title`, and an adjacent-sibling `border-top` divider
- `.ds-footer__cols` (auto-fit grid), `__id`, `__label`, `__list`, `__link`, `__base`
- `--ds-brand-nav-h: 26px` and `--ds-brand-foot-h: 81px` for the burnside theme

### Two silent traps, both documented in the kit's README

Neither errors. Both are why local height rules get **deleted** rather than kept.

1. `.ds-nav__brand img` is specificity (0,1,1); Burnside's `.site-lockup__word { height: 2rem }` is (0,1,0). The kit wins. Keeping the local rule does not preserve 32px, it just loses silently.
2. `.ds-footer__id img` is (0,1,1) against `.site-foot__word { height: 2rem }` at (0,1,0). Same outcome, opposite direction: the footer mark grows 32px to 81px. That is correct. The footer draws `wordmark.svg`, the stacked master, and 81px is the height calibrated for it.

---

### Task 1: Bump the pin and establish a baseline

**Files:**
- Modify: `package.json:10`

**Interfaces:**
- Consumes: kit tag `v0.7.1` from origin.
- Produces: `node_modules/@greenwichsteps/design-system` at v0.7.1, and a recorded pre-change test count every later task compares against.

- [ ] **Step 1: Record the baseline before changing anything**

```bash
cd /Users/leewang/dev/burnsidesteps
pnpm --dir www test 2>&1 | tail -20
```

Write down the exact "Test Files" and "Tests" numbers. Every later task reports against this. Do not proceed if the baseline is not green: a red baseline makes every later failure ambiguous, and that is the founder's call, not yours. Report it and stop.

- [ ] **Step 2: Bump the pin**

In `package.json`, change the dependency line from `#v0.5.1` to `#v0.7.1`:

```json
    "@greenwichsteps/design-system": "git+https://github.com/greenwichsteps/design-system.git#v0.7.1"
```

Burnside has exactly one pin. Confirm with `grep -rn "design-system.git#" --include=package.json . | grep -v node_modules` that no second one appeared.

- [ ] **Step 3: Install and confirm the kit actually changed**

```bash
pnpm install
grep -c "data-ds-nav-toggle" node_modules/@greenwichsteps/design-system/dist/ui.css
grep -c "ds-footer__cols" node_modules/@greenwichsteps/design-system/dist/ui.css
grep -c "position: sticky" node_modules/@greenwichsteps/design-system/dist/ui.css
```

Expect `2`, `1`, `1` or greater. A zero means the install resolved an old cached tag; clear it and retry rather than proceeding.

- [ ] **Step 4: Run the suite and expect failures**

```bash
pnpm --dir www test 2>&1 | tail -30
```

**Failures here are expected and are the point of this step.** The kit's new rules now apply to markup written for v0.5.1. Record exactly which tests fail and why. Do not fix anything yet: later tasks own those fixes, and knowing the true starting set is what tells the reviewer whether each task fixed what it claimed.

If the suite is unexpectedly green, say so. That would mean the kit is not actually being consumed and Step 3's greps lied.

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: pin design-system v0.7.1

Crosses v0.5.1 to v0.7.1. The v0.5.1 to v0.6.1 half is inert here: that
diff is entirely Farnsworth assets, themes/farnsworth.css, build scripts
and tests, with nothing under identity/burnside or the shared components.

The suite is expected to fail after this commit until the markup catches
up. Later commits in this branch fix it."
```

---

### Task 2: Restructure the header

`position: sticky` is bounded by the parent's content box. Today the nav sits inside a `.ds-container` that wraps only the nav, so the sticky travel is zero and no CSS alone would make it stick. The container must move inside a full-bleed `.ds-header`.

**Files:**
- Modify: `www/web/partials/nav.html`
- Modify: `www/web/index.html:29-31`, `www/web/404.html:19-21`, `www/web/docs/index.html:19-21`, `www/web/pricing/index.html:29-31`, `www/web/pricing/self-hosted/index.html:29-31`
- Modify: `www/web/styles.css` (delete the toggle rules and the lockup height)
- Modify: `www/test/sections.spec.ts` if its nav assertions break

**Interfaces:**
- Consumes: `.ds-header`, `.ds-nav`, `.ds-btn--sm`, `--ds-brand-nav-h` from the kit.
- Produces: a sticky header on all five pages.

- [ ] **Step 1: Rewrite the nav partial**

Replace the entire contents of `www/web/partials/nav.html`:

```html
<header class="ds-header">
  <div class="ds-container">
    <div class="ds-nav site-nav">
      <a class="ds-nav__brand site-lockup" href="/" aria-label="Burnside Steps home">
        <img src="/identity/burnside/wordmark-short.svg" alt="Burnside Steps">
      </a>
      <div class="ds-nav__links site-nav__links" data-ds-nav="main">
        <a class="ds-link site-nav__link" href="/pricing">Pricing</a>
        <a class="ds-link site-nav__link" href="/docs">Docs</a>
        <a class="ds-link site-nav__link" href="https://github.com/greenwichsteps/burnside-steps">GitHub</a>
      </div>
      <button class="ds-iconbtn" data-ds-nav-toggle="main" aria-label="Menu">&#8801;</button>
      <a class="ds-btn ds-btn--sm ds-btn--secondary" href="https://app.burnsidesteps.com">Start hosted</a>
    </div>
  </div>
</header>
```

Four changes beyond the nesting. The mark becomes `wordmark-short.svg`, which is what keeps the bar at one line rather than two. `class="site-lockup__word"` is **dropped from the img**, because its `height: 2rem` would lose to the kit's `.ds-nav__brand img` anyway and keeping it only hides the real source of the height. The CTA gains `ds-btn--sm`. The outer element is now a `div` carrying `ds-nav site-nav`, not a `header`.

- [ ] **Step 2: Unwrap all five include sites**

Each of the five pages currently reads:

```html
<div class="ds-container">
  <!--#include nav-->
</div>
```

Replace with the bare include, since the partial now supplies its own container:

```html
<!--#include nav-->
```

The five files and their line numbers are in this task's Files list. **Missing one leaves that page's bar misaligned by 24px against its own sections**, which is subtle enough to survive a glance, so verify with:

```bash
grep -rn -B1 -A1 "include nav" www/web/index.html www/web/404.html www/web/docs/index.html www/web/pricing/index.html www/web/pricing/self-hosted/index.html
```

Every one must show the include with no `ds-container` wrapper around it.

- [ ] **Step 3: Delete the local rules the kit now owns**

In `www/web/styles.css`, delete these three, with their comments:

- Lines 13-15, the toggle comment and its two rules:
  ```css
  /* The kit reveals .ds-nav__links above 720px, so the toggle is only for narrow screens. */
  [data-ds-nav-toggle] { display: none; }
  @media (max-width: 720px) { [data-ds-nav-toggle] { display: inline-flex; } }
  ```
- The `[data-ds-nav-toggle] { flex-shrink: 0; }` rule near line 195, with its comment. The kit now carries `flex-shrink: 0` in the same declaration as the visibility.
- `.site-lockup__word { display: block; height: 2rem; width: auto; }` near line 186. The kit's `.ds-nav__brand img` supplies `display: block`, `width: auto` and the token-driven height.

Keep `.site-lockup` itself if it carries anything the kit does not, and keep every `.site-nav__link` rule: the kit's `.ds-link` still underlines, and those overrides are still doing work.

- [ ] **Step 4: Run the suite and fix what this task broke**

```bash
pnpm --dir www test 2>&1 | tail -30
```

`www/test/sections.spec.ts:57` asserts `toContain("ds-nav")` and `:1103` asserts `toContain('data-ds-nav="main"')`. Both strings survive the restructure, so those should pass. `www/test/build.spec.ts:19-23` carries a comment about `toContain('class="ds-nav site-nav"')`; that exact string also survives, since the inner div keeps both classes in that order.

If any nav assertion fails, **read it before changing it**. An assertion that fails because the markup genuinely changed shape should be updated to assert the new shape. An assertion that fails because you broke something should be fixed in the markup. Say which you concluded in your report.

- [ ] **Step 5: Confirm the header actually sticks**

The suite cannot check this; no test in either repo can. Build and look:

```bash
pnpm --dir www build
```

Then open `www/public/index.html` in a browser, scroll, and confirm the bar stays at the top and gains its hairline. Also confirm the anchor links in the page jump to headings that clear the bar rather than tucking under it. Report what you saw. If you cannot open a browser, say so plainly rather than claiming it works.

- [ ] **Step 6: Commit**

```bash
git add www/web/partials/nav.html www/web/index.html www/web/404.html www/web/docs/index.html www/web/pricing/index.html www/web/pricing/self-hosted/index.html www/web/styles.css
git commit -m "feat: adopt the kit's sticky header

position: sticky is bounded by the parent's content box, and the nav sat
inside a container that wrapped only the nav, so its sticky travel was
zero. The container moves inside a full-bleed .ds-header, which means
all five including pages unwrap their own wrapper.

The nav mark becomes the short wordmark: the stacked one needs 66px to
reach the same glyph size, which would make an 82px bar.

Three local rules go, all now owned by the kit: the toggle's visibility
pair, its flex-shrink, and the lockup height. The height one is not
merely redundant. The kit's .ds-nav__brand img is specificity (0,1,1)
against this rule's (0,1,0), so keeping it would have lost silently
rather than preserved 32px."
```

If `www/test/sections.spec.ts` needed updating, add it to the same commit and say so in the message.

---

### Task 3: Adopt the footer shell

Only structure moves. Burnside's tuned five-track `grid-template-columns` stays local, because track ratios are tuned to a specific set of groups and to the Compare column's anchor text, which makes them content rather than structure.

**Files:**
- Modify: `www/web/partials/footer.html`
- Modify: `www/web/styles.css:457-497` approximately, the `.site-foot*` block
- Modify: `www/test/sections.spec.ts:839,844`

**Interfaces:**
- Consumes: `.ds-footer__cols`, `__id`, `__label`, `__list`, `__link`, `__base`, and `--ds-brand-foot-h` from the kit.
- Produces: the second real consumer of the promoted footer, which is what makes `PATTERNS.md`'s row honest.

- [ ] **Step 1: Rename the classes in the partial**

In `www/web/partials/footer.html`, rename every `site-foot__*` class to its `ds-footer__*` equivalent:

| from | to |
|---|---|
| `site-foot__cols` | `ds-footer__cols` |
| `site-foot__id` | `ds-footer__id` |
| `site-foot__group` | (delete the class; the kit styles the groups' children, not the wrapper) |
| `site-foot__label` | `ds-footer__label` |
| `site-foot__list` | `ds-footer__list` |
| `site-foot__link` | `ds-footer__link` |
| `site-foot__base` | `ds-footer__base` |

Also **remove `class="site-foot__word"` from the `<img>`**, exactly as in the header: `.ds-footer__id img` sizes it from `--ds-brand-foot-h`, and the local (0,1,0) rule would lose anyway.

Keep `class="ds-footer site-foot"` on the `<footer>` itself: `.ds-footer` is the kit's base rule and `.site-foot` still carries Burnside's padding override.

- [ ] **Step 2: Delete the promoted CSS, keep the track list**

In `www/web/styles.css`, in the `.site-foot*` block, delete the rules the kit now owns: `.site-foot__id`, `.site-foot__word`, `.site-foot__id p`, `.site-foot__label`, `.site-foot__list`, `.site-foot__link`, `.site-foot__link:hover`, `.site-foot__base`.

**Keep exactly two things**, rewritten to the new class names:

```css
.site-foot { padding: var(--ds-space-8) 0 var(--ds-space-5); }
/* Five tuned tracks, kept local: the ratios are fitted to this site's five
   specific groups and to the Compare column's anchor text, which makes them
   content rather than structure. The kit ships auto-fit so any group count
   works; this overrides it for the shape this footer actually has. */
.ds-footer__cols { grid-template-columns: 1.3fr 1fr 1fr .8fr 1.2fr; }
```

Preserve the existing long comment above the track list if it explains the ratios; it is the reason the override survives promotion.

- [ ] **Step 3: Update the two tests that assert on the old class names**

`www/test/sections.spec.ts:839` matches `/\.site-foot__cols\s*\{[^}]*\}/` and `:844` matches `/\.site-foot__list\s*\{[^}]*\}/`.

The first should now match `.ds-footer__cols` in the site's own stylesheet, since the track override still lives there. **The second cannot**: `.ds-footer__list` moved into the kit entirely, so there is no local rule left to match. Read what that assertion was checking, then either point it at the kit's stylesheet or delete it as superseded, and say which you chose and why. Do not weaken it to something that passes without checking anything.

- [ ] **Step 4: Run the suite**

```bash
pnpm --dir www test 2>&1 | tail -30
```

Report the count against Task 1's baseline. Any remaining failure should belong to a later task; name it if so.

- [ ] **Step 5: Look at the footer**

```bash
pnpm --dir www build
```

Open the built page. The footer mark should now render at **81px, noticeably larger than before**, drawing the stacked wordmark. That growth is correct: 81px is the height calibrated for the stacked mark so its glyphs match Farnsworth's at 32px. Confirm the five columns still lay out as before and the mark does not overflow its column. Report what you saw.

- [ ] **Step 6: Commit**

```bash
git add www/web/partials/footer.html www/web/styles.css www/test/sections.spec.ts
git commit -m "feat: adopt the kit's footer shell

Structure moves, content stays. Eight local rules delete; the five tuned
tracks stay, because those ratios are fitted to this site's specific
groups and the Compare column's anchor text.

The mark's local height goes too. The kit's .ds-footer__id img is
specificity (0,1,1) against (0,1,0), so it wins either way, and
--ds-brand-foot-h is 81px because that is the height calibrated for the
stacked wordmark this footer draws.

This is the promoted footer's second real consumer, which is what the
kit's PATTERNS.md row was written against."
```

---

### Task 4: Adopt `.ds-section`

Both sites declared byte-identical `.site-section` rules, which is why the kit promoted it. Burnside's markup carries 12 `class="site-section"`, 13 `class="ds-h2 site-section__title"`, and one combined `class="ds-container ds-prose site-section"`.

**Files:**
- Modify: every `www/web/**/*.html` carrying `site-section`
- Modify: `www/web/styles.css:5-11`

**Interfaces:**
- Consumes: `.ds-section`, `.ds-section__title` from the kit.
- Produces: hairline dividers between adjacent sections.

- [ ] **Step 1: Rename in the markup**

Replace `site-section__title` with `ds-section__title` and `site-section` with `ds-section` across `www/web`. **Do the `__title` one first**: `site-section` is a substring of `site-section__title`, so renaming the shorter string first would corrupt the longer one into `ds-section__title` prefixed wrongly.

Verify afterwards:

```bash
grep -rn "site-section" www/web ; echo "exit $? (1 = none left, correct)"
grep -rc "ds-section" www/web --include="*.html" | grep -v ":0"
```

- [ ] **Step 2: Delete the local rules**

In `www/web/styles.css`, delete lines 5-11:

```css
.site-section {
  padding: var(--ds-space-8) 0;
}

.site-section__title {
  margin-bottom: var(--ds-space-5);
}
```

Keep the file's opening comment block above them.

- [ ] **Step 3: Run the suite**

```bash
pnpm --dir www test 2>&1 | tail -30
```

- [ ] **Step 4: Check for doubled rules**

The kit draws `border-top` between adjacent `.ds-section` siblings. Build and look at every page for a section boundary that now shows **two** rules, or a rule immediately under the hero or immediately above the footer where none is wanted. The kit's rule is adjacent-sibling precisely to avoid the latter two, but Burnside has its own bordered elements and they may now sit next to a section border.

Report each boundary you checked. If you find a doubled rule, fix it by removing the redundant one, not by adding a third rule to hide it.

- [ ] **Step 5: Commit**

```bash
git add www/web www/web/styles.css
git commit -m "feat: adopt .ds-section

Both sites declared byte-identical .site-section rules, which is why the
kit promoted it. The local pair deletes and the markup renames, which
also brings the hairline divider between adjacent sections that the
sections previously lacked."
```

Use explicit paths in `git add` rather than `-A`, per the repo's concurrent-session guardrail.

---

### Task 5: Three content fixes

These are the founder's, identified while the kit work was underway. None depends on the kit.

**Files:**
- Modify: `www/web/pricing/index.html:49,56`
- Modify: `www/web/pricing/self-hosted/index.html:49,56`
- Modify: `www/web/styles.css:152,395,408`

**Interfaces:** none. Independent of every other task.

- [ ] **Step 1: Delete the four redundant deployment labels**

`pricing/index.html:49` and `:56` each render `<p class="site-tier__who">We host it</p>`; `pricing/self-hosted/index.html:49` and `:56` each render "You host it". Four labels across two pages.

They restate a stronger signal six lines above them. Each page carries a tab nav where the current mode is marked with `aria-current="page"`:

```html
<nav class="site-pt" aria-label="Deployment">
  <a class="site-pt__tab" href="/pricing" aria-current="page">Cloud <span>we host</span></a>
  <a class="site-pt__tab" href="/pricing/self-hosted">Self-hosted <span>you host</span></a>
</nav>
```

Every card on a page shares that page's mode by definition, so the per-card label repeats the active tab. `aria-current` is also the better signal, because assistive technology announces it where a loose paragraph is just text.

Delete all four paragraphs. Then delete the `.site-tier__who` rule at `www/web/styles.css:395` and its comment, **after** confirming nothing else references the class:

```bash
grep -rn "site-tier__who" www/ | grep -v node_modules
```

- [ ] **Step 2: Centre the pricing title**

`www/web/styles.css:408` is:

```css
#tiers .ds-display { font-size: clamp(2rem, 4vw, 3rem); margin-bottom: var(--ds-space-4); }
```

Add `text-align: center;` to it. Read the surrounding comment first: it explains why the selector is `#tiers .ds-display` rather than a second class, and that reasoning still holds.

- [ ] **Step 3: Let the Questions section fill its container**

`www/web/styles.css:152` is `.site-faq { max-width: 68ch; }`. Delete the declaration so the FAQ fills `.ds-container` like every other section. If `.site-faq` then carries nothing, delete the rule entirely.

Note `.site-faq details p` nearby carries its own `max-width: 62ch`. That one is a **reading measure on paragraph text and should stay**: it is doing a different job from the container-width cap you are removing.

- [ ] **Step 4: Run the suite**

```bash
pnpm --dir www test 2>&1 | tail -30
```

`www/test/copy.spec.ts` and `sections.spec.ts` assert on page copy. If either asserts on "We host it" or "You host it", that assertion is now testing deleted content: read it, and update or remove it deliberately. Say which you did.

- [ ] **Step 5: Commit**

```bash
git add www/web/pricing/index.html www/web/pricing/self-hosted/index.html www/web/styles.css
git commit -m "fix: three pricing and layout defects

The per-card deployment label restated the tab nav six lines above it,
which already marks the current mode with aria-current. Four labels
across two pages, plus the rule. aria-current is the better signal
because assistive technology announces it.

The pricing title centres, and the Questions section loses a 68ch cap
that held it to roughly three quarters of the container. The paragraph
measure inside it stays: that one is a reading width, not a container."
```

---

### Task 6: Whole-site verification

The suite cannot see layout. This task is the part that catches what tests cannot.

**Files:** none modified unless a defect is found.

**Interfaces:** consumes everything above.

- [ ] **Step 1: Clean build**

```bash
cd /Users/leewang/dev/burnsidesteps
rm -rf www/public && pnpm --dir www test 2>&1 | tail -20
```

Report the final count against Task 1's baseline, and account for every difference.

- [ ] **Step 2: Confirm no local rule survives that the kit now owns**

```bash
grep -n "data-ds-nav-toggle\|site-lockup__word\|site-foot__\|site-section\|site-tier__who" www/web/styles.css
```

Every hit must be one you deliberately kept, and you must name why in your report. `.site-foot` itself (the padding override) and `.ds-footer__cols` (the track list) are expected. Anything else is a leftover.

- [ ] **Step 3: Look at every page at two widths**

Open each of the five built pages at desktop width and at **375px**. For each, confirm:

- the header sticks on scroll and gains its hairline
- the nav mark is the short wordmark, on one line, correctly sized
- **at 375px the hamburger appears, the links hide, and the glyph is centred in its square, not packed left.** That centring is the v0.7.1 fix and this is the first place it is visible on a real site.
- section boundaries show one rule, not two, and none sits under the hero or above the footer
- the footer mark is the larger stacked wordmark and its columns hold
- **no horizontal scrollbar at 375px**

For the last one, check it rather than eyeballing it. In the browser console on each page:

```js
document.documentElement.scrollWidth <= window.innerWidth
```

Must be `true` at 375px on all five pages. Report the actual numbers, not just a pass. Burnside already shrinks its nav button below 720px at `www/web/styles.css:177-178`, so it has headroom Farnsworth lacks, but headroom is not a guarantee.

- [ ] **Step 4: Report, and do not deploy**

Write down what you saw at both widths for all five pages. If you could not open a browser, say so plainly rather than implying you looked.

This plan ends here. Deployment is the founder's call.

---

## Self-Review

**Spec coverage.** Part 2's pin bump is Task 1; header restructure, five include sites, short wordmark, `.ds-btn--sm` and the three local-rule deletions are Task 2; footer shell and the track-list retention are Task 3; `.ds-section` is Task 4; the three content fixes are Task 5; the build-and-look requirement and the `scrollWidth` check are Task 6.

**Placeholder scan.** Every step carries its literal content. Three steps deliberately ask the implementer to make a judgment and report it rather than prescribing: which way to resolve a broken nav assertion (Task 2 Step 4), what to do with the superseded `.ds-footer__list` test (Task 3 Step 3), and how to resolve a doubled border (Task 4 Step 4). Each names the wrong answer explicitly so the judgment is bounded rather than open.

**Type consistency.** Class names are consistent across tasks: `ds-footer__cols` is introduced in Task 3 Step 1 and referenced in Task 3 Step 2 and Task 6 Step 2 identically. `ds-section` and `ds-section__title` likewise.

**Three things flagged for the pre-flight reviewer.**

1. Task 4 Step 1's ordering constraint is load-bearing and easy to get wrong: `site-section` is a substring of `site-section__title`, so a naive replace-all in the wrong order corrupts the longer class. The step says so, but it is the kind of instruction an implementer skims.
2. Task 3 Step 3 asks the implementer to decide the fate of an existing assertion. That is the shape of decision that produced weak tests earlier in this project. The step forbids the weakening outcome by name, but a reviewer should check what was actually done.
3. No task adds a `scrollWidth` regression test, only a manual check in Task 6. Neither site has such a guard today. Deciding whether one should exist is arguably Part 3's problem, since that is where the overflow risk actually lives, but a reviewer may reasonably say it belongs here.
