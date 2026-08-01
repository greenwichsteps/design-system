# @greenwichsteps/design-system

A shared, themeable, CSS-first design system for the Greenwich Steps family of products: install with `pnpm install`, build the published CSS/JS output with `pnpm build`, run the test suite with `pnpm test`, and consume it in another project as a git dependency pinned to a tag (e.g. `"@greenwichsteps/design-system": "github:greenwichsteps/design-system#v0.1.0"`), which resolves via its `prepare` script so `dist/` is built automatically on install.

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
