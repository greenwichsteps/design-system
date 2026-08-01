import { describe, it, expect } from "vitest";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";

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

  // 4251 x 1870 per-mille is the ink block: flush right on the letterforms with
  // the period hanging outside. A different viewBox means the construction moved.
  it("uses the settled ink viewBox", () => {
    for (const f of ["wordmark.svg", "wordmark-light.svg", "wordmark-dark.svg"]) {
      expect(read(f), `${f} viewBox is not the ink block`).toMatch(/viewBox="0 0 4251 1870"/);
    }
  });

  // Regression for a real defect: the generator first pinned line 1's baseline
  // to cap height (710), but the d ascender reaches 725 and the i tittle
  // reaches 718 in this font, so cap height does not bound the line. That
  // shaved both flat. This doesn't just re-check the literal height above; it
  // walks each glyph's own path data, which a future tracking or font swap
  // could silently break again.
  //
  // Each glyph is `<path transform="translate(TX TY) scale(1 -1)" d="...">`.
  // The font's y-up path coordinates get flipped by scale(1 -1) and offset by
  // TY, so a local point at y=Y lands at global y = TY - Y. A cubic bezier
  // never exceeds the convex hull of its own on/off-curve points, so the
  // largest y-coordinate literally present in `d` is a sound upper bound on
  // how far the rendered curve reaches — no font access required, just the
  // committed SVG's own numbers. If TY - maxY dips below 0, that glyph's ink
  // renders above the viewBox's top edge and gets clipped.
  it("places no ink above the top edge of the viewBox", () => {
    for (const f of ["wordmark.svg", "wordmark-light.svg", "wordmark-dark.svg"]) {
      const svg = read(f);
      const paths = [
        ...svg.matchAll(/<path transform="translate\([-\d.]+ ([-\d.]+)\) scale\(1 -1\)" d="([^"]+)"/g),
      ];
      expect(paths.length, `${f} has no glyph paths to check`).toBeGreaterThan(0);
      for (const [, ty, d] of paths) {
        const coords = d.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
        const localYs = coords.filter((_, i) => i % 2 === 1);
        const maxLocalY = Math.max(...localYs);
        expect(Number(ty) - maxLocalY, `${f} clips a glyph: translate y=${ty}, ink reaches ${maxLocalY}`)
          .toBeGreaterThanOrEqual(0);
      }
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

describe("generated icon set", () => {
  const dist = (p: string) => join(root, "dist/identity/burnside", p);

  it("emits every raster the web platform asks for", () => {
    for (const f of [
      "favicon.ico", "apple-touch-icon.png", "maskable-192.png", "maskable-512.png",
      "icon-32.png", "icon-64.png", "icon-128.png", "icon-192.png", "icon-256.png",
      "icon-512.png", "site.webmanifest",
    ]) {
      expect(existsSync(dist(f)), `${f} not generated`).toBe(true);
    }
  });

  // A manifest listing a file that was never generated installs a PWA with a
  // blank icon and throws no error anywhere. Checking the files exist is not the
  // same as checking the manifest points at the ones that do.
  it("resolves every icon the manifest declares", () => {
    const m = JSON.parse(readFileSync(dist("site.webmanifest"), "utf8"));
    expect(m.icons.length, "manifest declares no icons").toBeGreaterThan(0);
    for (const icon of m.icons as { src: string }[]) {
      const name = icon.src.split("/").pop()!;
      expect(existsSync(dist(name)), `manifest references ${icon.src} which was not generated`)
        .toBe(true);
    }
  });

  // A silently cropped or mis-sized PNG still looks fine on its own, which is
  // exactly how it survives review. Assert the dimensions from the file header.
  it("writes each PNG at its declared size", () => {
    for (const [f, size] of [
      ["icon-32.png", 32], ["icon-512.png", 512],
      ["apple-touch-icon.png", 180], ["maskable-192.png", 192], ["maskable-512.png", 512],
    ] as const) {
      const buf = readFileSync(dist(f));
      // PNG IHDR: width at byte 16, height at byte 20, both big-endian uint32.
      expect(buf.readUInt32BE(16), `${f} width`).toBe(size);
      expect(buf.readUInt32BE(20), `${f} height`).toBe(size);
    }
  });

  it("writes a real multi-image ICO", () => {
    const ico = readFileSync(dist("favicon.ico"));
    expect(ico.subarray(0, 4).toString("hex"), "not an ICO container").toBe("00000100");
    expect(ico.readUInt16LE(4), "expected three sizes in the ICO").toBe(3);
  });

  it("declares the maskable icons in the manifest", () => {
    const m = JSON.parse(readFileSync(dist("site.webmanifest"), "utf8"));
    expect(m.name).toBe("Burnside Steps");
    const purposes = m.icons.map((i: { purpose?: string }) => i.purpose);
    expect(purposes, "no maskable purpose declared").toContain("maskable");
  });

  // Dimension assertions cannot see an alpha channel. Android's circular crop
  // reveals any transparency in a maskable icon, and iOS composites touch icons
  // onto black, so both must be fully opaque at the edges.
  it("makes the maskable and apple-touch icons opaque to the edge", () => {
    for (const f of ["maskable-192.png", "maskable-512.png", "apple-touch-icon.png"]) {
      const p = PNG.sync.read(readFileSync(dist(f)));
      const corners = [[0, 0], [p.width - 1, 0], [0, p.height - 1], [p.width - 1, p.height - 1]];
      for (const [x, y] of corners) {
        expect(p.data[((p.width * y + x) << 2) + 3], `${f} is transparent at ${x},${y}`).toBe(255);
      }
    }
  });

  it("keeps the plain icons transparent outside the tile", () => {
    const p = PNG.sync.read(readFileSync(dist("icon-512.png")));
    expect(p.data[3], "icon-512.png lost its transparent corner").toBe(0);
  });

  // A blank pink square passes every opacity assertion. Check the mark is
  // actually present, and centred where the safe-circle transform puts it.
  it("puts the mark inside the maskable field, not just colour", () => {
    const p = PNG.sync.read(readFileSync(dist("maskable-512.png")));
    const px = (x: number, y: number) => {
      const i = (p.width * y + x) << 2;
      return `#${[p.data[i], p.data[i + 1], p.data[i + 2]].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
    };
    // Centre of the middle step square after translate(3.2 3.2) scale(0.8):
    // (16.2, 15.8) in icon units -> 0.8*u + 3.2 -> (16.16, 15.84) of 32 -> px.
    const u = (n: number) => Math.round(((0.8 * n + 3.2) / 32) * p.width);
    expect(px(u(16.2), u(15.8)), "no dark ink at the middle step").toBe("#121317");
    expect(px(2, 2), "corner is not the tile colour").toBe("#ff4d9d");
  });
});
