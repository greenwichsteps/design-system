# Pattern ledger

Project-local page compositions across the family. Add a row when you build one.
Promotion rule: a pattern used by **≥2 projects** graduates to a real component
in `components/` (mark its row "promoted → components/<file>").

| Pattern | Project(s) | Added | Purpose | Link |
|---|---|---|---|---|
| hero | burnside-www, burnside-hosted | 2026-07-25 | Display headline, lede, and paired CTAs for a marketing landing page | promoted → `components/hero.css` (`.ds-hero`) |
| feature-grid | burnside-www | 2026-07-25 | Grid of kit cards presenting product capabilities | **Retired GRE-163.** The `#features` grid was removed from `www/web/index.html`; its claims were redistributed into `#issue` (tag vocabulary), `#data` (token custody, Shadow DOM isolation), and `#faq` (free plan). |
| pricing-card | burnside-www, burnside-hosted | 2026-07-25 | Tier card with price, description, and a single action; one tier emphasised via `.ds-card--pop`. **Markup convention, no CSS of its own**, so there is nothing to graduate: it is `.ds-card` + `.ds-h2` + `.ds-badge--accent` assembled per consumer. | `www/web/index.html` `#pricing`, `hosted/web/buy.html` `.ds-card--pop` |
| hero-left | burnside-www | 2026-07-27 | Left-aligned hero carrying a copyable install prompt as its primary action; overrides `.ds-hero` centring | `www/web/styles.css` `.site-hero` |
