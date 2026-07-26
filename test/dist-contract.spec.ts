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
    for (const fn of ["initClipboard", "initTheme", "initNav", "initMenu", "initTabs", "initModal", "initToast", "initAll"]) {
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
});
