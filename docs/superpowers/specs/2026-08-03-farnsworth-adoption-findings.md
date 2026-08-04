# Findings: Farnsworth site adoption of design-system v0.7.1

Part 3 of the three-part sequence. Written 2026-08-04, after the branch passed its final
whole-branch review. Plan: `docs/superpowers/plans/2026-08-03-farnsworth-adoption.md`.
Spec: `docs/superpowers/specs/2026-08-02-site-adoption-design.md`, Part 3.

This file exists because the Part 2 handoff recorded that its ledger died with its worktree.
What follows is what the git history alone will not tell you.

## Shipped

Twelve commits plus two review waves, `6e177c7..b8243be` on `worktree-farnsworth-v071-adoption`.
117 tests became 119, all green; `pnpm --dir www test:layout` green across four pages and six
widths; `typecheck` clean. All four built pages now carry the kit's sticky header, the real
wordmark SVG, and the grouped footer; the nine content sections use `.ds-section`; the nav CTA
moves into the collapsed menu below 720px.

## The things worth not rediscovering

**1. `object-fit` defaults to `fill` on an `<img>`, and that overrides an embedded SVG's own
`preserveAspectRatio`.** This is the single most expensive thing in this work and it was got
wrong twice before it was got right. The kit sets an explicit `height` on `.ds-footer__id img`
and `.ds-nav__brand img`. When a width constraint then binds, for instance `reset.css`'s
`img { max-width: 100% }` inside a narrow grid track, the height does **not** follow and the
mark is **horizontally distorted, not scaled down**. Measured: the footer mark held 32.00px
height at every viewport from 375 to 1280 while its width moved between 203.00 and 237.14.

Two consequences. First, any assertion of the form "the mark is at least N pixels tall" is a
structural no-op against this kit and can never fail. An implementer correctly refused to
implement one when instructed to. Second, both the plan and its pre-flight reviewers reasoned
from a proportional-scaling model, derived "the mark renders about 19.9px" and dismissed the
residual band as a 4.6px shortfall. The real defect was a **14% horizontal squish at 721px and
8% at 768px**, on a wordmark that carries a hand-kern precisely because letterform spacing was
worth the effort. Assert **width, or the width-to-height ratio**. Never height.

**2. `auto-fit` sizes the identity block's track to the link groups, so a wide one-line wordmark
gets clamped.** `.ds-footer__cols` is `repeat(auto-fit, minmax(9rem, 1fr))`. With three children
at 375px that yields two 147.5px tracks, and the Farnsworth mark wants 237.16px. The fix is the
one the kit's own `footer.css` comment sanctions: `grid-column: 1 / -1` on `.ds-footer__id`, up
to the width where a three-track row first gives it 237.16px. Derivation, worth keeping because
it generalises: track is `(C - 2 * gap) / 3` where `C` is the container width, so
`C >= 3 * 237.156 + 64 = 775.5`, and with `.ds-container`'s 24px padding each side that is a
**823.5px viewport**. Hence `max-width: 823px`. Burnside never hit this: its mark is 184px wide.

**3. Choosing the sentinel width for a layout check is not "pick a big number".** The obvious
choice, 1280, is useless here: `.ds-container` caps at 1120px, so 1280 measures the same layout
as 1120, where the track sits 27px clear of the threshold. A gap bump that visibly squished the
mark from 824 to 855 left a `[375, 721, 768, 1280]` check fully green at exit 0. The correct
sentinel is **824**, the first width above the span cut, because the track is monotonically
increasing above it and therefore narrowest there. Drift shows up first and worst at the
narrowest sampled point. 1024 is kept as a second sample only because monotonicity holds for a
three-item row and a fourth footer group would break it discontinuously.

**4. The site had two independent pre-existing horizontal overflows at 320px**, neither caused by
this work and neither previously known, because no check in this family of repos could see
layout at all. The nav CTA's right edge sat at 344.4 in a 320 viewport (24px), fixed here as a
side effect of the CTA relocation. Turnstile's widget is a fixed 300px ending at x=324 (4px);
that one is **still live**, filed as **GRE-252**, and deliberately out of scope because
Turnstile's flexible size still has a 300px minimum, making it a container or scale decision.

**5. v0.7.1 carries two visible changes the spec never mentioned.** Every heading gets lighter:
v0.6.1 declares no `font-weight` on `.ds-display`, `.ds-h1`, `.ds-h2` or `.ds-quote`, so `<h1>`
and `<h2>` inherit the UA's bold and, since Canela ships only 300/400/500, render as **synthetic
bold**. v0.7.1 adds `font-weight: 400`. Separately, `.ds-btn` horizontal padding moves from
`--ds-space-5` to `--ds-space-4`, making every button **16px narrower**. That second one
invalidated a measurement taken under v0.6.1 and reused for v0.7.1 arithmetic.

**6. `404.html` is a built page that `htmlFiles()` walks.** All three pre-flight reviewers found
this independently and it was the one Critical: seven "on every page" assertions could never have
gone green, because 404 had no header, no brand and no footer. It was given the full chrome
rather than being scoped out of the assertions, which also means a visitor landing there now has
navigation for the first time. `html-files.ts` states the convention in its own comment.

## Process observations

**The pre-flight review is where the value is.** Three reviewers against the plan found one
Critical and six Important defects before a line was written, including the 404 hole and a
measurement reused across a version boundary where the underlying token had changed.

**The recurring defect had one shape: a correct fix with nothing guarding it.** Three separate
findings across Tasks 3, 6 and the final wave were all under-asserting tests written into the
plan by its author. Task 3's would have let the mobile waitlist CTA vanish entirely with 104
tests and the browser harness green. Task 6's would have let the footer mark shrink back. The
final wave's guard was added, looked right, and was empirically useless. Implementers transcribe
plans faithfully, so a weak assertion in a plan ships as a weak assertion.

**Implementers pushed back correctly four times**, and were right each time: refusing the
height-floor guard as a structural no-op; rejecting a false claim that every other spec is
`readFileSync` plus string matching, which `waitlist.spec.ts` disproves; correcting a count from
seven of eight to six; and rejecting an instruction to sample 1024, having swept the mutation's
broken band and found it to be 824 to 855. Instructions to subagents are worth writing as
falsifiable claims for exactly this reason.

**A false causal claim reached CLAUDE.md and had to be retracted.** The plan asserted that
`playwright` being absent from `pnpm-workspace.yaml`'s `allowBuilds` is what stops a fresh clone
downloading browsers. Both halves were individually true and the causation was invented:
`playwright@1.62.1` declares no install script, so `allowBuilds` gates nothing here. Verified by
a real `rm -rf node_modules && pnpm install`. The boot layer earns stricter scrutiny than
anything else in the repo, because it is what a fresh instance reads first and trusts.
