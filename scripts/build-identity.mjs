// Rasterises the committed identity SVGs into dist/identity/<brand>/.
//
// Inputs are the PINNED -light and -dark variants, never the self-inverting
// master: resvg applies <style> class rules but ignores every @media block,
// including @media all. Rastering the master would silently produce the light
// variant with no error.
//
// Output is byte-deterministic, which is what makes the drift guard in
// test/identity.spec.ts viable.
import { Resvg } from "@resvg/resvg-js";
import pngToIco from "png-to-ico";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { composeShare } from "./lib/compose-share.mjs";

// 192 is here because the manifest references icon-192.png. Removing it from
// this list leaves a manifest pointing at a file that was never generated, which
// no test would catch unless it resolves every manifest entry.
const ICON_PNG_SIZES = [32, 64, 128, 192, 256, 512];
const ICO_SIZES = [16, 32, 48];

export function render(svg, width) {
  const img = new Resvg(svg, { fitTo: { mode: "width", value: width } }).render();
  return img.asPng();
}

export async function buildIdentity(root, brand = "burnside") {
  const src = (f) => join(root, "identity", brand, f);
  const outDir = join(root, "dist/identity", brand);
  mkdirSync(outDir, { recursive: true });
  const out = (f, buf) => writeFileSync(join(outDir, f), buf);

  const light = readFileSync(src("icon-light.svg"), "utf8");

  for (const s of ICON_PNG_SIZES) out(`icon-${s}.png`, render(light, s));

  // The ink shapes alone, without the inset rounded background tile: both the
  // apple-touch and maskable variants below need a full-bleed background
  // behind this same ink, not the tile's 1-unit inset and rx="8" corners.
  //
  // Excluding the tile by its rx attribute is format-sensitive: a quoting or
  // attribute-order change would silently include the tile as ink, or match
  // nothing at all and emit a blank pink square. Neither crashes, and neither
  // is visible to an opacity check, so assert the shape count here.
  const INK_SHAPES = light.match(/<(rect|circle)(?![^>]*rx="8")[^>]*\/>/g) ?? [];
  if (INK_SHAPES.length !== 3) {
    throw new Error(
      `expected 3 ink shapes in icon-light.svg, found ${INK_SHAPES.length}. ` +
      `The tile-exclusion regex is format-sensitive; check the source markup.`,
    );
  }
  const INK = INK_SHAPES.join("\n  ");

  // iOS ignores transparency and composites touch icons onto black, so the
  // rounded tile's transparent corners would render black on the home screen.
  // iOS rounds the corners itself; the source must be a full-bleed square.
  const appleTouch = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" fill="#FF4D9D"/>
  ${INK}
</svg>`;
  out("apple-touch-icon.png", render(appleTouch, 180));

  // Maskable icons are cropped to a circle by Android, so the background must
  // bleed to the canvas edge (transparency inside the crop shows as a hole) and
  // the content must sit inside the 80% safe circle. Built from the tile
  // colour plus the ink shapes, rather than scaling the inset rounded tile.
  const maskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" fill="#FF4D9D"/>
  <g transform="translate(3.2 3.2) scale(0.8)">
  ${INK}
  </g>
</svg>`;
  out("maskable-192.png", render(maskable, 192));
  out("maskable-512.png", render(maskable, 512));

  const ico = await pngToIco(ICO_SIZES.map((s) => render(light, s)));
  out("favicon.ico", ico);

  out("site.webmanifest", JSON.stringify({
    name: "Burnside Steps",
    short_name: "Burnside",
    start_url: "/",
    icons: [
      { src: "/identity/burnside/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/identity/burnside/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/identity/burnside/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/identity/burnside/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    theme_color: "#FF4D9D",
    background_color: "#121317",
    display: "standalone",
  }, null, 2) + "\n");

  // Share images use the DARK wordmark variant, because the field is #121317.
  // The self-inverting master would raster in its light colours and vanish.
  const wordmarkDark = readFileSync(src("wordmark-dark.svg"), "utf8");
  out("og-default.png", render(composeShare(wordmarkDark, 1200, 630), 1200));
  out("github-social.png", render(composeShare(wordmarkDark, 1280, 640), 1280));

  return outDir;
}
