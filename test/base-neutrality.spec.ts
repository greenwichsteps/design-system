import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = join(__dirname, "..");
const baseFiles = () => {
  const files = ["tokens/primitives.css", "tokens/semantic.css"];
  const comps = join(root, "components");
  if (existsSync(comps)) for (const f of readdirSync(comps)) if (f.endsWith(".css")) files.push(`components/${f}`);
  return files;
};

describe("shared base is project-neutral", () => {
  it("contains no 'burnside' anywhere in the shared base", () => {
    for (const rel of baseFiles()) {
      const text = readFileSync(join(root, rel), "utf8").toLowerCase();
      expect(text.includes("burnside"), `${rel} must not mention a project`).toBe(false);
    }
  });
  it("components reference only semantic/primitive tokens, never a raw hex", () => {
    const comps = join(root, "components");
    if (!existsSync(comps)) return;
    for (const f of readdirSync(comps)) {
      if (!f.endsWith(".css")) continue;
      const text = readFileSync(join(comps, f), "utf8");
      // no raw color literals in component CSS — colors must come from var(--ds-*)
      expect(/#[0-9a-fA-F]{3,8}\b|(?:rgba?|hsla?)\(/.test(text), `${f} must use var(--ds-*), not raw colors`).toBe(false);
    }
  });
  it("primitives define the migrated accent-free neutral palette", () => {
    const p = readFileSync(join(root, "tokens/primitives.css"), "utf8");
    expect(p).toContain("--ds-ink: #121317");
    expect(p).toContain("--ds-paper: #F4F2EC");
    expect(p).not.toContain("#FF4D9D"); // accent lives in the theme, not primitives
  });
});
