import { describe, it, expect } from "vitest";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";

const root = join(__dirname, "..");
const src = (p: string) => join(root, "identity", p);

describe("identity layout", () => {
  it("namespaces every mark under a brand directory", () => {
    for (const f of ["burnside/icon.svg", "burnside/wordmark.svg", "farnsworth/icon.svg", "farnsworth/wordmark.svg"]) {
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
    // Not just "the string exists somewhere" -- the dark media block must
    // actually target the ink class. A block naming a class that doesn't
    // exist (typo'd, or left over from a rename) would pass a bare
    // `toContain("prefers-color-scheme: dark")` while doing nothing.
    expect(svg, "dark media block does not target .bs-ink")
      .toMatch(/@media \(prefers-color-scheme: dark\)[^}]*\.bs-ink/);
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
    // See the equivalent check on the icon master above: the block must
    // target .bs-word specifically, not just mention the media query anywhere.
    expect(read("wordmark.svg"), "dark media block does not target .bs-word")
      .toMatch(/@media \(prefers-color-scheme: dark\)[^}]*\.bs-word/);
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

  it("declares an installable manifest", () => {
    const m = JSON.parse(readFileSync(dist("site.webmanifest"), "utf8"));
    expect(m.name).toBe("Burnside Steps");
    // start_url and at least one ordinary (non-maskable) icon are two of
    // Chrome's four installability requirements. A manifest whose only 512px
    // entry is `purpose: "maskable"` -- with no plain entry -- fails
    // installability even though the file exists and the JSON is valid.
    expect(m.start_url, "no start_url -- Chrome will not offer to install this").toBe("/");
    const bySize = (size: string, purpose?: string) =>
      (m.icons as { sizes: string; purpose?: string }[]).some(
        (i) => i.sizes === size && (purpose ? i.purpose === purpose : i.purpose === undefined),
      );
    expect(bySize("192x192"), "no ordinary (non-maskable) 192px icon declared").toBe(true);
    expect(bySize("512x512"), "no ordinary (non-maskable) 512px icon declared").toBe(true);
    expect(bySize("192x192", "maskable"), "no maskable 192px icon declared").toBe(true);
    expect(bySize("512x512", "maskable"), "no maskable 512px icon declared").toBe(true);
  });

  // The forward check above (manifest -> file) only catches a manifest that
  // points at nothing. It says nothing about a raster that gets generated and
  // then never declared, which is exactly how icon-512.png shipped unused: the
  // file existed, "resolves every icon the manifest declares" passed, and the
  // manifest was still not installable. Walk file -> manifest too.
  it("declares every generated icon and maskable in the manifest", () => {
    const m = JSON.parse(readFileSync(dist("site.webmanifest"), "utf8"));
    const declared = new Set((m.icons as { src: string }[]).map((i) => i.src.split("/").pop()));
    const generated = readdirSync(dist("")).filter((f) => /^(icon|maskable)-.*\.png$/.test(f));

    // Allowlist: icon-32/64/128/256.png exist for HTML favicon links
    // (<link rel="icon" sizes="...">), not the web app manifest, which only
    // needs the sizes it actually installs at (192 and 512). If a size is
    // added here without being declared, it must be added to this allowlist
    // with a reason, or the test below will fail.
    const ALLOWLISTED_UNDECLARED = ["icon-32.png", "icon-64.png", "icon-128.png", "icon-256.png"];

    const undeclared = generated.filter((f) => !declared.has(f) && !ALLOWLISTED_UNDECLARED.includes(f));
    expect(undeclared, `generated but not declared in the manifest: ${undeclared.join(", ")}`).toEqual([]);
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

describe("share images", () => {
  const dist = (p: string) => join(root, "dist/identity/burnside", p);

  it("emits both canvases at their exact dimensions", () => {
    for (const [f, w, h] of [
      ["og-default.png", 1200, 630],
      ["github-social.png", 1280, 640],
    ] as const) {
      expect(existsSync(dist(f)), `${f} not generated`).toBe(true);
      const buf = readFileSync(dist(f));
      expect(buf.readUInt32BE(16), `${f} width`).toBe(w);
      expect(buf.readUInt32BE(20), `${f} height`).toBe(h);
    }
  });

  // A plain dark rectangle with no wordmark would pass every dimension and
  // padding assertion above. Sample a point inside the "B" stem's waist -- the
  // band between the glyph's two counters (local y 306-418 in wordmark-space),
  // where the stem is solid ink from x=0 out past x=169 with no hole to land
  // in. (86, 370) sits centred in that band: ~80 units of margin from the
  // nearest edge on every side, well clear of resvg's anti-aliasing fringe, so
  // small rounding differences in the layout math can't land it off the ink.
  it("actually renders the wordmark ink, not just the field", async () => {
    const { layoutShare } = await import("../scripts/lib/compose-share.mjs");
    const WM_X = 86, WM_Y = 370;
    for (const [f, w, h] of [
      ["og-default.png", 1200, 630],
      ["github-social.png", 1280, 640],
    ] as const) {
      const L = layoutShare(w, h);
      const x = Math.round(L.left + (WM_X / 4251) * L.inkW);
      const y = Math.round(L.top + (WM_Y / 1870) * L.inkH);
      const p = PNG.sync.read(readFileSync(dist(f)));
      const i = (p.width * y + x) << 2;
      const hex = `#${[p.data[i], p.data[i + 1], p.data[i + 2]]
        .map((v) => v.toString(16).padStart(2, "0"))
        .join("")}`;
      expect(hex, `${f} has no ink at (${x},${y}) -- wordmark missing or mispositioned`).toBe("#f4f2ee");
    }
  });
});

describe("share composition", () => {
  it("never lets padding fall below the floor on either axis", async () => {
    const { layoutShare } = await import("../scripts/lib/compose-share.mjs");
    for (const [w, h] of [[1200, 630], [1280, 640]] as const) {
      const L = layoutShare(w, h);
      expect(L.left, `${w}x${h} side padding below floor`).toBeGreaterThanOrEqual(84);
      expect(L.top, `${w}x${h} vertical padding below floor`).toBeGreaterThanOrEqual(84);
      // The block must fit, not overflow: a cropped share image still looks
      // fine in isolation, which is how it would survive review.
      expect(L.left * 2 + L.inkW, `${w}x${h} overflows horizontally`).toBeLessThanOrEqual(w + 1);
      expect(L.top * 2 + L.inkH, `${w}x${h} overflows vertically`).toBeLessThanOrEqual(h + 1);
    }
  });

  it("matches the settled sizes from the spec", async () => {
    const { layoutShare } = await import("../scripts/lib/compose-share.mjs");
    expect(layoutShare(1200, 630).size).toBe(242);
    expect(layoutShare(1280, 640).size).toBe(252);
  });
});

describe("the generated set is reproducible", () => {
  // Not a comparison against committed dist/: test/global-setup.ts rebuilds
  // dist/ before collection, so any such comparison is fresh-vs-fresh and
  // passes unconditionally. What is worth asserting, and what the whole
  // committed-artifact approach depends on, is that two builds of identical
  // sources produce identical bytes. A timestamp or a map iteration order
  // leaking into the PNGs would break that and make dist/ churn every build.
  it("produces byte-identical output from two independent builds", async () => {
    const { mkdtempSync, cpSync, readdirSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { buildIdentity } = await import("../scripts/build-identity.mjs");

    const build = async () => {
      const tmp = mkdtempSync(join(tmpdir(), "identity-"));
      cpSync(join(root, "identity"), join(tmp, "identity"), { recursive: true });
      return await buildIdentity(tmp);
    };

    const [a, b] = [await build(), await build()];
    const names = readdirSync(a).sort();
    expect(names.length, "generator produced nothing to compare").toBeGreaterThan(5);
    expect(readdirSync(b).sort(), "the two builds produced different file sets").toEqual(names);

    const differing = names.filter(
      (n) => Buffer.compare(readFileSync(join(a, n)), readFileSync(join(b, n))) !== 0,
    );
    expect(differing, `non-deterministic output: ${differing.join(", ")}`).toEqual([]);
  });
});

// The quarter-overlap is the whole idea of this mark, so it is asserted as
// arithmetic rather than trusted to a picture. Squares of side s offset by d
// share (s - d)^2; a quarter of s^2 requires d = s/2 exactly.
const FW_S = 13, FW_D = FW_S / 2, FW_L = 16 - (FW_S * 1.5) / 2, FW_T = 2.4;

describe("farnsworth icon masters", () => {
  const read = (f: string) => readFileSync(src(`farnsworth/${f}`), "utf8");
  const FILES = ["icon.svg", "icon-light.svg", "icon-dark.svg"];

  // Close to tautological on its own, since FW_D is defined as FW_S / 2 two lines
  // above: it mostly confirms floating-point arithmetic. Its real value is
  // narrow but real, catching a future edit that redefines FW_D independently of
  // FW_S. The geometry's actual correctness was established by deriving it from
  // raw coordinates during review, not by this assertion.
  it("derives from a half-size offset, so the overlap is a quarter of each square", () => {
    expect(FW_D).toBe(6.5);
    expect((FW_S - FW_D) ** 2).toBeCloseTo(FW_S ** 2 / 4, 10);
    expect(FW_L).toBe(6.25);
  });

  it("carries the settled path in every file", () => {
    const outline = `M${FW_L},${FW_L + FW_D}h${FW_S}v${FW_S}h-${FW_S}z`;
    const window_ = `M${FW_L + FW_T},${FW_L + FW_D + FW_T}h${FW_S - 2 * FW_T}v${FW_S - 2 * FW_T}h-${FW_S - 2 * FW_T}z`;
    const solid = `M${FW_L + FW_D},${FW_L}h${FW_S}v${FW_S}h-${FW_S}z`;
    for (const f of FILES) {
      const svg = read(f);
      expect(svg, `${f} lost the outline square`).toContain(outline);
      expect(svg, `${f} lost the frame window`).toContain(window_);
      expect(svg, `${f} lost the solid square`).toContain(solid);
      expect(svg, `${f} is not even-odd, so the overlaps will not knock out`)
        .toMatch(/fill-rule="evenodd"/);
    }
  });

  it("keeps the family tile", () => {
    for (const f of FILES) {
      expect(read(f), `${f} lost the tile`).toMatch(/<rect[^>]*x="1"[^>]*y="1"[^>]*width="30"[^>]*height="30"[^>]*rx="8"/);
    }
  });

  it("lets consumers control size", () => {
    for (const f of FILES) {
      const svg = read(f);
      expect(svg, `${f} has no viewBox`).toMatch(/viewBox="0 0 32 32"/);
      expect(svg, `${f} pins width`).not.toMatch(/<svg[^>]*\swidth=/);
      expect(svg, `${f} pins height`).not.toMatch(/<svg[^>]*\sheight=/);
    }
  });

  // Deliberately the opposite of the Burnside assertion above, and the reason
  // is worth reading before anyone "fixes" it. Burnside's ink is near-black on
  // a pink tile and flips to cream in dark mode, which is a stylistic choice.
  // Farnsworth's ink is white on an opaque indigo tile at 7.46:1. The tile
  // supplies its own ground, so there is nothing to invert and a flip would be
  // decoration. The variants are identical on purpose.
  it("has identical light and dark variants, because the tile is opaque", () => {
    expect(read("icon-light.svg")).toBe(read("icon-dark.svg"));
  });

  it("carries no media query anywhere, master included", () => {
    for (const f of FILES) {
      expect(read(f), `${f} has a media query that would do nothing`).not.toContain("@media");
    }
  });

  // Nothing else in this block pins the colours. Every other assertion checks a
  // shape, or checks the two variants against EACH OTHER, so a wrong but
  // mutually consistent hex in both would pass the lot. Burnside gets this
  // coverage as a side effect of asserting its light and dark inks differ;
  // Farnsworth's variants are identical by design, so that side effect is gone
  // and the values have to be pinned directly.
  it("uses the brand accent and a white ink, in every file", () => {
    for (const f of FILES) {
      expect(read(f), `${f} lost the accent`).toContain("#3B3BD9");
      expect(read(f), `${f} lost the white ink`).toContain("#FFFFFF");
    }
  });

  // A master whose class values drift from the pinned variants' literals would
  // render one thing in a browser and rasterise another, and nothing else in the
  // suite compares the two.
  it("keeps the master's class values and the pinned literals in step", () => {
    const master = read("icon.svg");
    const tile = master.match(/\.fw-tile\s*\{\s*fill:\s*(#[0-9A-Fa-f]{6})/)?.[1];
    const ink = master.match(/\.fw-ink\s*\{\s*fill:\s*(#[0-9A-Fa-f]{6})/)?.[1];
    expect(tile, "icon.svg declares no .fw-tile fill").toBeDefined();
    expect(ink, "icon.svg declares no .fw-ink fill").toBeDefined();
    for (const f of ["icon-light.svg", "icon-dark.svg"]) {
      expect(read(f), `${f} tile differs from the master's .fw-tile ${tile}`).toContain(`fill="${tile}"`);
      expect(read(f), `${f} ink differs from the master's .fw-ink ${ink}`).toContain(`fill="${ink}"`);
    }
  });

  it("no longer ships the placeholder", () => {
    expect(existsSync(src("farnsworth/placeholder.svg"))).toBe(false);
  });
});
