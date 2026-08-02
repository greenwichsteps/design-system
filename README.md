# @greenwichsteps/design-system

A shared, themeable, CSS-first design system for the Greenwich Steps family of products: install with `pnpm install`, build the published CSS/JS output with `pnpm build`, run the test suite with `pnpm test`, and consume it in another project as a git dependency pinned to a tag (e.g. `"@greenwichsteps/design-system": "github:greenwichsteps/design-system#v0.1.0"`), which resolves via its `prepare` script so `dist/` is built automatically on install.

## v0.7.1: the nav toggle is now the kit's job, and it fixes a live bug

`[data-ds-nav-toggle]` is hidden by default and revealed below 720px, the
same breakpoint that hides `.ds-nav__links`: a nav shows its links or its
toggle, never both. It also carries `flex-shrink: 0`, because it is the only
shrinkable child in the `.ds-nav` flex row and would otherwise fall under the
24px tap-target minimum at narrow widths.

This is a fix, not just deduplication. `[data-ds-nav-toggle]` and
`.ds-iconbtn` share the same specificity, (0,1,0), and `button.css` sorts
before `layout.css`, so the toggle rule's `display` was winning and turning
`.ds-iconbtn`'s `inline-grid` box into a flex one. `place-items: center` does
nothing on a flex container, so the icon fell to the top-left corner of its
40px square instead of sitting centred. The promoted rule now carries
`align-items: center; justify-content: center` to restore that centring.
Both consuming sites ship the misalignment today, because the rule each
declared locally was byte-identical and never had the centring pair either.

If you declare this rule locally, delete it rather than leave it in place.
It is not just harmless duplication: your local copy is the uncentred
version, and depending on load order it can keep masking the kit's fix even
after you upgrade.

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

**That new height rule can silently outrank your own.** `components/layout.css`
adds `.ds-nav__brand img { height: var(--ds-brand-nav-h, 26px) }`, specificity
(0,1,1). If your own image rule is equal or lower specificity, the kit now wins
where before there was no competing rule at all, and your mark quietly resizes
with no error anywhere: Burnside's live markup is
`<a class="ds-nav__brand site-lockup"><img class="site-lockup__word">` with
`.site-lockup__word { height: 2rem }` at (0,1,0), one point below the kit's
rule. On upgrade its nav mark drops from 32px to 26px, about 20% smaller,
while still drawing the two-line stacked wordmark, with nothing in Burnside's
own CSS pointing at the cause. Check every `<img>` inside `.ds-nav__brand`
against this before upgrading, and raise your own selector's specificity if it
needs to win.

**The footer has the same trap pointing the other way, and it is larger.**
`components/footer.css` adds `.ds-footer__id img { height: var(--ds-brand-foot-h, 32px) }`,
also (0,1,1), and `--ds-brand-foot-h` is 81px for Burnside because the footer
slot is sized for the two-line stacked mark. Burnside's live footer rule sits
at (0,1,0) and draws its mark at 2rem, so on upgrade that mark does not shrink
by a fifth like the nav's, it jumps from 32px to 81px, roughly two and a half
times, and it will be whatever asset the markup currently points at rather
than the stacked one that height was calibrated for. Decide which mark belongs
in your footer before you upgrade, not after.

Four more things worth knowing before you upgrade:

- `position: sticky` silently no-ops under `overflow: hidden`,
  `overflow-x: hidden` or `overflow: clip` on any ancestor of `.ds-header`.
  Neither Burnside nor Farnsworth has this today, so this is preventive, but
  it is the most common way a sticky header stops sticking with no error
  anywhere.
- Every `<h1>`, `<h2>` and `.ds-display` moves from a synthetic 700 to real
  Canela at 400. This is the most visually obvious change in the release:
  headings get lighter, not just repositioned.
- The scale tightened: `.ds-nav` padding-block halved from `--ds-space-4` to
  `--ds-space-2`, `.ds-nav__links` font-size dropped to `--ds-text-sm`, and
  `.ds-btn` horizontal padding moved from `--ds-space-5` to `--ds-space-4`.
- Two new promoted class families ship: `.ds-section` (vertical rhythm for
  stacked marketing sections) and the `.ds-footer__*` shell (grouped link
  footer with an identity block and a baseline row). Both consuming sites
  carry local equivalents of these (`.site-section`, `.site-foot`) that
  should be retired in favor of the kit versions once each site adopts them.
