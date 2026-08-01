# Page chrome and type scale (design system v0.7.0)

Date: 2026-08-01
Repo: `greenwichsteps/design-system`
Status: approved, ready for planning

## Why

The header does not stick, sections run together, display headings are synthetically
emboldened, and header chrome is scaled like body content. Every one of those is a kit
defect rather than a site defect, because both consumers declare the same markup and
inherit the same components.

Two of the items began as taste and turned out to be bugs on inspection. They are called
out below so the plan treats them as fixes, not preferences.

## Scope

In: sticky header, heading weight, nav and button scale, section dividers, footer shell
promotion (GRE-235), gallery coverage (GRE-149), Burnside short wordmark.

Out, each to its own spec: GRE-227 accent contrast, GRE-239 share images.

Site adoption is a separate spec. This one ends at a tagged kit release.

## 1. `.ds-header`, new component

### The defect

`position: sticky` is bounded by the parent's content box. Both sites write:

```html
<div class="ds-container"><header class="ds-nav site-nav">…</header></div>
```

That container's content box is exactly the header's height, so sticky travel is zero.
Adding `position: sticky` to today's markup does nothing at all. This is a markup change,
not a property change.

### The structure

```html
<header class="ds-header">
  <div class="ds-container">
    <div class="ds-nav">
      <a class="ds-nav__brand" href="/"><img src="…" alt="Full Brand Name"></a>
      <div class="ds-nav__links" data-ds-nav="main">…</div>
      <button class="ds-iconbtn" data-ds-nav-toggle="main">≡</button>
      <a class="ds-btn ds-btn--sm ds-btn--accent" href="…">…</a>
    </div>
  </div>
</header>
```

Three elements, one job each. `.ds-header` bleeds full width and carries the fill and the
hairline. `.ds-container` constrains. `.ds-nav` lays out the row.

**Do not combine `.ds-container` and `.ds-nav` onto one element.** `.ds-nav` sets
`padding: X 0`, a shorthand whose `0` overwrites `.ds-container`'s `padding-inline`. The
bar's contents then sit 24px left of every section's contents. This was measured at exactly
one `--ds-space-5` on both brands. As defence, `.ds-nav` changes to `padding-block` so the
trap does not fire if a future consumer combines them anyway.

### The fill

Opaque is the base; translucency is progressive enhancement.

```css
.ds-header { position: sticky; top: 0; z-index: 20; background: var(--ds-bg);
  border-bottom: 1px solid transparent; transition: border-color .18s ease; }
@supports (backdrop-filter: blur(1px)) {
  .ds-header { background: color-mix(in srgb, var(--ds-bg) 72%, transparent);
    backdrop-filter: blur(12px) saturate(1.6); -webkit-backdrop-filter: blur(12px) saturate(1.6); }
}
@media (prefers-reduced-transparency: reduce) {
  .ds-header { background: var(--ds-bg); backdrop-filter: none; -webkit-backdrop-filter: none; }
}
.ds-header.is-scrolled { border-bottom-color: var(--ds-border); }
```

No hairline at rest. It arrives once scrolled. That absence at the top of the page is what
produces the effect, more than the blur does.

Note for the record: the reference sites were measured, and **none of them blurs**. Resend's
sticky header is fully transparent with no blur and no border at any scroll position, Exa's
is opaque white with neither, and Vapi has no sticky bar at all. Blur is our choice, taken
because Farnsworth's `.site-shot` image slots scroll under the bar, not because it is the
prevailing pattern.

### The behavior

`initStickyHeader`, exported individually alongside `initNav` per the GRE-128 convention,
with no import-time side effects. It:

1. Observes a 1px sentinel with `IntersectionObserver` and toggles `is-scrolled`. No scroll
   listener, so no per-frame work.
2. Measures the bar and writes `--ds-header-h`, which feeds `scroll-padding-top` so anchor
   jumps clear the bar rather than tucking under it.

Scroll-driven CSS animations would remove the JS but remain behind a flag in Firefox.

### Mobile dropdown

`.ds-nav__links.is-open` is currently `inset: 56px 0 auto`. The 56px was the old bar height,
and with no positioned ancestor it resolved against the initial containing block. `.ds-header`
is now positioned, so it becomes the containing block, and 56px is wrong for a 48px bar.
Becomes `inset: 100% 0 auto`, which tracks the bar at any height.

## 2. Heading weight

### The defect

`fonts.css` ships Canela at **300, 400 and 500 only**. Neither `type.css` nor `reset.css`
states a `font-weight` for headings, so `<h1>` and `<h2>` take the UA default of 700 and the
browser synthesises it. Synthetic bold dilates the outline uniformly, thickening Canela's
hairlines at the same rate as its stems, which flattens the thick/thin contrast that is the
entire reason to use the face.

### The fix

`.ds-display`, `.ds-h1`, `.ds-h2` get `font-weight: 400`.

### The guard

A test parses `fonts.css` for declared `@font-face` weights per family, parses `components/*.css`
for rules that pair a `--ds-font-*` family with a `font-weight`, and fails on any requested
weight with no matching face. This would have caught the bug and also protects
`--ds-font-compressed`, which ships at 700 only.

## 3. Nav and button scale

| | today | v0.7.0 |
|---|---|---|
| `.ds-nav` padding | `padding: space-4 0` | `padding-block: space-2` |
| `.ds-nav__brand` | `height: 24px` | **height removed** |
| `.ds-nav__links` | inherited 16px | `--ds-text-sm` |
| nav CTA | `.ds-btn` | `.ds-btn--sm` |
| `.ds-btn` padding | `space-3 space-5` | `space-3 space-4` |

`.ds-btn` keeps 16px type and 42px height, because hero CTAs are primary actions and should
not shrink to chrome size. Only the horizontal moves. Measured reference points: Resend 14px
nav type and a 40px button, Exa 15px and 33px, Vapi 15px and 32px, all against a 16px body.
The kit was alone in running header chrome at body size.

**`.ds-nav__brand`'s fixed height must go, not change.** A fixed anchor height lets a taller
mark overflow silently instead of growing the bar. Height belongs on the asset, from a token.

**Ordering hazard to record:** `.ds-btn--sm` shares specificity with `.ds-btn` and wins only
by source order. `button.css` is correct today; a consumer restating `.ds-btn` later re-opens
the bug. Worth a comment in the file.

## 4. `.ds-section`

Both sites already declare `.site-section { padding: var(--ds-space-8) 0 }` and
`.site-section__title { margin-bottom: var(--ds-space-5) }` identically, so PATTERNS.md's
≥2-project rule has genuinely fired. The kit takes both, plus:

```css
.ds-section + .ds-section { border-top: 1px solid var(--ds-border); }
```

Adjacent-sibling rather than a border on every section, so the first section carries no rule
under the hero and the last carries none above the footer.

## 5. `.ds-footer` shell

### Correction to GRE-235

The issue states the grouped footer has two consumers, burnside-www and burnside-hosted.
It does not. `hosted/web/styles.css` contains **zero** occurrences of "footer"; the only
hosted matches anywhere were the kit's own base `.ds-footer` rule inside the built `ui.css`
and the string `"footer"` in an HTML-tag-name array inside the minified widget bundle. The
grouped footer has exactly one consumer. GRE-235's stated blocker is, however, resolved:
design-system is on `main` and v0.5.1, v0.6.0 and v0.6.1 are all ancestors of it.

The promotion proceeds because Farnsworth adopts the shell in the site spec, which makes the
rule fire honestly rather than speculatively.

### What moves

`__cols`, `__id`, `__label`, `__list`, `__link`, `__base`. The grid becomes
`repeat(auto-fit, minmax(9rem, 1fr))` so it serves any group count and stacks without a
media query.

Burnside's `grid-template-columns: 1.3fr 1fr 1fr .8fr 1.2fr` **stays local**. Those five
tracks are tuned to its five specific groups and to the Compare column's anchor text, which
is content, not structure.

## 6. Brand height and the Burnside short wordmark

### Why a shared height cannot work

| | viewBox | aspect | lines |
|---|---|---|---|
| Farnsworth | 5462 × 737 | 7.41 | 1 |
| Burnside full | 4251 × 1870 | 2.27 | 2, stacked |

At a shared 32px, Farnsworth gets a 32px line of type and Burnside gets two lines of 16px.
Same box, half the type. Height must be a per-brand token, set in the theme file beside
`--ds-logo`.

### Why the short mark, and not the alternatives

Measured, all at a matched 26px glyph line:

| option | mark | bar | 375px |
|---|---|---|---|
| stacked, matched | 150 × 66 | **82px** | fits |
| inline "Burnside Steps." | 253 × 33 | 49px | **overflows by 83px** |
| **short "Burnside."** | **150 × 26** | **48px** | **fits, 0 overflow** |

The short mark is 4264 × 737, and 737 is identical to Farnsworth's, because both are GT
America Bold cap-to-ascender with no descender. The two brands therefore match exactly at
the same rendered height with no conversion factor, and the mark is narrower than
Farnsworth's own.

### Asset work

A `--short` mode in `burnsidesteps/scripts/outline-wordmark.mjs`: one `run("Burnside")`, the
existing `DOT_GAP` before the period, same `-0.025em` tracking, same fontkit path. Emits
`wordmark-short.svg` plus pinned `-light` and `-dark` variants, committed into design-system
under `identity/burnside/`. The licensed `GT-America-Standard-Bold.otf` is present at
`assets/fonts/GT-America/` and is gitignored, as it must remain.

This is a prerequisite for the Burnside header and gets its own Linear issue.

### Identity rule amendment

`PATTERNS.md` says two masters per brand, icon and wordmark, never a third. This adds a short
wordmark. The rule is rewritten to permit it under an explicit condition: **a short form is a
rendering of the same wordmark for constrained horizontal slots, and never changes the
accessible name.** Every Burnside variant keeps `aria-label="Burnside Steps"` and `alt="Burnside
Steps"` regardless of what is drawn.

### Tokens

Two tokens per brand, declared in the theme file beside `--ds-logo`:

| brand | `--ds-brand-nav-h` | `--ds-brand-foot-h` |
|---|---|---|
| Farnsworth | 26px | 32px |
| Burnside | 26px | 81px |

Applied by the kit to the asset, never to the anchor:

```css
.ds-nav__brand img    { height: var(--ds-brand-nav-h, 26px); width: auto; display: block; }
.ds-footer__id img    { height: var(--ds-brand-foot-h, 32px); width: auto; display: block; }
```

Which mark goes in which slot is a markup choice per consumer, not a token: the header points
at `wordmark-short.svg` and the footer at `wordmark.svg`. No `<picture>` or breakpoint swap is
needed, because the short mark fits a 375px bar with the CTA still visible, measured at zero
overflow. Farnsworth ships no short variant and uses `wordmark.svg` in both slots.

## 7. Gallery and ledger

Gallery sections for hero (GRE-149), header, section and footer. PATTERNS.md rows for section
and footer marked promoted, and the identity rule amended per above.

## 8. Tests

On top of the existing 84:

- the font-weight guard from section 2
- `.ds-header` declares `position: sticky` and `top: 0`
- the blur lives inside `@supports`, not the base rule
- a `prefers-reduced-transparency` branch exists
- `.ds-nav__links.is-open` contains no hardcoded pixel offset
- `.ds-nav` uses `padding-block`, not the `padding` shorthand
- `.ds-nav__brand` declares no `height`
- the scale values in section 3
- `.ds-section + .ds-section` border rule
- footer shell classes present
- `initStickyHeader` exported, no side effects on import
- both Burnside wordmark variants carry the full brand name in `aria-label`

## Risks

**Breaking markup change.** Both consumers must restructure their header. At 0.x a minor bump
is the signal, so v0.7.0.

**Burnside crosses two versions.** It pins v0.5.1 in one place, root `package.json`. The
v0.5.1→v0.6.1 diff was checked and is entirely Farnsworth assets, `themes/farnsworth.css`,
build scripts and tests. Nothing under `identity/burnside` or the shared components changed,
so the gap is inert. Verification is still build, test and eyeball at desktop and 375px
before deploying.

**Farnsworth pins in two places**, root and `www/package.json`. Bumping one leaves the site
silently on old assets.

**Farnsworth has an existing `border-block` on `.site-facts`.** The new section borders may
double up. Checked during site adoption.
