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

// Pulls a custom property out of a CSS block selected by `selector`.
function token(css: string, selector: string, prop: string): string {
  const block = css.split(selector)[1];
  if (!block) throw new Error(`selector not found: ${selector}`);
  const m = block.slice(0, block.indexOf("}")).match(new RegExp(`${prop}:\\s*(#[0-9A-Fa-f]{6})`));
  if (!m) throw new Error(`${prop} not found (or not a literal hex) in ${selector}`);
  return m[1];
}

describe("farnsworth accent contrast", () => {
  const css = readFileSync(join(root, "themes/farnsworth.css"), "utf8");

  // The gap this closes, recorded as GRE-227: a brand supplies one --ds-accent
  // and themes/dark.css overrides none, so an accent tuned for one surface
  // fails as link text on the other. Burnside measures 2.76:1 on paper today.
  it("clears AA as text on the light surface", () => {
    const accent = token(css, '[data-theme-brand="farnsworth"]', "--ds-accent");
    expect(ratio(accent, PAPER), `${accent} on ${PAPER}`).toBeGreaterThanOrEqual(4.5);
  });

  it("clears AA as text on the dark surface", () => {
    const accent = token(css, '[data-theme="dark"][data-theme-brand="farnsworth"]', "--ds-accent");
    expect(ratio(accent, BG), `${accent} on ${BG}`).toBeGreaterThanOrEqual(4.5);
  });

  // A filled button is on-accent over accent, a fixed pair, so it is checked
  // separately from the varying-background case above.
  it("clears AA for text on a filled button, in both themes", () => {
    for (const sel of ['[data-theme-brand="farnsworth"]', '[data-theme="dark"][data-theme-brand="farnsworth"]']) {
      const accent = token(css, sel, "--ds-accent");
      const on = token(css, sel, "--ds-on-accent");
      expect(ratio(on, accent), `${on} on ${accent} in ${sel}`).toBeGreaterThanOrEqual(4.5);
    }
  });
});
