import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, cpSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

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
cpSync(R("identity"), R("dist/identity"), { recursive: true });

// ui.js — bundle behaviors (Task 7+). Entry is optional until behaviors exist.
if (existsSync(R("behaviors/index.ts"))) {
  await build({ entryPoints: [R("behaviors/index.ts")], outfile: R("dist/ui.js"), bundle: true, format: "iife", globalName: "DS", minify: true, target: ["es2022"] });
} else {
  writeFileSync(R("dist/ui.js"), "export {};\n");
}
console.log("Built design-system → dist/");
