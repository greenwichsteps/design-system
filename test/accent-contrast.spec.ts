import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// GRE-227 and GRE-386. Every accent token that forms a foreground/background pair, for every
// brand, in both themes, measured from the token files rather than copied hex.
//
// Light = primitives + semantic + the brand's base block. Dark = that, then themes/dark.css,
// then the brand's base block again (it sits on an inner element and wins over the inherited
// dark tokens), then the brand's dark blocks. Each var() alias is followed to a 6-digit hex.

const root = join(__dirname, "..");
const read = (p: string) => readFileSync(join(root, p), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
type Tokens = Map<string, string>;
const blocks = (p: string) => [...read(p).matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .map((m) => ({ dark: /data-theme=["']?dark\b/.test(m[1]!), tokens: new Map([...m[2]!.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((d) => [d[1]!, d[2]!.trim()])) }));
const merge = (into: Tokens, from: Tokens) => { for (const [k, v] of from) into.set(k, v); return into; };
const base: Tokens = new Map();
for (const b of [...blocks("tokens/primitives.css"), ...blocks("tokens/semantic.css")]) merge(base, b.tokens);
const darkTheme = blocks("themes/dark.css").reduce((t, b) => merge(t, b.tokens), new Map() as Tokens);

function theme(brand: string, dark: boolean): Tokens {
  const bs = blocks(`themes/${brand}.css`);
  const t = merge(new Map(), base);
  for (const b of bs) if (!b.dark) merge(t, b.tokens);
  if (dark) {
    merge(t, darkTheme);
    for (const b of bs) if (!b.dark) merge(t, b.tokens);
    for (const b of bs) if (b.dark) merge(t, b.tokens);
  }
  return t;
}
function resolve(t: Tokens, name: string, seen: string[] = []): string {
  if (seen.includes(name)) throw new Error(`var() cycle: ${[...seen, name].join(" -> ")}`);
  const raw = t.get(name);
  if (raw === undefined) throw new Error(`${name} is not declared`);
  const alias = raw.match(/^var\((--[\w-]+)\)$/);
  if (alias) return resolve(t, alias[1]!, [...seen, name]);
  if (!/^#[0-9A-Fa-f]{6}$/.test(raw)) throw new Error(`${name} is neither a 6-digit hex nor a var(): ${raw}`);
  return raw;
}
const lin = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const lum = (hex: string) => { const n = parseInt(hex.slice(1), 16); return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255); };
const ratio = (a: string, b: string) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi! + 0.05) / (lo! + 0.05); };

const BRANDS = ["burnside", "farnsworth"];
const SURFACES = ["--ds-bg", "--ds-surface", "--ds-surface-raised"];
const cases = BRANDS.flatMap((b) => [false, true].map((d) => [b, d ? "dark" : "light"] as const));

describe("accent contrast, every brand and theme", () => {
  it.each(cases)("%s %s: link text (--ds-accent-text) clears 4.5:1 on every surface", (brand, th) => {
    const t = theme(brand, th === "dark");
    for (const s of SURFACES) {
      const fg = resolve(t, "--ds-accent-text"), bg = resolve(t, s);
      expect(ratio(fg, bg), `${fg} on ${s} ${bg}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  // WCAG 2.4.11: a focus indicator needs 3:1 against what it sits on.
  it.each(cases)("%s %s: the focus colour clears 3:1 on every surface", (brand, th) => {
    const t = theme(brand, th === "dark");
    for (const s of SURFACES) {
      const fg = resolve(t, "--ds-focus-color"), bg = resolve(t, s);
      expect(ratio(fg, bg), `${fg} on ${s} ${bg}`).toBeGreaterThanOrEqual(3);
    }
  });

  // A filled button and its pressed state: the label on the fill, both states.
  it.each(cases)("%s %s: the solid fill and its pressed state carry their label at 4.5:1", (brand, th) => {
    const t = theme(brand, th === "dark");
    const on = resolve(t, "--ds-on-accent-solid");
    for (const fill of ["--ds-accent-solid", "--ds-accent-solid-press"]) {
      const bg = resolve(t, fill);
      expect(ratio(on, bg), `${on} on ${fill} ${bg}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  // The brand pink itself is unchanged by GRE-386: links take --ds-accent-text instead.
  it("leaves Burnside's brand accent as it was", () => {
    expect(resolve(theme("burnside", false), "--ds-accent")).toBe("#FF4D9D");
    expect(resolve(theme("burnside", true), "--ds-accent")).toBe("#FF4D9D");
  });
});
