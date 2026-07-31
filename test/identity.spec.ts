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

const ICON_GEOMETRY = [
  /<rect[^>]*x="1"[^>]*y="1"[^>]*width="30"[^>]*height="30"[^>]*rx="8"/,
  /<rect[^>]*x="6.2"[^>]*y="19.8"[^>]*width="6"[^>]*height="6"/,
  /<rect[^>]*x="13.2"[^>]*y="12.8"[^>]*width="6"[^>]*height="6"/,
  /<circle[^>]*cx="23.2"[^>]*cy="8.8"[^>]*r="3.4"/,
];

describe("icon masters", () => {
  const read = (f: string) => readFileSync(src(`burnside/${f}`), "utf8");

  it("keeps the established geometry in all three files", () => {
    for (const f of ["icon.svg", "icon-light.svg", "icon-dark.svg"]) {
      for (const re of ICON_GEOMETRY) {
        expect(read(f), `${f} lost geometry matching ${re}`).toMatch(re);
      }
    }
  });

  // Fixed width/height stop consumers sizing the mark. viewBox must remain.
  it("lets consumers control size", () => {
    for (const f of ["icon.svg", "icon-light.svg", "icon-dark.svg"]) {
      const svg = read(f);
      expect(svg, `${f} has no viewBox`).toMatch(/viewBox="0 0 32 32"/);
      expect(svg, `${f} pins width`).not.toMatch(/<svg[^>]*\swidth=/);
      expect(svg, `${f} pins height`).not.toMatch(/<svg[^>]*\sheight=/);
    }
  });

  it("makes the master self-inverting", () => {
    const svg = read("icon.svg");
    expect(svg, "master has no colour-scheme block").toContain("prefers-color-scheme: dark");
  });

  // resvg ignores every @media block, so the pinned variants are the only
  // valid rasteriser inputs. If they carried a query they would raster wrong.
  it("pins the variants with no media query at all", () => {
    for (const f of ["icon-light.svg", "icon-dark.svg"]) {
      expect(read(f), `${f} carries a media query and cannot be rastered reliably`)
        .not.toContain("@media");
    }
  });

  it("gives the variants different ink so dark mode is a real difference", () => {
    expect(read("icon-light.svg")).toContain("#121317");
    expect(read("icon-dark.svg")).toContain("#F4F2EE");
  });
});
