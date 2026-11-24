import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// GRE-615: the app set, the patterns Burnside's dashboard is built from. Selectors
// are matched as whole entries in a rule's selector list with comments stripped, so
// a longer class name or a comment that names a class cannot satisfy a test.
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const css = readFileSync(join(root, "dist/ui.css"), "utf8");

type Rule = { selectors: string[]; body: string };

function stripComments(s: string): string {
  return s.replace(/\/\*[\s\S]*?\*\//g, "");
}

function parseRules(s: string): Rule[] {
  return [...s.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({
    selectors: m[1].split(",").map((x) => x.trim()),
    body: m[2],
  }));
}

// Returns the body of every `@media <query> { ... }` block, found by brace matching,
// plus the stylesheet with those blocks removed so flat rules never include them.
function splitMedia(s: string, query: string): { flat: string; media: string[] } {
  const head = `@media ${query}`;
  const media: string[] = [];
  let flat = "";
  let i = 0;
  while (i < s.length) {
    const at = s.indexOf(head, i);
    if (at === -1) { flat += s.slice(i); break; }
    flat += s.slice(i, at);
    const open = s.indexOf("{", at);
    let depth = 1;
    let j = open + 1;
    while (depth > 0 && j < s.length) {
      if (s[j] === "{") depth++;
      else if (s[j] === "}") depth--;
      j++;
    }
    media.push(s.slice(open + 1, j - 1));
    i = j;
  }
  return { flat, media };
}

const QUERY = "(max-width: 720px)";
const clean = stripComments(css);
const split = splitMedia(clean, QUERY);
const flatRules = parseRules(split.flat);
const mediaRules = split.media.flatMap(parseRules);

function decls(body: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const d of body.split(";")) {
    const k = d.indexOf(":");
    if (k === -1) continue;
    out[d.slice(0, k).trim()] = d.slice(k + 1).trim();
  }
  return out;
}

// Declarations of every flat rule whose selector list has `sel` as a whole entry.
function flat(sel: string): Record<string, string> {
  return Object.assign({}, ...flatRules.filter((r) => r.selectors.includes(sel)).map((r) => decls(r.body)));
}
function narrow(sel: string): Record<string, string> {
  return Object.assign({}, ...mediaRules.filter((r) => r.selectors.includes(sel)).map((r) => decls(r.body)));
}
function exists(sel: string, from = flatRules): boolean {
  return from.some((r) => r.selectors.includes(sel));
}

describe("app set: stack and radius scope", () => {
  it("spaces direct children with a stack gap that defaults to space-4", () => {
    expect(exists(".ds-stack > * + *")).toBe(true);
    expect(flat(".ds-stack > * + *")["margin-block-start"]).toBe("var(--ds-stack-gap, var(--ds-space-4))");
  });

  it("tight and loose only change the gap variable", () => {
    expect(flat(".ds-stack--tight")).toEqual({ "--ds-stack-gap": "var(--ds-space-2)" });
    expect(flat(".ds-stack--loose")).toEqual({ "--ds-stack-gap": "var(--ds-space-6)" });
  });

  it("never sets display on a stack rule", () => {
    const hits = flatRules.filter((r) => r.selectors.some((s) => /\.ds-stack\b/.test(s)) && "display" in decls(r.body));
    expect(hits).toEqual([]);
  });

  it("tightens the radii inside .ds-app only", () => {
    const d = flat(".ds-app");
    expect(d["--ds-radius-md"]).toBe("8px");
    expect(d["--ds-radius-lg"]).toBe("12px");
  });

  it("sorts app.css before badge.css in the published stylesheet", () => {
    const a = css.indexOf("/* app.css */");
    const b = css.indexOf("/* badge.css */");
    expect(a).toBeGreaterThanOrEqual(0);
    expect(b).toBeGreaterThan(a);
  });
});
