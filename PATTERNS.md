# Pattern ledger

Project-local page compositions across the family. Add a row when you build one.
Promotion rule: a pattern used by **≥2 projects** graduates to a real component
in `components/` (mark its row "promoted → components/<file>").

| Pattern | Project(s) | Added | Purpose | Link |
|---|---|---|---|---|
| hero | burnside-www, burnside-hosted | 2026-07-25 | Display headline, lede, and paired CTAs for a marketing landing page | promoted → `components/hero.css` (`.ds-hero`) |
| feature-grid | burnside-www | 2026-07-25 | Grid of kit cards presenting product capabilities | **Retired GRE-163.** The `#features` grid was removed from `www/web/index.html`; its claims were redistributed into `#issue` (tag vocabulary), `#data` (token custody, Shadow DOM isolation), and `#faq` (free plan). |
| pricing-card | burnside-www, burnside-hosted | 2026-07-25 | Tier card with price, description, and a single action; one tier emphasised via `.ds-card--pop`. **Markup convention, no CSS of its own**, so there is nothing to graduate: it is `.ds-card` + `.ds-h2` + `.ds-badge--accent` assembled per consumer. | `www/web/index.html` `#pricing`, `hosted/web/buy.html` `.ds-card--pop` |
| hero-left | burnside-www | 2026-07-27 | Left-aligned hero carrying a copyable install prompt as its primary action; overrides `.ds-hero` centring | **Retired GRE-166.** This branch reverted `.site-hero` to centred and removed the copyable install prompt in favour of the tabbed install card. |
| install-card | burnside-www | 2026-07-29 | Tabbed install card with a CSS-only tab and selector mechanism (radio inputs plus sibling combinator); JS only for the clipboard | `www/web/styles.css` `.site-ic` |
| section | burnside-www, farnsworth-www | 2026-08-01 | Vertical rhythm and divider for a marketing page's stacked content blocks | promoted → `components/section.css` (`.ds-section`) |
| footer | burnside-www (farnsworth-www adopting) | 2026-08-01 | Grouped link footer with an identity block and a baseline row | promoted → `components/footer.css` (`.ds-footer__cols`). Structure only: per-consumer `grid-template-columns` overrides stay local, because track ratios are tuned to a specific set of groups. |
| nav-toggle | burnside-www, farnsworth-www | 2026-08-02 | Hide the nav toggle above the breakpoint that reveals the links, and stop it shrinking under the tap-target minimum | promoted → `components/layout.css` (`[data-ds-nav-toggle]`). Selector is deliberately bare and unscoped, specificity (0,1,0), the minimum a consumer needs to beat to override it; scoping it later (e.g. to `.ds-nav [data-ds-nav-toggle]`) would raise specificity and is a breaking change. |

## Identity rules

**No lockup.** `icon` and `wordmark` are separate masters per brand, never
combined into a third file. Verified in a real nav at 760px and 375px: the
stacked wordmark holds unaided, and adding the icon made it busier rather than
better. The icon already appears beside the name as text in a browser tab, a
GitHub avatar and the widget badge, so recognition transfer happens without a
lockup asset. A lockup file would need clear-space and minimum-size rules no
test can enforce.

**Short forms are permitted; lockups are not.** A brand may ship a short
wordmark for constrained horizontal slots, such as `wordmark-short.svg` drawing
"Burnside." for a sticky nav where the stacked mark would either halve the glyph
size or double the bar height. The condition is strict: a short form is the same
wordmark rendered short, produced by the same script from the same font with the
same tracking, and it **never changes the accessible name**. Every Burnside
variant carries `aria-label="Burnside Steps"` and consumers set the full name in
`alt`, whatever the mark draws. This is not a licence for a third design; it is a
second rendering of the one wordmark.

**Dark mode.** Each master carries its own `@media (prefers-color-scheme: dark)`
block, which makes a single external SVG self-inverting even inside an `<img>`.
This replaces `currentColor`, which only resolves when the SVG is inlined.
Because the query follows the OS rather than the local background, pinned
`-light` and `-dark` variants ship alongside for contexts that must be fixed.

**Rasters come from the pinned variants, never the master.** resvg applies
`<style>` class rules but ignores every `@media` block, so rastering the master
silently yields the light variant.

**Outlining is one-time and local; rasterising is the build.** The wordmark is
outlined by `burnsidesteps/scripts/outline-wordmark.mjs` against the licensed GT
America file, which is gitignored there and must never enter this public repo.
