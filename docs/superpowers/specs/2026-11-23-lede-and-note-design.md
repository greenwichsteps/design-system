# Design: `.ds-lede` and `.ds-note`

**Status:** approved by Lee 2026-11-23. Linear: GRE-597. Ships as v0.8.0.

## Why

Burnside uses `.ds-help`, the kit's form-field hint, for about 44 sentences that are not
form hints (GRE-596): screen intros, explanations, pricing small print. The cause is a gap in
the kit, not carelessness in one product:

- A plain `<p>` is already a proper paragraph. `reset.css` gives `body` 16px text, the normal
  colour, line-height 1.5.
- There is no class for the **subtitle under a heading** outside the marketing hero.
  `.ds-hero__lede` carries the hero's centring and spacing, so an app screen cannot use it.
- There is no class for **small print**.

`.ds-help` was the nearest small, muted class, so products borrowed it.

## Goals

- Every kind of supporting sentence has a class named for what it is.
- `.ds-hero__lede` looks exactly as it does today.

## Non-goals

- Status and alert messages ("Preparing your licence key…"). A separate kind of text; left
  to GRE-596's sweep, and its own design if it needs one.
- Burnside adopting the classes (GRE-596).

## Anti-goals

- Classes named for how they look (`.ds-text-sm`, `.ds-text-muted`). Picking text by its
  look is how `.ds-help` spread.

## Approaches

1. **Subtitle only (`.ds-lede`).** Smallest change, but small print keeps borrowing `.ds-help`.
2. **Subtitle and small print (`.ds-lede` + `.ds-note`).** Chosen by Lee. Every sentence in
   the GRE-596 survey has a home.
3. **Look-named utilities.** Flexible; rejected as the anti-goal above.

## Design

In `components/type.css`:

```css
.ds-lede { font-size: var(--ds-text-lg); color: var(--ds-text-muted); line-height: 1.4; margin-top: var(--ds-space-3); }
.ds-note { font-size: var(--ds-text-sm); color: var(--ds-text-muted); }
```

Which class to use:

| Sentence | Markup |
| --- | --- |
| Ordinary paragraph | plain `<p>` |
| The one sentence right under a heading | `.ds-lede` |
| Small print: footnote, aside, line beside a price | `.ds-note` |
| Hint attached to a form field | `.ds-help` |

Calls made in the design (approved with it):

- `.ds-note` is visually identical to `.ds-help`. Only the meaning differs: a hint belongs to
  a field and turns red with it (`.ds-field[data-invalid] .ds-help`); a note never does.
- `.ds-lede` has no width cap and no centring. The context decides alignment.
- `.ds-lede` carries its own top margin, since a lede always follows a heading.
- `.ds-hero__lede` becomes `.ds-lede` plus the hero's centring, 46ch measure and
  `--ds-space-4` top margin, with no visible change.

## Ships with

- A gallery section showing paragraph, lede, note and field hint side by side.
- A dist contract test that `dist/ui.css` carries both classes.
- Contrast: muted text on the page background clears 4.5:1 in light and dark.
- Release v0.8.0 (additive, so minor).

## Left to the builder

- How `.ds-hero__lede` composes with `.ds-lede` (markup class pair vs shared declarations),
  as long as the hero looks the same.
- Exact gallery copy and placement.
