import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(__dirname, "..");

// WCAG relative luminance and contrast ratio. Written out rather than pulled
// from a dependency: it is twelve lines, and a colour library would be a new
// runtime dependency in a package that currently ships none.
const lin = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const lum = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
};
const ratio = (a: string, b: string) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// Surfaces the accent has to survive, from tokens/primitives.css.
const PAPER = "#F4F2EC";   // --ds-paper, the light background
const BG = "#121317";      // --ds-ink, the dark background

const LIGHT = '[data-theme-brand="farnsworth"]';
const DARK = '[data-theme="dark"][data-theme-brand="farnsworth"]';

// Strip comments, split into rules, and match the selector as an exact entry in
// the rule's comma-separated selector list.
//
// Splitting the file on the selector substring and slicing to the next "}" was
// right only by accident of layout: `[data-theme-brand="farnsworth"]` appears
// three times in this file, twice nested inside the dark compound selector, so
// which block got read depended on text order rather than on CSS structure. A
// reordering of the dark block's two selectors would have silently changed which
// values were tested.
function block(css: string, selector: string): string {
  const rules = [...css.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([^{}]+)\{([^{}]*)\}/g)];
  const hit = rules.find((r) => r[1].split(",").map((s) => s.trim()).includes(selector));
  if (!hit) throw new Error(`no rule whose selector list contains exactly: ${selector}`);
  return hit[2];
}

// Read a property, following var() aliases. The -solid tokens are declared as
// var(--ds-accent) rather than literals, so a hex-only reader could not see them
// at all and they had no coverage.
function token(css: string, selector: string, prop: string): string {
  const read = (sel: string, p: string) =>
    block(css, sel).match(new RegExp(`${p}:\\s*([^;]+);`))?.[1].trim();
  // A dark block need not redeclare every token, so fall back to the light one.
  const raw = read(selector, prop) ?? (selector === LIGHT ? undefined : read(LIGHT, prop));
  if (raw === undefined) throw new Error(`${prop} not declared in ${selector} or ${LIGHT}`);
  const alias = raw.match(/^var\((--[\w-]+)\)$/);
  if (alias) return token(css, selector, alias[1]);
  if (!/^#[0-9A-Fa-f]{6}$/.test(raw)) throw new Error(`${prop} in ${selector} is neither a hex nor a var(): ${raw}`);
  return raw;
}

describe("farnsworth accent contrast", () => {
  const css = readFileSync(join(root, "themes/farnsworth.css"), "utf8");

  // The gap this closes, recorded as GRE-227: a brand supplies one --ds-accent
  // and themes/dark.css overrides none, so an accent tuned for one surface
  // fails as link text on the other. Burnside measures 2.76:1 on paper today.
  it("clears AA as text on the light surface", () => {
    const accent = token(css, LIGHT, "--ds-accent");
    expect(ratio(accent, PAPER), `${accent} on ${PAPER}`).toBeGreaterThanOrEqual(4.5);
  });

  it("clears AA as text on the dark surface", () => {
    const accent = token(css, DARK, "--ds-accent");
    expect(ratio(accent, BG), `${accent} on ${BG}`).toBeGreaterThanOrEqual(4.5);
  });

  // A filled button is on-accent over accent, a fixed pair, so it is checked
  // separately from the varying-background case above.
  //
  // Worth knowing before trusting this as independent coverage: in the dark
  // block --ds-on-accent is #121317, which is byte-identical to BG. Because the
  // contrast ratio is symmetric, the dark iteration here computes exactly the
  // same number as the dark-surface test above, for any value of --ds-accent.
  // So it adds no detection against an accent-only regression. It does catch an
  // --ds-on-accent-only regression, which the test above cannot see, and the
  // light iteration is genuinely independent because #FFFFFF against paper is a
  // different pair from the accent against paper.
  it("clears AA for text on a filled button, in both themes", () => {
    for (const sel of [LIGHT, DARK]) {
      const accent = token(css, sel, "--ds-accent");
      const on = token(css, sel, "--ds-on-accent");
      expect(ratio(on, accent), `${on} on ${accent} in ${sel}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  // The -solid tokens had no coverage at all, because they are declared as
  // var(--ds-accent) and the first reader only accepted literal hexes. They are
  // aliases today, so this passes trivially; it exists so that giving them
  // distinct literal values later cannot silently ship a failing pair.
  it("clears AA for text on a filled solid button, in both themes", () => {
    for (const sel of [LIGHT, DARK]) {
      const solid = token(css, sel, "--ds-accent-solid");
      const on = token(css, sel, "--ds-on-accent-solid");
      expect(ratio(on, solid), `${on} on ${solid} in ${sel}`).toBeGreaterThanOrEqual(4.5);
    }
  });
});
