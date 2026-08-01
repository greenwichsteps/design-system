// Share image composition: the wordmark alone on a dark field.
//
// The wordmark's viewBox is already the ink block, so there is no invisible
// padding to compensate for here -- that was resolved when the master was
// generated. composeShare derives the ink's width/height from the viewBox of
// the SVG it is actually handed, rather than stating them as a constant that
// can drift out of sync with the source. That drift already happened once: an
// earlier hardcoded height (1855) clipped the "d" ascender flat, a defect
// invisible at a glance because the result is nearly right.
//
// Padding is a FLOOR, not an exact value: the ink block's aspect and the two
// output canvases' aspects (1200x630 and 1280x640) don't all match, so no
// single number is exact on every axis of both. Fit inside the padded box
// preserving aspect, then centre.
const PAD = 84;
const FIELD = "#121317";

// Defaults mirror the current wordmark viewBox (4251 x 1870 per-mille) so
// direct callers -- tests probing padding/sizing math in isolation -- don't
// need a real wordmark SVG on hand. composeShare below never relies on these;
// it always derives inkW/inkH fresh from the SVG it is given.
const DEFAULT_INK_W = 4.251, DEFAULT_INK_H = 1.870;

export function layoutShare(w, h, inkW = DEFAULT_INK_W, inkH = DEFAULT_INK_H) {
  const boxW = w - 2 * PAD, boxH = h - 2 * PAD;
  const size = Math.floor(Math.min(boxW / inkW, boxH / inkH));
  const outW = Math.round(inkW * size), outH = Math.round(inkH * size);
  return { size, inkW: outW, inkH: outH, left: Math.round((w - outW) / 2), top: Math.round((h - outH) / 2) };
}

// The wordmark SVG is embedded rather than referenced: resvg resolves no
// external files, so a <use> or href would render nothing.
export function composeShare(wordmarkSvg, w, h) {
  const viewBoxMatch = wordmarkSvg.match(/<svg[^>]*\sviewBox="0 0 (\d+) (\d+)"/);
  if (!viewBoxMatch) {
    throw new Error("composeShare: wordmarkSvg has no `viewBox=\"0 0 W H\"` to derive ink dimensions from");
  }
  const [, vbW, vbH] = viewBoxMatch;
  const inkW = Number(vbW) / 1000, inkH = Number(vbH) / 1000;

  const L = layoutShare(w, h, inkW, inkH);
  const inner = wordmarkSvg
    .replace(/^[\s\S]*?<svg[^>]*>/, "")
    .replace(/<\/svg>\s*$/, "");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <rect width="${w}" height="${h}" fill="${FIELD}"/>
  <svg x="${L.left}" y="${L.top}" width="${L.inkW}" height="${L.inkH}" viewBox="0 0 ${vbW} ${vbH}">
    ${inner}
  </svg>
</svg>`;
}
