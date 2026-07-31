import { describe, it, expect } from "vitest";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = join(__dirname, "..");
const src = (p: string) => join(root, "identity", p);

describe("identity layout", () => {
  it("namespaces every mark under a brand directory", () => {
    for (const f of ["burnside/icon.svg", "burnside/wordmark.svg", "farnsworth/placeholder.svg"]) {
      expect(existsSync(src(f)), `${f} missing`).toBe(true);
    }
  });

  // The collision this prevents: Farnsworth Steps is a real pre-launch product
  // with no mark yet. An unnamespaced icon.svg is Burnside's, and there is
  // nowhere for Farnsworth's to go.
  it("leaves no unnamespaced marks at the identity root", () => {
    const stray = readdirSync(src(""))
      .filter((f: string) => !statSync(src(f)).isDirectory());
    expect(stray, `unnamespaced files at identity/: ${stray.join(", ")}`).toEqual([]);
  });

  // currentColor never resolves inside an <img>, so this file could not do the
  // job it existed for. The self-inverting master replaces it.
  it("no longer ships the currentColor mono icon", () => {
    expect(existsSync(src("icon-mono.svg"))).toBe(false);
  });

  it("declares identity as a package entry point", () => {
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    expect(pkg.exports["./identity/*"], "identity not in the exports map").toBe("./dist/identity/*");
  });
});
