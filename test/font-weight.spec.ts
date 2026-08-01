import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(__dirname, "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");

// --ds-font-display: 'Canela', Georgia, serif  ->  display: "Canela"
function fontTokenFamilies(): Record<string, string> {
  const out: Record<string, string> = {};
  const src = read("tokens/primitives.css");
  for (const m of src.matchAll(/--ds-font-([\w-]+)\s*:\s*'([^']+)'/g)) out[m[1]] = m[2];
  return out;
}

// @font-face { font-family: 'Canela'; font-weight: 300; ... }  ->  Canela: {300,400,500}
function declaredFaces(): Record<string, Set<number>> {
  const out: Record<string, Set<number>> = {};
  const src = read("fonts.css");
  for (const block of src.matchAll(/@font-face\s*\{([^}]*)\}/g)) {
    const fam = /font-family:\s*'([^']+)'/.exec(block[1])?.[1];
    const wt = /font-weight:\s*(\d+)/.exec(block[1])?.[1];
    if (!fam || !wt) continue;
    (out[fam] ??= new Set()).add(Number(wt));
  }
  return out;
}

// Every `selector { decls }` pair across components/, with the file it came from.
function ruleBlocks(): Array<{ file: string; selector: string; decls: string }> {
  const { readdirSync } = require("node:fs") as typeof import("node:fs");
  const files = readdirSync(join(root, "components")).filter((f) => f.endsWith(".css"));
  const rules: Array<{ file: string; selector: string; decls: string }> = [];
  for (const file of files) {
    const src = read(`components/${file}`).replace(/\/\*[\s\S]*?\*\//g, "");
    for (const m of src.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      rules.push({ file, selector: m[1].trim(), decls: m[2] });
    }
  }
  return rules;
}

describe("font weights are backed by a real face", () => {
  it("never requests a weight the family does not ship", () => {
    const families = fontTokenFamilies();
    const faces = declaredFaces();
    const offenders: string[] = [];

    for (const { file, selector, decls } of ruleBlocks()) {
      const tok = /font-family:\s*var\(--ds-font-([\w-]+)\)/.exec(decls)?.[1];
      const wt = /font-weight:\s*(\d+)/.exec(decls)?.[1];
      if (!tok || !wt) continue;
      const fam = families[tok];
      if (!fam) continue;
      const available = faces[fam];
      if (!available || !available.has(Number(wt))) {
        offenders.push(
          `${file}: ${selector} asks ${fam} for ${wt}, ships ${available ? [...available].sort().join("/") : "nothing"}`
        );
      }
    }
    expect(offenders).toEqual([]);
  });

  // The original defect was a MISSING weight, not a wrong one: with nothing stated,
  // <h1>/<h2> inherit the UA default of 700 and Canela has no 700 face. Requiring an
  // explicit weight on the display classes is what closes that hole.
  it("states an explicit weight on every display class", () => {
    const missing: string[] = [];
    for (const cls of [".ds-display", ".ds-h1", ".ds-h2"]) {
      const rule = ruleBlocks().find((r) => r.selector === cls);
      expect(rule, `${cls} rule not found in components/`).toBeTruthy();
      if (!/font-weight:\s*\d+/.test(rule!.decls)) missing.push(cls);
    }
    expect(missing).toEqual([]);
  });
});
