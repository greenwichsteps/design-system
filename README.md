# @greenwichsteps/design-system

A shared, themeable, CSS-first design system for the Greenwich Steps family of products: install with `pnpm install`, build the published CSS/JS output with `pnpm build`, run the test suite with `pnpm test`, and consume it in another project as a git dependency pinned to a tag (e.g. `"@greenwichsteps/design-system": "github:greenwichsteps/design-system#v0.1.0"`), which resolves via its `prepare` script so `dist/` is built automatically on install.

## v0.10.0: visible focus, readable links, scrolling tabs

- **Focus is an outline.** `:focus-visible` draws `3px solid var(--ds-focus-color)` with a 2px offset, replacing the 14% accent-tint box-shadow, which measured 1.16:1 to 1.19:1 on every surface and disappeared entirely in forced-colours mode. `--ds-focus-color` is new and defaults to `--ds-accent-solid`. `--ds-focus-ring` is still defined but the kit no longer uses it.
- **Links read at 4.5:1 in both themes.** New `--ds-accent-text`, used by `.ds-link`, defaults to `--ds-accent`. Burnside sets it to `#B81866` on light (its pink measures 2.76:1 on paper) and back to the pink on dark. The brand pink itself is unchanged.
- **Tab bars scroll on narrow screens.** `.ds-tabs__list` scrolls inside itself instead of widening the page, and each tab keeps its size.
- The accent contract (two values per theme where text is involved) is written down in `PATTERNS.md`, and `test/accent-contrast.spec.ts` measures every accent pair for every brand in both themes.

Consumers carrying local overrides for any of these can delete them.

## v0.9.5: long tokens in a code block break

In a `.ds-code` block with a Copy button, the code breaks a long unbroken token (a URL in a snippet) instead of scrolling. A scrolling column is a region axe flags as unreachable by keyboard; v0.9.4 made one wherever such a token met a narrow screen. A `<pre>` still scrolls, since it does not wrap.

## v0.9.4: app shell alignment and the code block's Copy button

- Above 720px `.ds-app__sidebar` has the same top padding as `.ds-app__main` (`--ds-space-6`), so the brand's top meets the page title's. The phone band keeps 16px.
- `.ds-pagehead` aligns to the top, so an action's top meets the title's rather than the lede's bottom.
- A `.ds-code` block with a `.ds-code__copy` button becomes a row: the code takes the remaining width (wrapping, or scrolling inside its own column if it is a `<pre>`) and the button keeps its own column, so it never covers a line of code.

## v0.9.3: sidenav items in the phone row

Under 720px `.ds-sidenav__item` sizes to its content (`width: auto`), so items sit several to a line instead of one per line; the column above 720px is unchanged.

## v0.9.2: contrast and app-set fixes

- Danger and success badges and the invalid field hint now clear 4.5:1 in light and dark, on their own tint over the page, a card and a raised surface. Their text is the tone mixed 60/40 into `--ds-text`, as `.ds-message` already does. Before, dark badges measured 2.6 to 3.2:1 and the dark hint 3.2 to 3.9:1.
- `.ds-sidenav__item` renders the same as an `<a>` or a `<button>`: the rule resets background, border, font, alignment, width, cursor and appearance.
- `.ds-menu--end` opens the list leftward from the menu's right edge, for a menu at the end of a row, so the list stays inside a narrow viewport.
- `.ds-list__main` is `flex: 1 1 0` with a 12rem floor, so a long name shares the row with the trailing action instead of wrapping the action onto its own line, and a crowded row wraps its trailing items to the next line, aligned to the row's end (a row with a main cell packs to the end), rather than squeezing the name. Unbreakable strings break instead of overflowing.
- Token change: the dark `--ds-ink-muted` goes from `#8A8891` to `#8D8B94`, so muted text on `--ds-surface-raised` clears 4.5:1 (4.37 to 4.54:1). It affects every use of `--ds-text-muted` under `[data-theme="dark"]`: `.ds-lede`, `.ds-note`, `.ds-help`, `.ds-hero__lede`, table headers, tabs, footer text and links, `.ds-stat__label`, `.ds-empty` and `.ds-sidenav__item`. Muted text on the dark page and surface becomes slightly lighter (5.31 to 5.53:1 and 4.81 to 5.01:1). Light is unchanged.

## v0.9.1: nested stacks keep their own gap

A plain `.ds-stack` nested inside `.ds-stack--loose` (or `--tight`) used to inherit the outer gap, because the margin read a custom property and custom properties inherit, so its children sat 32px (or 8px) apart instead of 16px. The margin rules are now keyed on the parent's class (`.ds-stack > * + *`, `.ds-stack--tight > * + *`, `.ds-stack--loose > * + *`) and read no variable, so a stack's gap comes only from its own class and the gap above a nested stack comes from its parent. `--ds-stack-gap` is still set on each stack for consumers that read it, but no rule uses it for margins. 
Migration: a plain stack inside a loose one tightens its children from 32px to 16px; a plain stack inside a tight one loosens its children from 8px to 16px. The gap above a nested stack is unchanged, because it comes from the parent. Setting `--ds-stack-gap` yourself no longer changes any gap; it is published for reading only. A modifier now spaces its children even without `.ds-stack` (before, it set only the variable), so always pair `ds-stack` with a modifier.

## v0.9.0: app set

Patterns for application screens such as a dashboard, all in `components/app.css`.
Nothing outside `.ds-app` changes: every rule is scoped to `.ds-app` or carries its
own `ds-*` class, so marketing pages are untouched.

| Class | What it is for |
| --- | --- |
| `.ds-stack` (`--tight`, `--loose`) | Vertical rhythm between direct children. Sets no display, so it composes with any container. |
| `.ds-app` | The app shell: a sidebar column and a main column. Below 720px it becomes one column with the sidebar above the page. |
| `.ds-app__sidebar`, `.ds-app__main` | The two columns. The main may shrink below its content width. |
| `.ds-sidenav`, `.ds-sidenav__item` | Side navigation. Mark the current page with `aria-current="page"`. |
| `.ds-pagehead`, `__title`, `__actions` | Page header: title and lede left, actions right, wrapping when narrow. The title is the sans face. |
| `.ds-app__sidebar-foot` | The bottom of the sidebar (a plan box, the account). Above 720px the sidebar is pinned to the viewport and the foot sits at its bottom; below 720px it follows the nav. |
| `.ds-list`, `.ds-list__row`, `.ds-list__main` | Rows in one bordered surface, divided by a hairline. Wrap a row's text in `.ds-list__main` and it takes the spare width, so a trailing action (a menu button) sits at the end with no margins. |
| `.ds-settings`, `__section`, `__aside`, `__body` | Settings sections: title and help beside the fields, stacking on a narrow screen with no media query. |
| `.ds-message` (`--danger`, `--success`) | An inline notice in a block. Three tones: neutral (no modifier), danger and success. Not a badge, so never a pill. |
| `.ds-app-scope` | Opts a screen outside the grid shell into the app radii, e.g. a sign-in card. |

Inside `.ds-app` the radii are re-scoped: `--ds-radius-md` is 8px and
`--ds-radius-lg` is 12px, so every component there inherits tighter corners with no
extra class. Outside `.ds-app` the tokens are unchanged, unless an ancestor carries
`.ds-app-scope`: put it on a sign-in card or any screen outside the grid shell to opt
in to the same radii.

`.ds-list` sets `list-style: none`, so a numbered steps list written as `<ol class="ds-list">`
shows no numbers: write the numbers in the markup.

`.ds-shell` is unchanged and is not the app shell. Use `.ds-app` for application
screens.

`.ds-lede` keeps its own small top margin, so a lede placed directly in a
`.ds-stack` sits closer to the heading above it than other stack children do. This
is deliberate: a lede belongs to its heading.

The release only adds, so upgrading changes no existing page.

## v0.8.0: text roles, `.ds-lede` and `.ds-note`

Two new classes, so every kind of supporting sentence has a class named for
what it is:

| Sentence | Markup |
| --- | --- |
| Ordinary paragraph | plain `<p>`, no class |
| The one sentence right under a heading | `.ds-lede` |
| Small print: footnote, aside, the line beside a price | `.ds-note` |
| Hint attached to a form field | `.ds-help` |

`.ds-lede` is 20px in the muted colour, with a small top margin because it
always follows a heading. It has no width cap or alignment of its own: the
screen it sits on decides.

`.ds-note` looks the same as `.ds-help` (14px, muted). The difference is
meaning. A hint belongs to a field and turns red with it when the field is
invalid; a note never does. Use `.ds-help` only for a hint attached to a
form field, ideally linked with `aria-describedby`.

`.ds-hero__lede` is unchanged at body size (16px). It is not an alias of
`.ds-lede`.

The release only adds, so upgrading changes no existing page.

## v0.7.1: the nav toggle is now the kit's job, and it fixes a live bug

`[data-ds-nav-toggle]` is hidden by default and revealed below 720px, the
same breakpoint that hides `.ds-nav__links`: a nav shows its links or its
toggle, never both. It also carries `flex-shrink: 0`, because it is the only
shrinkable child in the `.ds-nav` flex row and would otherwise fall under the
24px tap-target minimum at narrow widths.

This is a fix, not just deduplication. `[data-ds-nav-toggle]` and
`.ds-iconbtn` share the same specificity, (0,1,0), and `button.css` sorts
before `layout.css`, so the toggle rule's `display` was winning and turning
`.ds-iconbtn`'s `inline-grid` box into a flex one. `.ds-iconbtn` centres with
`place-items: center`, which expands to `align-items` and `justify-items`.
`align-items` still applies on a flex container, so the glyph stayed
vertically centred, but `justify-items` does nothing there, and nothing else
declared `justify-content`, which defaults to `flex-start`. So the glyph
packed to the left edge of its 40px box rather than sitting centred. The
promoted rule now carries `align-items: center; justify-content: center` to
restore full centring. Both consuming sites ship that left-packed glyph
today, because the rule each declared locally was byte-identical and never
declared `justify-content` either.

If you declare this rule locally, delete it: it duplicates the kit for no
benefit. Deleting is housekeeping, not a prerequisite for the fix. CSS
cascades per property, and your local rule declares only `display` and
`flex-shrink`, never `align-items` or `justify-content`, so there is no
competing declaration for the two properties the kit now sets. The centring
lands on upgrade whether or not you keep your local copy.

**Escape hatch.** The `[data-ds-nav-toggle]` selector is deliberately bare
and unscoped, not tied to `.ds-nav`, so it works for any element carrying
that attribute. If you need the toggle visible at every width instead, for
instance reusing the attribute pair for something other than a nav,
declare your own `[data-ds-nav-toggle]` rule after `ui.css` in your
stylesheet load order. Your rule and the kit's are equal specificity,
(0,1,0), and equal specificity resolves by source order, so loading after
the kit wins.

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
