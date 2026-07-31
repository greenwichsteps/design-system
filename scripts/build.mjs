import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, cpSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const root = fileURLToPath(new URL("..", import.meta.url));
const R = (p) => join(root, p);
const read = (p) => readFileSync(R(p), "utf8");

rmSync(R("dist"), { recursive: true, force: true });
mkdirSync(R("dist/themes"), { recursive: true });

// ui.css — reset first, then every component alphabetically.
const comps = existsSync(R("components")) ? readdirSync(R("components")).filter((f) => f.endsWith(".css")).sort() : [];
const ordered = ["reset.css", ...comps.filter((f) => f !== "reset.css")];
writeFileSync(R("dist/ui.css"), ordered.map((f) => `/* ${f} */\n${read(`components/${f}`)}`).join("\n\n"));

// tokens.css — primitives then semantics.
writeFileSync(R("dist/tokens.css"), read("tokens/primitives.css") + "\n" + read("tokens/semantic.css"));

// themes + fonts.css + assets.
for (const f of readdirSync(R("themes"))) cpSync(R(`themes/${f}`), R(`dist/themes/${f}`));
cpSync(R("fonts.css"), R("dist/fonts.css"));
cpSync(R("fonts"), R("dist/fonts"), { recursive: true });
// Identity: copy the SVG sources, then generate every raster from the pinned
// variants. Rasters are build output committed to dist/, like the woff2 subset.
cpSync(R("identity"), R("dist/identity"), { recursive: true });
const { buildIdentity } = await import("./build-identity.mjs");
await buildIdentity(root);

// Two JS builds from two entry points, because the two consumption models want
// opposite things.
//
//   dist/ui.js   IIFE + `DS` global, built from behaviors/auto.ts, which initializes
//                on load. For <script src> users such as the gallery.
//   dist/ui.mjs  ESM named exports, built from behaviors/index.ts, which is
//                side-effect-free. For bundler users, who must be able to import one
//                behavior without silently running the rest (see GRE-128).
//
// Keep them pointed at different entries. Building ui.js from index.ts drops the
// auto-init and silently breaks every script-tag consumer.
if (existsSync(R("behaviors/index.ts"))) {
  const common = { bundle: true, minify: true, target: ["es2022"] };
  await build({ ...common, entryPoints: [R("behaviors/auto.ts")], outfile: R("dist/ui.js"), format: "iife", globalName: "DS" });
  await build({ ...common, entryPoints: [R("behaviors/index.ts")], outfile: R("dist/ui.mjs"), format: "esm" });

  // Type declarations. esbuild does not emit them, so tsc runs over behaviors/ into
  // dist/types/ and dist/ui.d.mts re-exports that tree. TypeScript resolves a
  // declaration adjacent to the .mjs it describes, so package.json needs no types
  // field and its exports map stays a plain string. GRE-130.
  //
  // The .js in the re-export is required, not stylistic: without it the shim itself
  // fails node16 resolution.
  execFileSync(R("node_modules/.bin/tsc"), ["-p", R("tsconfig.dist.json")], { cwd: root, stdio: "inherit" });
  writeFileSync(R("dist/ui.d.mts"), 'export * from "./types/index.js";\n');
} else {
  writeFileSync(R("dist/ui.js"), "export {};\n");
  writeFileSync(R("dist/ui.mjs"), "export {};\n");
  writeFileSync(R("dist/ui.d.mts"), "export {};\n");
}
console.log("Built design-system → dist/");
