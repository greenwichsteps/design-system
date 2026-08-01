// Share image composition: the wordmark alone on a dark field.
//
// Every number is an INK measurement. The wordmark's viewBox is already the ink
// block (4251 x 1870 per-mille), so there is no invisible padding to compensate
// for here -- that was resolved when the master was generated.
//
// Padding is a FLOOR, not an exact value. The block's aspect is 2.29 while the
// two canvases are 1.90 and 2.00, so no single number is exact on both axes of
// both. Fit inside the padded box preserving aspect, then centre.
const INK_W = 4.251, INK_H = 1.870;
const PAD = 84;
const FIELD = "#121317";

export function layoutShare(w, h) {
  const boxW = w - 2 * PAD, boxH = h - 2 * PAD;
  const size = Math.floor(Math.min(boxW / INK_W, boxH / INK_H));
  const inkW = Math.round(INK_W * size), inkH = Math.round(INK_H * size);
  return { size, inkW, inkH, left: Math.round((w - inkW) / 2), top: Math.round((h - inkH) / 2) };
}

// The wordmark SVG is embedded rather than referenced: resvg resolves no
// external files, so a <use> or href would render nothing.
export function composeShare(wordmarkSvg, w, h) {
  const L = layoutShare(w, h);
  const inner = wordmarkSvg
    .replace(/^[\s\S]*?<svg[^>]*>/, "")
    .replace(/<\/svg>\s*$/, "");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <rect width="${w}" height="${h}" fill="${FIELD}"/>
  <svg x="${L.left}" y="${L.top}" width="${L.inkW}" height="${L.inkH}" viewBox="0 0 4251 1870">
    ${inner}
  </svg>
</svg>`;
}
