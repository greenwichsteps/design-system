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

  // Apple ignores transparency and the manifest; it wants a plain square.
  out("apple-touch-icon.png", render(light, 180));

  // Maskable icons are cropped to a circle by Android, so the mark needs a
  // safe zone: the spec's tile already insets 1/32, which is not enough. Pad
  // to the 80% safe area by scaling the tile inside a larger canvas.
  const maskable = light.replace(
    'viewBox="0 0 32 32"',
    'viewBox="-4 -4 40 40"',
  );
  out("maskable-192.png", render(maskable, 192));
  out("maskable-512.png", render(maskable, 512));

  const ico = await pngToIco(ICO_SIZES.map((s) => render(light, s)));
  out("favicon.ico", ico);

  out("site.webmanifest", JSON.stringify({
    name: "Burnside Steps",
    short_name: "Burnside",
    icons: [
      { src: "/identity/burnside/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/identity/burnside/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/identity/burnside/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    theme_color: "#FF4D9D",
    background_color: "#121317",
    display: "standalone",
  }, null, 2) + "\n");

  return outDir;
}
