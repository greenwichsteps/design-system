# Handoff: site adoption of design-system v0.7.1

Written 2026-08-02. Read this before picking up Part 3.

## The work in one line

A three-part sequence moving both marketing sites onto a design-system release that adds a sticky
header, promoted section and footer components, and a corrected type scale. **Parts 1 and 2 are done.
Part 3 is specced but unplanned.**

## State of each repo, verified at handoff

| Repo | Branch | HEAD | Unpushed | Dirty | Tags |
|---|---|---|---|---|---|
| `design-system` | main | `96e398b` | **3 commits** | clean | v0.7.0, v0.7.1 (both pushed) |
| `burnsidesteps` | main | `0ad67f3` | **8 commits** | clean | none |
| `farnsworthsteps` | main | `6e177c7` | **2 commits** | 3 files | none |

**Nothing from Part 2 is pushed.** Burnside's 8 unpushed commits are the adoption merge plus its
branch. design-system's 3 are the Part 2 spec corrections. Both were left for the founder to push
deliberately, not forgotten. Farnsworth's 3 dirty files predate this work and belong to another
session.

## Part 1: kit v0.7.1. DONE, merged, tagged, pushed

Promoted the nav-toggle visibility rule both sites duplicated. The substance turned out to be a
**centring fix, not deduplication**: `[data-ds-nav-toggle]` and `.ds-iconbtn` share specificity
(0,1,0) and `button.css` sorts before `layout.css`, so the toggle rule's `display` turned an
inline-grid box into a flex one and `place-items` stopped centring. Measured in Chromium: the glyph
sat 6.0px from the left edge before and 15.1/15.1 after. Both sites shipped that defect.

Tag `v0.7.1` resolves on origin and is what the sites pin.

## Part 2: Burnside adoption. DONE, merged locally, NOT pushed

Seven commits, `fe09687..fa046de`, merged as `0ad67f3`. Suite 156 to 158. Full monorepo suite green
at handoff: www 158, relay 393+2, hosted 177, widget 149, admin 40.

Delivered: sticky header on all five pages with the short wordmark, kit footer shell with Burnside's
tuned five tracks and both breakpoints kept local, `.ds-section` dividers, and three pricing fixes
(four redundant deployment labels deleted, pricing title centred, FAQ container cap removed).

Verified in a browser on all five pages at 375px: no horizontal overflow; the hairline appears on
scroll and reverts; cross-page anchors clear the bar (`/index.html#compare` lands the section at
57.2px against a 57px bar); the footer collapses to two columns.

## Part 3: Farnsworth adoption. SPECCED, NOT PLANNED

Spec: `docs/superpowers/specs/2026-08-02-site-adoption-design.md`, Part 3.
Process the founder chose: **one plan per part, and every plan gets a pre-flight review before its
first task is dispatched.** Both are recorded in that spec's "How this gets built" section.

### Four things Part 3 inherits, all discovered rather than predicted

**1. Farnsworth pins in TWO places.** Root `package.json` and `www/package.json`. Burnside had one.
Bumping only one leaves the site silently on old assets.

**2. The overflow risk is real and Farnsworth is the exposed site.** Its toggle currently collapses
to 21.8px, under the 24px tap-target minimum, which v0.7.1 fixes. But the 18.2px the toggle stops
absorbing has to go somewhere, and below 720px Farnsworth's only other flexible nav child is a
`white-space: nowrap` CTA. The spec **requires** Part 3's plan to measure the nav at 320px and 375px
against the real fonts and add a `scrollWidth <= viewport` assertion. Neither site has such a guard.

**3. The reason Burnside seemed safe was half wrong, and the spec is corrected.** An earlier version
argued Burnside had headroom because it "additionally shrinks its nav button below 720px". That rule
was byte-identical to the kit's `.ds-btn--sm`, which Part 2 applied at every width, making it a
no-op that Part 2 then deleted. See design-system `96e398b`. Burnside's protection is the
`flex-shrink` alone. **Do not inherit the deleted-rule argument.**

**4. `.site-facts` must be checked on Farnsworth's own terms.** The doubled-border collision the
spec flags did not occur on Burnside, but only because `.site-facts` there is not a `.ds-section`,
so the adjacent-sibling selector never fired against it. That is a fact about Burnside's markup.

### Two specific traps, both documented in the kit's README

Neither errors. Both are why local height rules get **deleted** rather than kept.

- `.ds-nav__brand img` is (0,1,1) against a typical site rule's (0,1,0). The kit wins, so keeping a
  local height does not preserve it, it just loses silently.
- `.ds-footer__id img` is the same shape pointing the other way: the footer mark grows to
  `--ds-brand-foot-h`.

### Farnsworth specifics already surveyed

- Header is inline in `www/web/index.html` plus `/privacy` and `/terms`, not a partial as Burnside's
  was. The container-unwrap has to happen at each.
- The header renders `<span class="site-wordmark">Farnsworth</span>` as live text. GRE-222 shipped a
  wordmark used for favicons, `og:image` and the Twitter card but never in the header. The spec has
  it adopting the SVG.
- Nine `.site-section` instances.
- Footer adopts the shell with **two groups**: Product (Features, Pricing, Questions) and Company
  (Privacy, Terms, Contact). This is what makes the footer promotion honest; PATTERNS.md currently
  records `burnside-www (farnsworth-www adopting)` and that row updates when it lands.
- `www/CLAIMS.md` assertions must stay green. They enforce the pre-launch honesty posture in both
  directions and caught nine invented features during the original build.

## How to pick up

1. Read the spec's Part 3 and the corrections above.
2. Write plan 3 with `superpowers:writing-plans`, saving to `docs/superpowers/plans/`.
3. **Dispatch a pre-flight review of the plan against the spec before Task 1.** Across the two plans
   that used it, this caught four defects before implementation, two Critical.
4. Execute with `superpowers:subagent-driven-development`, in a worktree.

## Process notes worth carrying

**Take a worktree before committing.** Two other sessions were active in these repos during this
work, and one previously committed onto another session's branch by accident. `.claude/worktrees/`
is gitignored in all four repos. Explicit paths in `git add`, never `-A`. Never `git stash`, the
stack is shared across worktrees.

**Burnside's test suite cannot see a visual regression.** Every test is `readFileSync` plus string
matching; no jsdom, no rendering, no computed style. `pages.spec.ts` says so in its own comment.
A green suite proves markup shape, not layout. Assume Farnsworth's is similar until checked.

**Verify measurements rather than accepting them.** One report in this project presented reasoning
formatted to look like captured terminal output, and a reviewer caught it. The strongest checks were
ones where a claimed number could be re-derived from first principles: `--ds-header-h` at 49px
desktop and 57px mobile follows exactly from `padding-block` 8 + the tallest child + `.ds-header`'s
1px border.

**The plan is where defects hide.** In the v0.7.0 run, twelve of twelve Important findings were
plan defects, not implementation defects, because implementers transcribe faithfully. That is the
entire reason the pre-flight step exists.

## Full records

- SDD ledgers with every finding and ruling: the Part 2 ledger was inside the now-removed worktree,
  so the durable record is this file plus the git history and the specs.
- design-system `docs/superpowers/specs/2026-08-01-page-chrome-design.md` (v0.7.0) and
  `2026-08-02-site-adoption-design.md` (v0.7.1 and both site adoptions).
- design-system `docs/superpowers/plans/2026-08-01-page-chrome.md`,
  `2026-08-02-v071-nav-toggle.md`, `2026-08-02-burnside-adoption.md`.
