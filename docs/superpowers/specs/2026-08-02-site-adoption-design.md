# Site adoption of design-system v0.7.1

Date: 2026-08-02
Repos: `greenwichsteps/design-system`, `greenwichsteps/burnsidesteps`, `greenwichsteps/farnsworthsteps`
Status: approved, ready for planning
Predecessor: `2026-08-01-page-chrome-design.md` (v0.7.0, shipped and tagged)

## Why

v0.7.0 is tagged and consumable but nothing consumes it. It is breaking for both sites: the header
markup restructures, and two of its new rules outrank the sites' own. Neither site sticks its header
today, both duplicate CSS the kit now owns, and Burnside carries three content defects the founder
identified while the kit work was underway.

One promotion was left on the table by v0.7.0 and is picked up here first, because both sites would
otherwise adopt while still carrying it.

## Sequencing

**Kit v0.7.1, then Burnside, then Farnsworth.** Burnside leads the site work because it crosses two
minors rather than one and carries both documented specificity traps, so the riskier path runs while
the reasoning is fresh.

## How this gets built, decided 2026-08-02

Two process changes, both a direct response to how the v0.7.0 run actually went.

**One plan per part, not one plan for the spec.** Each part ends in something shippable on its own:
v0.7.1 is a release, Burnside adoption is deployable, Farnsworth adoption is deployable. The founder
reviews between them and can stop after any one. A single twelve-task plan is the size of the run that
produced v0.7.0, which took a full day.

**Every plan gets a pre-flight review before its first task is dispatched.** The v0.7.0 run produced
twelve Important findings across ten tasks, and **all twelve were defects in the plan**, not in any
implementation: three broken tests, one CSS rule that overflowed a 375px viewport, and six absent
guards. The implementers transcribed faithfully, which is what they were asked to do, so the plan was
the only place a defect could survive.

Every one of those was visible by reading. The `@supports` assertion that could not match the CSS it
checked, the guard that only covered three hardcoded selectors, the `grid-column: span 2` under an
auto-fit track list, the assertion satisfied by the substring inside `ds-section__title`: none needed
execution to find. Each instead cost a fix dispatch, a scoped re-review, and in two cases a question to
the founder.

So: a reviewer reads the plan document itself, against this spec, before Task 1 is dispatched. It
looks for assertions that cannot fail, code that contradicts the spec, and guards the spec asks for
that the plan does not deliver. Findings are fixed in the plan, not discovered task by task.

## Part 1: kit v0.7.1, promote the nav toggle

Both sites declare byte-identical rules (`burnsidesteps/www/web/styles.css:14-15`,
`farnsworthsteps/www/web/styles.css:8-10`), comment included. The kit ships none, so the 40px
`.ds-iconbtn` is visible at every width. This spec originally claimed that the kit's own bar measured
**57px** rather than the 48px v0.7.0 designed for, and that the rule "takes the desktop bar to 48px."
Both numbers were wrong; see the correction below.

**Correction of record, whole-branch review, 2026-08-02: the height claim above, and the "Precisely
what this fixes" framing it was written under, are both wrong.** The reviewer measured it. Against the
gallery's verbatim markup, `.ds-header` is **48px before v0.7.1 and 40px after**. Neither the 57px nor
the 48px in the original claim matches either state.

Worse, on **both real consuming sites the desktop bar height does not change at all**, for two
independent reasons: each site already hides the toggle at desktop with its own local rule, so the
toggle was never contributing to the desktop bar's height in the first place; and each nav also carries
a `.ds-btn` CTA at least as tall as the 40px toggle, so even where the toggle is visible it was never
the tallest child in the row. A `.ds-header` built to v0.7.0's own example markup measured 59px before
this change and 59px after: a zero delta.

The real justification for v0.7.1 is not a bar-height change. It is **the centring fix and the
deduplication**, both of which are correct and are what the README and PATTERNS.md already say. The
height framing was a mistake in the reasoning that produced this spec, not in the shipped CSS, the
tests, or the README.

Part 2's wordmark sizing below already reasons toward a 48px bar target inherited from this section.
Any plan, there or elsewhere, that reasons toward a specific bar height must measure that height
directly rather than inherit a number from this section.

It also fixes the kit's own gallery, which is currently demonstrating an impossible state.
`gallery/sections/layout-overlay.html:13` places a toggle inside a `.ds-nav`, and above 720px the
gallery renders that button **alongside** the visible `.ds-nav__links`. A nav shows one or the other,
never both. The promotion corrects the demo rather than degrading it, and the section gains a line
saying the toggle appears below 720px, matching how the chrome section already explains its
`position: static` override.

Added to `components/layout.css`:

```css
[data-ds-nav-toggle] { display: none; flex-shrink: 0; align-items: center; justify-content: center; }
@media (max-width: 720px) { [data-ds-nav-toggle] { display: inline-flex; } }
```

**The centring is not decoration, and it fixes a live bug in both sites.** Found by this plan's
pre-flight review, which loaded the compiled `dist/ui.css` into jsdom and read `getComputedStyle`
rather than reasoning about it.

`[data-ds-nav-toggle]` and `.ds-iconbtn` have equal specificity (0,1,0), and `components/button.css`
sorts before `components/layout.css` in the alphabetical concatenation, so the toggle rule's `display`
wins. `.ds-iconbtn` is `display: inline-grid` with `place-items: center`, and `justify-items` has no
effect on a flex container, so once the toggle rule turns it into a flex box the glyph falls to
flex-start instead of centring in its 40px square.

Both sites already have this. Each loads `styles.css` after `ui.css` and declares the same
`display: inline-flex` override against the same `<button class="ds-iconbtn" data-ds-nav-toggle>`, so
**both currently render a left-aligned hamburger below 720px.** Promoting the rule verbatim would have
carried the defect into the kit. The two centring declarations are inert while the element is
`display: none` and take effect the moment it is revealed, so they belong in the base rule rather than
the media query.

`flex-shrink: 0` is lifted from `burnsidesteps/www/web/styles.css:195`, which exists because the
toggle was the only shrinkable nav child and collapsed to roughly 22px at narrow widths, under the
24px tap-target minimum. That is a fact about the kit's flex row, not about Burnside.

Additive and non-breaking, so a **patch** bump to `0.7.1`. A consumer without a toggle is unaffected;
a consumer with one and no local rule gets a fix. PATTERNS.md gains a row. `dist/` rebuilt and
committed, tag `v0.7.1` pushed.

## Part 2: Burnside adoption, v0.5.1 to v0.7.1

The version gap was checked during v0.7.0: the entire v0.5.1 to v0.6.1 diff is Farnsworth assets,
`themes/farnsworth.css`, build scripts and tests. Nothing under `identity/burnside` or the shared
components changed, so the gap is inert.

Pin: **one place**, root `package.json:10`.

### Header

`www/web/partials/nav.html` is the single edit point, consolidated there by GRE-240. Five pages
include it (`index.html`, `404.html`, `docs/index.html`, `pricing/index.html`,
`pricing/self-hosted/index.html`), each currently wrapping the include in `<div class="ds-container">`.

The container moves **into** the partial, so every include site unwraps to a bare `<!--#include nav-->`:

```html
<header class="ds-header">
  <div class="ds-container">
    <div class="ds-nav site-nav">
      <a class="ds-nav__brand site-lockup" href="/" aria-label="Burnside Steps home">
        <img src="/identity/burnside/wordmark-short.svg" alt="Burnside Steps">
      </a>
      …
      <a class="ds-btn ds-btn--sm ds-btn--secondary" href="…">Start hosted</a>
    </div>
  </div>
</header>
```

Three deletions matter more than the additions:

- **`.site-lockup__word { height: 2rem }` is deleted, not kept.** The kit's `.ds-nav__brand img` is
  specificity (0,1,1) against this rule's (0,1,0), so keeping it means losing a fight silently.
  Deleting it lets `--ds-brand-nav-h` size the mark, which is the point of the token.
- The local `[data-ds-nav-toggle]` rules at `styles.css:14-15` and `:195`, now owned by the kit.
- The mark swaps from `wordmark.svg` to `wordmark-short.svg`. This is what keeps the bar at 48px
  rather than 82px, and it fits 375px with the CTA still visible.

### Footer

`www/web/partials/footer.html` moves from `.site-foot__*` to `.ds-footer__*`. Nine of the ten local
rules (`styles.css:457-497`) delete. **Only `grid-template-columns: 1.3fr 1fr 1fr .8fr 1.2fr` stays**,
because those five tracks are tuned to Burnside's five specific groups and to the Compare column's
anchor text, which makes them content rather than structure.

`.site-foot__word { height: 2rem }` also goes. The footer draws `wordmark.svg`, the **stacked** master
(`viewBox 0 0 4251 1870`), and `--ds-brand-foot-h: 81px` is the height calibrated for exactly that
mark. So the mark growing from 32px to 81px is it reaching its intended size, not a wrong asset being
stretched. **Correction of record:** v0.7.0's final review inferred the footer drew the short mark and
the README note was written on that basis. It does not. The note should be softened during this work.

### Sections

`.site-section` and `.site-section__title` become `.ds-section` / `.ds-section__title`; the local rules
at `styles.css:5-11` delete. Sections gain the kit's adjacent-sibling divider.

### Three content fixes

1. **Duplicated "We host it": delete all four, and the rule.** `pricing/index.html:49` and `:56` both
   render `<p class="site-tier__who">We host it</p>`, and `pricing/self-hosted/index.html:49` and `:56`
   both render "You host it". Four labels across two pages.

   They are redundant against a stronger signal that already exists six lines above them. Each page
   carries a tab nav (`pricing/index.html:42-45`) where the current deployment mode is marked with
   `aria-current="page"`:

   ```html
   <nav class="site-pt" aria-label="Deployment">
     <a class="site-pt__tab" href="/pricing" aria-current="page">Cloud <span>we host</span></a>
     <a class="site-pt__tab" href="/pricing/self-hosted">Self-hosted <span>you host</span></a>
   </nav>
   ```

   Every card on a page shares that page's mode by definition, so the per-card label restates the
   active tab. `aria-current` is also the better signal: assistive technology announces it, where a
   loose paragraph is just text.

   The CSS comment justifying `.site-tier__who` says it exists "so the self-hosted grouping is legible
   on the cards and not only in the comparison table's spanning header". That rationale predates the
   tab nav, which now does that job page-wide. Delete the four paragraphs and the `.site-tier__who`
   rule, after confirming nothing else references it.
2. **Pricing title alignment.** `#tiers .ds-display` (`styles.css:408`) is left-aligned and reads odd
   against the page. Centre it.
3. **Questions width.** `.site-faq { max-width: 68ch }` (`styles.css:152`) narrows the FAQ to roughly
   three quarters of the container. Remove the cap so it fills the container like every other section.

## Part 3: Farnsworth adoption, v0.6.1 to v0.7.1

Pin: **two places**, `package.json:10` and `www/package.json:11`. Bumping one leaves the site silently
on old assets, which is the specific failure this line exists to prevent.

### Header

Inline in `www/web/index.html:24-36`, and on `/privacy` and `/terms`. Restructures the same way, and
swaps `<span class="site-wordmark">Farnsworth</span>` for the wordmark SVG. GRE-222 shipped that
wordmark and the site uses it for favicons, `og:image` and the Twitter card but never in the header.
`.site-wordmark`'s font rules retire with the span.

### Sections and footer

Nine `.site-section` instances become `.ds-section`; local rules at `styles.css:5-6` delete.

**`.site-facts` carries `border-block: 1px solid var(--ds-border)` (`styles.css:67`)** and sits between
sections that now draw their own adjacent-sibling `border-top`. Check for a doubled rule and resolve by
dropping whichever is redundant, not by adding a third rule to hide it.

The footer adopts the shell with **two groups**:

- **Product**: Features, Pricing, Questions
- **Company**: Privacy, Terms, Contact

That is everything the site has. The auto-fit grid serves two groups without a media query, which is
why the kit's track list is not fixed. Adopting this is also what makes the v0.7.0 footer promotion
honest: PATTERNS.md currently records `burnside-www (farnsworth-www adopting)`, and that row updates to
two real consumers when this lands.

### Risks

**The reclaimed toggle width has to go somewhere.** Part 1's promoted rule gives Farnsworth's toggle a
`flex-shrink: 0` it never declared locally. That is a genuine fix on its own: without it, Farnsworth's
toggle is the only shrinkable nav child below 720px and collapses to **21.8px**, under the 24px
tap-target minimum; with the promoted rule it holds a correct 40px.

But the 18.2px the toggle stops absorbing does not disappear. Below 720px, Farnsworth's only other
shrinkable nav child is `<a class="ds-btn ds-btn--accent">Join the waitlist</a>`, which is
`white-space: nowrap`, so it cannot wrap to give the width back and the nav gets wider instead. Measured
document `scrollWidth` in the reviewer's fixture went from **417px to 436px** across this change.

Burnside is not exposed to this: it already carried its own `flex-shrink: 0` on the toggle before
v0.7.1, which is the rule this promotion was lifted from.

**Correction of record, Part 2's whole-branch review, 2026-08-02.** An earlier version of this
paragraph also said Burnside "additionally shrinks its nav button's padding and font-size below 720px,
so it has somewhere for the reclaimed space to go." **That second half is no longer true and must not
be inherited.** The rule it referred to declared exactly `padding: var(--ds-space-2) var(--ds-space-4);
font-size: var(--ds-text-sm);` inside a 720px media query, which is byte-identical to the kit's
`.ds-btn--sm`. Part 2 put `ds-btn--sm` on that element at every width, making the local rule a no-op,
and Part 2's fix wave deleted it after confirming the two were identical.

So Burnside's protection is the `flex-shrink: 0` alone, not a second mechanism. Part 2 measured no
overflow at 375px on all five pages after the change, so the conclusion holds for Burnside on the
evidence. But **Part 3 must not reason from the deleted rule**, and must not assume Farnsworth is
merely a weaker version of a Burnside situation that was itself half-imagined.

**State the uncertainty honestly.** The reviewer could not load the sites' real web fonts, so its
absolute widths are inflated, and it explicitly declined to claim the live site overflows today. The
+18.2px delta itself is font-independent and certain; whether it crosses into visible horizontal
scroll on the real site is not established.

**Requirement for this part's plan.** Measure the Farnsworth nav at 320px and 375px against the real
fonts under v0.7.1, and add an assertion that document `scrollWidth` does not exceed the viewport width
at both. Neither site has a horizontal-overflow guard today; this is the first one.

## Verification

- Both suites green. Farnsworth is 91 tests, Burnside 724 across www, relay and hosted.
- **`farnsworthsteps/www/CLAIMS.md` assertions must stay green.** They enforce the pre-launch honesty
  posture in both directions and caught nine invented features during the original build.
- Both sites **built and looked at**, desktop and 375px, before either deploys. The sticky bar
  confirmed actually sticking by scrolling, not inferred from the CSS being present.
- Anchor jumps confirmed to clear the bar, which is what `--ds-header-h` and `scroll-padding-top` exist
  for and what no unit test in either repo can reach.

## Risks

**Two silent traps, both documented in the kit's README.** The nav mark shrinks if the local height
rule is kept rather than deleted; the footer mark grows to its calibrated size. Neither errors.

**Five include sites in Burnside must all unwrap.** Missing one leaves that page's bar misaligned by
24px relative to its own sections, which is subtle enough to survive a glance.

**Farnsworth's two pins.** Stated twice deliberately.

**Concurrent sessions.** Both site repos have had other sessions active during this work. Per the
guardrail added 2026-08-01, take a worktree before committing in either.
