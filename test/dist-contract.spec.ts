import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = join(__dirname, "..");

// dist/ is built by vitest's globalSetup, before collection. It has to be: Vite
// resolves the imports below at collection time, which is earlier than any beforeAll.

// These assert the contract a CONSUMER receives, not the source. Every other suite
// imports from ../behaviors/*, so nothing exercised the published artifacts. That is
// how v0.1.0 shipped a ui.js with no ES exports at all: 13 tests green, package
// unusable to any bundler.
//
// Test order matters here. dist/ui.js auto-initializes on import, so it is exercised
// last; importing it earlier would contaminate the ui.mjs assertions.
describe("published artifacts", () => {
  beforeEach(() => { document.documentElement.removeAttribute("data-theme"); localStorage.clear(); });

  it("emits both a module build and a script-tag build", () => {
    expect(existsSync(join(root, "dist/ui.mjs")), "dist/ui.mjs missing").toBe(true);
    expect(existsSync(join(root, "dist/ui.js")), "dist/ui.js missing").toBe(true);
  });

  it("ships ui.mjs as real ESM with named exports", async () => {
    const mod = await import("../dist/ui.mjs");
    for (const fn of ["initClipboard", "initTheme", "initNav", "initStickyHeader", "initMenu", "initTabs", "initModal", "initToast", "initAll"]) {
      expect(typeof (mod as Record<string, unknown>)[fn], `${fn} not exported from dist/ui.mjs`).toBe("function");
    }
  });

  it("does not initialize anything when ui.mjs is imported", async () => {
    document.documentElement.removeAttribute("data-theme");
    await import("../dist/ui.mjs");
    expect(document.documentElement.getAttribute("data-theme")).toBeNull();
  });

  it("marks the package tree-shakeable so importing one behavior does not pull the rest", () => {
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    expect(pkg.sideEffects, "sideEffects not declared").toBeDefined();
    // CSS and the auto-initializing script build are genuinely side-effectful and
    // must stay listed, or a bundler may drop them.
    expect(pkg.sideEffects).toContain("*.css");
    expect(pkg.sideEffects).toContain("./dist/ui.js");
  });

  it("exposes ui.mjs through the exports map", () => {
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    expect(pkg.exports["./ui.mjs"]).toBe("./dist/ui.mjs");
  });

  it("keeps ui.js a self-initializing script build, so the gallery is unaffected", async () => {
    const js = readFileSync(join(root, "dist/ui.js"), "utf8");
    expect(js.startsWith('"use strict";var DS='), "ui.js is no longer an IIFE assigning to DS").toBe(true);
    await import("../dist/ui.js");
    expect(document.documentElement.getAttribute("data-theme"), "ui.js did not auto-initialize").not.toBeNull();
  });

  it("ships a type declaration next to the module build", () => {
    expect(existsSync(join(root, "dist/ui.d.mts")), "dist/ui.d.mts missing").toBe(true);
    expect(existsSync(join(root, "dist/types/index.d.ts")), "dist/types/index.d.ts missing").toBe(true);
  });

  // The drift guard, and the reason it compares against the RUNTIME exports.
  // Generation makes the declarations impossible to desync from the source, so the
  // realistic failure is different: the emit step silently stops running and a stale
  // dist/ stays committed. Only a comparison against what ui.mjs actually exports
  // catches that. Word boundaries matter here: "toast" is a substring of "initToast",
  // so a plain substring check would pass while toast itself was missing.
  it("declares every name the module build actually exports", async () => {
    const mod = await import("../dist/ui.mjs");
    const dts = readFileSync(join(root, "dist/types/index.d.ts"), "utf8");
    const exported = Object.keys(mod as Record<string, unknown>).filter((k) => k !== "default");
    expect(exported.length, "no runtime exports found to compare against").toBeGreaterThan(0);
    for (const name of exported) {
      expect(dts, `${name} is exported by dist/ui.mjs but absent from the declarations`)
        .toMatch(new RegExp(`\\b${name}\\b`));
    }
  });

  // The blind spot in the guard above, closed. That test compares export NAMES
  // against index.d.ts, and every name also appears there in an import line, so
  // dropping a whole sibling declaration slips straight past it: the suite stays
  // green at 29 while a consumer fails with TS2307 Cannot find module './theme.js'.
  // Checking that each specifier actually resolves is what catches a missing file
  // rather than a missing name. Found by review of the change that added the guard.
  it("resolves every declaration its entry point imports", () => {
    const index = readFileSync(join(root, "dist/types/index.d.ts"), "utf8");
    const specifiers = [...index.matchAll(/from "\.\/([^"]+)\.js"/g)].map((m) => m[1]);
    expect(specifiers.length, "no relative specifiers found in index.d.ts to check").toBeGreaterThan(0);
    for (const s of specifiers) {
      expect(
        existsSync(join(root, `dist/types/${s}.d.ts`)),
        `dist/types/${s}.d.ts is imported by index.d.ts but was not emitted`,
      ).toBe(true);
    }
  });

  // The build concatenates components/*.css automatically, so the realistic
  // failure is the file being deleted or renamed rather than the build breaking.
  // Two consumers now depend on these class names arriving in dist/ui.css.
  it("ships the hero composition in the stylesheet", () => {
    const css = readFileSync(join(root, "dist/ui.css"), "utf8");
    for (const cls of [".ds-hero", ".ds-hero__lede", ".ds-hero__actions"]) {
      expect(css, `${cls} missing from dist/ui.css`).toContain(cls);
    }
  });
});

// GRE-597: the text-role classes. Selectors are matched as whole entries in a rule's
// selector list, with comments stripped, so `.ds-lede-x` or a comment that names
// `.ds-lede` cannot satisfy them. Only flat rules are read; ui.css has @media blocks,
// and the regex skips their opening line rather than mistaking it for a selector.
const read = (p: string) => readFileSync(join(root, p), "utf8");
function rules(css: string): Array<{ selectors: string[]; body: string }> {
  return [...css.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .map((m) => ({ selectors: m[1].split(",").map((s) => s.trim()), body: m[2] }));
}
// GRE-603. A rule body as a property map, so a check compares whole declarations:
// `line-height: 1.4` no longer passes `1.45`, nor `color` inside `background-color`.
function props(body: string): Record<string, string> {
  return Object.fromEntries(
    body.split(";").map((d) => d.trim()).filter(Boolean).map((d) => {
      const i = d.indexOf(":");
      return [d.slice(0, i).trim(), d.slice(i + 1).trim()];
    }),
  );
}

describe("text roles in the published stylesheet", () => {
  it("ships .ds-lede with the spec's declarations", () => {
    const r = rules(read("dist/ui.css")).filter((x) => x.selectors.includes(".ds-lede"));
    expect(r).toHaveLength(1);
    expect(r[0].selectors).toEqual([".ds-lede"]);
    // Exactly these, and nothing else: the context decides width and alignment, not
    // the lede, so a width, max-width, text-align or margin shorthand fails here.
    expect(props(r[0].body)).toEqual({
      "font-size": "var(--ds-text-lg)",
      color: "var(--ds-text-muted)",
      "line-height": "1.4",
      "margin-top": "var(--ds-space-3)",
    });
  });

  it("ships .ds-note with the spec's declarations", () => {
    const r = rules(read("dist/ui.css")).filter((x) => x.selectors.includes(".ds-note"));
    expect(r).toHaveLength(1);
    expect(r[0].selectors).toEqual([".ds-note"]);
    expect(props(r[0].body)).toEqual({ "font-size": "var(--ds-text-sm)", color: "var(--ds-text-muted)" });
  });

  // What separates a note from .ds-help: a hint turns red with its invalid field,
  // a note never does. Three ways a note could turn red, one check each. They read the
  // stylesheet, so they cannot see a consumer's own CSS; only a browser check of a note
  // inside an invalid field would close that.
  it("names no danger or error token in any rule that selects .ds-note", () => {
    const hits = rules(read("dist/ui.css"))
      .filter((x) => x.selectors.some((s) => /\.ds-note(?![\w-])/.test(s)) && /--ds-(danger|error)\b/.test(x.body));
    expect(hits).toEqual([]);
  });

  // `.ds-field[data-invalid] p { color: ... }` outranks .ds-note and would colour every
  // note in an invalid field. Only the hint may take a colour from the invalid state.
  it("colours only .ds-help from an invalid field", () => {
    const hits = rules(read("dist/ui.css"))
      .filter((x) => x.selectors.some((s) => s.includes("[data-invalid]")) && "color" in props(x.body))
      .filter((x) => !x.selectors.every((s) => /\.ds-help$/.test(s)));
    expect(hits).toEqual([]);
  });

  // Redefining the token would turn a note red without naming it at all.
  it("never redefines --ds-text-muted in the component stylesheet", () => {
    const hits = rules(read("dist/ui.css")).filter((x) => "--ds-text-muted" in props(x.body));
    expect(hits).toEqual([]);
  });

  // type.css sorts after hero.css in ui.css, so a new rule that also matched the
  // hero lede would silently win. The hero is pinned byte-for-byte to v0.7.1.
  it("leaves the hero lede exactly as v0.7.1 shipped it", () => {
    const r = rules(read("dist/ui.css")).filter((x) => x.selectors.includes(".ds-hero__lede"));
    expect(r).toHaveLength(1);
    expect(r[0].body.trim()).toBe("color: var(--ds-text-muted); max-width: 46ch; margin: var(--ds-space-4) auto 0;");
  });
});
