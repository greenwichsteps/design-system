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

describe("wordmark master", () => {
  const read = (f: string) => readFileSync(src(`burnside/${f}`), "utf8");

  // The defect this closes: the old file was <text font-family="GT America">.
  // An external SVG in an <img> is a separate document and cannot reach the host
  // page's @font-face rules, so it rendered in the visitor's UI font.
  it("carries outlines, not live text", () => {
    for (const f of ["wordmark.svg", "wordmark-light.svg", "wordmark-dark.svg"]) {
      expect(read(f), `${f} still contains live text`).not.toMatch(/<text[\s>]/);
      expect(read(f), `${f} has no path data`).toMatch(/<path[^>]*\sd="/);
      expect(read(f), `${f} still references a font family`).not.toContain("font-family");
    }
  });

  // 4251 x 1855 per-mille is the ink block: flush right on the letterforms with
  // the period hanging outside. A different viewBox means the construction moved.
  it("uses the settled ink viewBox", () => {
    for (const f of ["wordmark.svg", "wordmark-light.svg", "wordmark-dark.svg"]) {
      expect(read(f), `${f} viewBox is not the ink block`).toMatch(/viewBox="0 0 4251 1855"/);
    }
  });

  it("keeps the period a separate, accented element", () => {
    expect(read("wordmark.svg")).toContain("bs-dot");
    expect(read("wordmark.svg")).toContain("#FF4D9D");
  });

  it("makes the master self-inverting and the variants pinned", () => {
    expect(read("wordmark.svg")).toContain("prefers-color-scheme: dark");
    for (const f of ["wordmark-light.svg", "wordmark-dark.svg"]) {
      expect(read(f), `${f} carries a media query`).not.toContain("@media");
    }
    expect(read("wordmark-light.svg")).toContain("#121317");
    expect(read("wordmark-dark.svg")).toContain("#F4F2EE");
  });

  it("does not pin width or height", () => {
    for (const f of ["wordmark.svg", "wordmark-light.svg", "wordmark-dark.svg"]) {
      expect(read(f), `${f} pins width`).not.toMatch(/<svg[^>]*\swidth=/);
      expect(read(f), `${f} pins height`).not.toMatch(/<svg[^>]*\sheight=/);
    }
  });
});
