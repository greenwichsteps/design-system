import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = join(__dirname, "..");

// GRE-597. .ds-lede, .ds-note and .ds-help all set --ds-text-muted, so muted text
// has to clear AA wherever they sit: on the page and on a card, in both themes.
//
// Tokens are resolved through the real files, light = primitives + semantic and
// dark = light overlaid with themes/dark.css, following var() aliases, so a theme
// change is tested rather than a copy of today's hex.
//
// --ds-surface-raised is covered too since GRE-598: dark muted on it measured 4.37:1
// until --ds-ink-muted went from #8A8891 to #8D8B94.

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
  // Measured 2026-11-24: light 4.69 / 5.25 / 5.25, dark 5.53 / 5.01 / 4.54 (bg, surface, raised).
  it.each([
    ["light", "--ds-bg"], ["light", "--ds-surface"],
    ["dark", "--ds-bg"], ["dark", "--ds-surface"],
    ["light", "--ds-surface-raised"], ["dark", "--ds-surface-raised"],
  ])("muted text clears AA on %s %s", (theme, surface) => {
    const t = theme === "light" ? light : dark;
    const fg = resolve(t, "--ds-text-muted");
    const bg = resolve(t, surface);
    expect(ratio(fg, bg), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
  });

  it("resolves through the theme rather than a fixed hex", () => {
    expect(resolve(light, "--ds-text-muted")).toBe("#6E6C66");
    expect(resolve(dark, "--ds-text-muted")).toBe("#8D8B94");
  });
});

// GRE-603. A brand theme is the third layer: its base block applies in both themes,
// and a block scoped under [data-theme="dark"] applies in dark only. No brand sets a
// muted or surface token today, so this passes trivially; it exists so the day one
// does, the pairing is measured instead of assumed.
const brandBlocks = (p: string) =>
  [...readFileSync(join(root, p), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .map((m) => ({ dark: m[1].includes('[data-theme="dark"]'), tokens: new Map([...m[2].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((d) => [d[1], d[2].trim()])) }));
const brands = readdirSync(join(root, "themes")).filter((f) => f.endsWith(".css") && f !== "dark.css");

describe("muted text contrast under each brand theme", () => {
  it("finds the brand themes", () => {
    expect(brands).toEqual(expect.arrayContaining(["burnside.css", "farnsworth.css"]));
  });

  it.each(brands.flatMap((b) => ["light", "dark"].flatMap((theme) =>
    ["--ds-bg", "--ds-surface", "--ds-surface-raised"].map((surface) => [b, theme, surface]))))(
    "%s: muted text clears AA on %s %s", (brand, theme, surface) => {
      const blocks = brandBlocks(`themes/${brand}`);
      const t: Tokens = new Map(theme === "light" ? light : dark);
      for (const b of blocks) if (!b.dark) for (const [k, v] of b.tokens) t.set(k, v);
      if (theme === "dark") for (const b of blocks) if (b.dark) for (const [k, v] of b.tokens) t.set(k, v);
      const fg = resolve(t, "--ds-text-muted");
      const bg = resolve(t, surface);
      expect(ratio(fg, bg), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
    });
});

// GRE-616. Tone text (the danger/success badges and the invalid hint) is computed from
// the DECLARED value in dist/ui.css, not a copy of it: the colour expression is read
// off the whole-selector rule, evaluated against the resolved theme tokens, and
// composited over each surface the element can sit on. A badge background is the tone
// at an alpha, so it is flattened onto the surface before the ratio is taken.
const rgb = (hex: string) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const hexOf = (c: number[]) => "#" + c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

function declared(sel: string, prop: string): string {
  const css = readFileSync(join(root, "dist/ui.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter((r) => r[1].split(",").map((s) => s.trim()).includes(sel));
  const values = rules.map((r) => r[2].match(new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`))?.[1].trim()).filter(Boolean);
  if (!values.length) throw new Error(`no ${prop} declared on ${sel}`);
  return values[values.length - 1]!;
}

// Evaluates var(--x), or color-mix(in srgb, A N%, B) where B may be `transparent`
// (then the result is A at alpha N, returned with the alpha so it can be flattened).
function evalColour(t: Tokens, expr: string): { c: number[]; a: number } {
  const v = expr.match(/^var\((--[\w-]+)\)$/);
  if (v) return { c: rgb(resolve(t, v[1])), a: 1 };
  const m = expr.match(/^color-mix\(in srgb,\s*(var\(--[\w-]+\))\s+(\d+)%,\s*(var\(--[\w-]+\)|transparent)\)$/);
  if (!m) throw new Error(`cannot evaluate: ${expr}`);
  const p = Number(m[2]) / 100;
  const a = evalColour(t, m[1]).c;
  if (m[3] === "transparent") return { c: a, a: p };
  const b = evalColour(t, m[3]).c;
  return { c: a.map((x, i) => x * p + b[i] * (1 - p)), a: 1 };
}
const over = (f: { c: number[]; a: number }, surface: number[]) => f.c.map((x, i) => x * f.a + surface[i] * (1 - f.a));

describe("tone text contrast (danger and success)", () => {
  const surfaces = ["--ds-bg", "--ds-surface", "--ds-surface-raised"];
  for (const [theme, t] of [["light", light], ["dark", dark]] as const) {
    for (const surface of surfaces) {
      const s = rgb(resolve(t, surface));
      for (const sel of [".ds-badge--success", ".ds-badge--danger"]) {
        it(`${sel} text clears AA on its own tint over ${theme} ${surface}`, () => {
          const bg = over(evalColour(t, declared(sel, "background")), s);
          const fg = evalColour(t, declared(sel, "color")).c;
          expect(ratio(hexOf(fg), hexOf(bg)), `${hexOf(fg)} on ${hexOf(bg)}`).toBeGreaterThanOrEqual(4.5);
        });
      }
      it(`the invalid hint clears AA on ${theme} ${surface}`, () => {
        const fg = evalColour(t, declared(".ds-field[data-invalid] .ds-help", "color")).c;
        expect(ratio(hexOf(fg), hexOf(s)), `${hexOf(fg)} on ${hexOf(s)}`).toBeGreaterThanOrEqual(4.5);
      });
    }
  }
});
