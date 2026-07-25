import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, cpSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const R = (p) => join(root, p);
const read = (p) => readFileSync(R(p), "utf8");

// 1. Run the main design-system build so dist/ is fresh.
execFileSync(process.execPath, [R("scripts/build.mjs")], { stdio: "inherit" });

// 2. Assemble section HTML (sorted) and inject into gallery/index.html.
const sectionsDir = R("gallery/sections");
const sectionFiles = readdirSync(sectionsDir).filter((f) => f.endsWith(".html")).sort();
const sectionsHtml = sectionFiles.map((f) => read(`gallery/sections/${f}`)).join("\n\n");

const indexHtml = read("gallery/index.html");
if (!indexHtml.includes("<!--SECTIONS-->")) {
  throw new Error("gallery/index.html is missing the <!--SECTIONS--> placeholder");
}
let injectedHtml = indexHtml.replace("<!--SECTIONS-->", sectionsHtml);

// 2b. Cache-bust local CSS/JS assets so browsers don't serve stale copies
// from disk cache when viewing gallery/dist/index.html over file://.
const v = Date.now();
injectedHtml = injectedHtml.replace(
  /(href|src)="(\.\/[^"?]+\.(?:css|js))"/g,
  `$1="$2?v=${v}"`
);

// 3. Prepare gallery/dist/ output directory.
rmSync(R("gallery/dist"), { recursive: true, force: true });
mkdirSync(R("gallery/dist"), { recursive: true });

writeFileSync(R("gallery/dist/index.html"), injectedHtml);

// 4. Bundle gallery.ts -> gallery/dist/gallery.js.
await build({
  entryPoints: [R("gallery/gallery.ts")],
  outfile: R("gallery/dist/gallery.js"),
  bundle: true,
  format: "iife",
  minify: true,
  target: ["es2022"],
});

// 5. Copy the design-system dist/ alongside the gallery so it's self-contained.
cpSync(R("dist"), R("gallery/dist/dist"), { recursive: true });

// 6. Copy the gallery-only stylesheet alongside the gallery.
cpSync(R("gallery/gallery.css"), R("gallery/dist/gallery.css"));

console.log("Built gallery → gallery/dist/");
