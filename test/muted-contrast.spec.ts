import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(__dirname, "..");

// GRE-597. .ds-lede, .ds-note and .ds-help all set --ds-text-muted, so muted text
// has to clear AA wherever they sit: on the page and on a card, in both themes.
//
// Tokens are resolved through the real files, light = primitives + semantic and
// dark = light overlaid with themes/dark.css, following var() aliases, so a theme
// change is tested rather than a copy of today's hex.
//
// --ds-surface-raised is deliberately absent: dark muted on it measures 4.37:1.
// No component puts muted text there today. Filed as GRE-598.

const lin = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const lum = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
};
const ratio = (a: string, b: string) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

type Tokens = Map<string, string>;
const decls = (p: string): Tokens => {
  const css = readFileSync(join(root, p), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  return new Map([...css.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
};
const light: Tokens = new Map([...decls("tokens/primitives.css"), ...decls("tokens/semantic.css")]);
const dark: Tokens = new Map([...light, ...decls("themes/dark.css")]);

function resolve(t: Tokens, name: string, seen: string[] = []): string {
  if (seen.includes(name)) throw new Error(`var() cycle: ${[...seen, name].join(" -> ")}`);
  const raw = t.get(name);
  if (raw === undefined) throw new Error(`${name} is not declared`);
  const alias = raw.match(/^var\((--[\w-]+)\)$/);
  if (alias) return resolve(t, alias[1], [...seen, name]);
  if (!/^#[0-9A-Fa-f]{6}$/.test(raw)) throw new Error(`${name} is neither a 6-digit hex nor a var(): ${raw}`);
  return raw;
}

describe("muted text contrast", () => {
  // Measured 2026-11-23: light 4.69 / 5.25, dark 5.31 / 4.81.
  it.each([
    ["light", "--ds-bg"], ["light", "--ds-surface"],
    ["dark", "--ds-bg"], ["dark", "--ds-surface"],
  ])("muted text clears AA on %s %s", (theme, surface) => {
    const t = theme === "light" ? light : dark;
    const fg = resolve(t, "--ds-text-muted");
    const bg = resolve(t, surface);
    expect(ratio(fg, bg), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
  });

  it("resolves through the theme rather than a fixed hex", () => {
    expect(resolve(light, "--ds-text-muted")).toBe("#6E6C66");
    expect(resolve(dark, "--ds-text-muted")).toBe("#8A8891");
  });
});
