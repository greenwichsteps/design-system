# `.ds-lede` and `.ds-note` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Status:** executed 2026-11-23, released as v0.8.0. Linear: GRE-597.

**Goal:** Add two text-role classes to the kit, `.ds-lede` (subtitle under a heading) and `.ds-note` (small print), and release them as v0.8.0.

**Architecture:** Two rules appended to `components/type.css`; `scripts/build.mjs` already concatenates every component into `dist/ui.css`, so no build change. A gallery section demonstrates all four text roles. Tests pin the published CSS, the gallery, and muted-text contrast.

**Tech Stack:** plain CSS, Vitest 5 + jsdom, esbuild build script, pnpm.

**Spec:** `docs/superpowers/specs/2026-11-23-lede-and-note-design.md`

## Global Constraints

- `.ds-lede { font-size: var(--ds-text-lg); color: var(--ds-text-muted); line-height: 1.4; margin-top: var(--ds-space-3); }`
- `.ds-note { font-size: var(--ds-text-sm); color: var(--ds-text-muted); }`
- `.ds-lede` has no `max-width`, no `text-align`, no auto margins.
- `components/hero.css` is not modified. `.ds-hero__lede` must look exactly as it does today.
- No new dependencies. Release is v0.8.0 (minor: new classes).
- Branch: `lee/gre-597-lede-and-note`. Every commit ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Cascade order.** `dist/ui.css` concatenates alphabetically, so `type.css` loads after `hero.css`. A selector in the new rules that also matches `.ds-hero__lede` (or any hero child) would silently override the hero. Task 1 asserts the new rules' selectors are exactly `.ds-lede` and `.ds-note`, and that the hero rule is byte-identical to today's.
2. **`.ds-note` inside an invalid field.** A note must not turn red. Task 1 asserts no rule in `dist/ui.css` whose selector list mentions `ds-note` sets `color` to `--ds-danger`. (This is a negative assertion: Task 1 also mutates it once to prove it can fail.)
3. **Dark mode.** The muted colour is theme-dependent. Task 1's contrast test resolves `--ds-text-muted`, `--ds-bg` and `--ds-surface` through `tokens/` and `themes/dark.css`, not hard-coded hex.
4. **A matcher that also passes on the wrong thing.** A substring check for `.ds-lede` also matches `.ds-lede-foo` or a comment. Tests strip comments and match whole selectors.
5. **Gallery shows the roles together.** A gallery that demonstrates `.ds-lede` alone would not show the difference from `.ds-help`. Task 2 asserts all four roles appear in one section.

---

### Task 1: The two classes, their contract, and muted contrast

**Files:**
- Modify: `components/type.css` (append two rules)
- Modify: `test/dist-contract.spec.ts` (new `it` blocks in the existing `describe`)
- Create: `test/muted-contrast.spec.ts`
- Rebuilt by the build: `dist/ui.css` (committed)

**Interfaces:**
- Produces: CSS classes `.ds-lede`, `.ds-note` in `dist/ui.css`, used by Task 2's gallery.

- [ ] **Step 1: Write the failing contract tests** in `test/dist-contract.spec.ts`. Add a helper in the file: `rules(css): Array<{ selectors: string[]; body: string }>`, which strips `/* */` comments, matches `([^{}]+)\{([^{}]*)\}`, and splits selectors on commas, trimmed. (Same approach as `block()` in `test/contrast.spec.ts`; `ui.css` has `@media` blocks, so only flat rules are matched, which is fine for these selectors.)

```ts
it("ships .ds-lede with the spec's declarations", () => {
  const r = rules(read("dist/ui.css")).filter((x) => x.selectors.includes(".ds-lede"));
  expect(r).toHaveLength(1);
  expect(r[0].selectors).toEqual([".ds-lede"]);
  for (const d of ["font-size: var(--ds-text-lg)", "color: var(--ds-text-muted)", "line-height: 1.4", "margin-top: var(--ds-space-3)"])
    expect(r[0].body).toContain(d);
  expect(r[0].body).not.toMatch(/max-width|text-align|margin:\s|auto/);
});

it("ships .ds-note with the spec's declarations", () => {
  const r = rules(read("dist/ui.css")).filter((x) => x.selectors.includes(".ds-note"));
  expect(r).toHaveLength(1);
  expect(r[0].selectors).toEqual([".ds-note"]);
  expect(r[0].body).toContain("font-size: var(--ds-text-sm)");
  expect(r[0].body).toContain("color: var(--ds-text-muted)");
});

it("never colours a note as an error", () => {
  const hits = rules(read("dist/ui.css")).filter((x) => x.selectors.some((s) => /\bds-note\b/.test(s)) && /--ds-danger/.test(x.body));
  expect(hits).toEqual([]);
});

it("leaves the hero lede exactly as v0.7.1 shipped it", () => {
  const r = rules(read("dist/ui.css")).filter((x) => x.selectors.includes(".ds-hero__lede"));
  expect(r).toHaveLength(1);
  expect(r[0].body.trim()).toBe("color: var(--ds-text-muted); max-width: 46ch; margin: var(--ds-space-4) auto 0;");
});
```

`read(p)` is `readFileSync(join(root, p), "utf8")`; add it if the file has none.

- [ ] **Step 2: Run them.** `pnpm test -- dist-contract` → the two "ships" tests FAIL (`toHaveLength(1)`, got 0); the other two PASS.

- [ ] **Step 3: Write `test/muted-contrast.spec.ts`.** Reuse the WCAG `ratio()` from `test/contrast.spec.ts` (copy the three lines; extracting a shared module is out of scope). Resolve tokens by reading `tokens/primitives.css`, `tokens/semantic.css` and `themes/dark.css`, collecting `--name: value;` declarations into a light map (primitives + semantic) and a dark map (light map overlaid with dark.css), and following `var(--x)` aliases until a 6-digit hex. Throw if a value is neither.

```ts
it.each([
  ["light", "--ds-bg"], ["light", "--ds-surface"],
  ["dark", "--ds-bg"], ["dark", "--ds-surface"],
])("muted text clears AA on %s %s", (theme, surface) => {
  const t = theme === "light" ? light : dark;
  expect(ratio(resolve(t, "--ds-text-muted"), resolve(t, surface))).toBeGreaterThanOrEqual(4.5);
});

it("resolves through the theme rather than a fixed hex", () => {
  expect(resolve(light, "--ds-text-muted")).toBe("#6E6C66");
  expect(resolve(dark, "--ds-text-muted")).toBe("#8A8891");
});
```

Expected ratios, for the reviewer: 4.69, 5.25, 5.31, 4.81. `--ds-surface-raised` is deliberately absent (4.37, filed as GRE-598); a comment in the file says so.

- [ ] **Step 4: Run it.** `pnpm test -- muted-contrast` → PASS (tokens already meet it; this pins them).

- [ ] **Step 5: Append the two rules to `components/type.css`**, exactly as in Global Constraints, after `.ds-quote`, with a one-line comment above each naming its role (lede: "the one sentence under a heading"; note: "small print; unlike .ds-help it is not tied to a form field").

- [ ] **Step 6: Run the full suite.** `pnpm test` → all PASS, including the two new contract tests. `git diff --stat dist/` shows only `dist/ui.css` changed.

- [ ] **Step 7: Prove the negative test can fail.** Temporarily append `.ds-field[data-invalid] .ds-note { color: var(--ds-danger); }` to `components/form.css`, run `pnpm test -- dist-contract` → "never colours a note as an error" FAILS. Remove the line with an Edit (not `git checkout`), rerun → PASS.

- [ ] **Step 8: Commit.**

```bash
git add components/type.css dist/ui.css test/dist-contract.spec.ts test/muted-contrast.spec.ts
git commit -m "feat: .ds-lede and .ds-note text roles (GRE-597)"
```

### Task 2: Gallery section for the four text roles

**Files:**
- Create: `gallery/sections/text-roles.html`
- Modify: `test/gallery.spec.ts`

**Interfaces:**
- Consumes: `.ds-lede`, `.ds-note` from Task 1; `.ds-field` / `.ds-label` / `.ds-input` / `.ds-help` markup as used in `gallery/sections/form.html`.

- [ ] **Step 1: Write the failing test** in `test/gallery.spec.ts`:

```ts
it("demonstrates all four text roles together in one section", () => {
  const html = readFileSync(join(root, "gallery/sections/text-roles.html"), "utf8").replace(/<!--[\s\S]*?-->/g, "");
  for (const cls of ["ds-lede", "ds-note", "ds-help"])
    expect(html).toMatch(new RegExp(`class="[^"]*\\b${cls}\\b[^"]*"`));
  expect(html).toMatch(/<p>[^<]+<\/p>/); // a plain, unclassed paragraph
  expect(html).toMatch(/class="[^"]*\bds-field\b/); // the hint sits in a real field
});
```

- [ ] **Step 2: Run it.** `pnpm test -- gallery` → FAIL (ENOENT).

- [ ] **Step 3: Create `gallery/sections/text-roles.html`:** `<section id="text-roles">`, `<h2>Text roles</h2>`, then a `.ds-h1` heading followed by a `.ds-lede`, a plain `<p>`, a `.ds-note`, and one `.ds-field` with a label, input and `.ds-help` hint. Each sample's text says which role it is and when to use it, so the gallery doubles as the usage guide (copy from the spec's table).

- [ ] **Step 4: Run.** `pnpm test` → all PASS. `pnpm build:gallery` succeeds.

- [ ] **Step 5: Look at it.** Open the built gallery in a browser, light and dark. Lede is visibly larger than the paragraph; note and hint match each other and are smaller. Screenshot both themes for the PR.

- [ ] **Step 6: Commit.**

```bash
git add gallery/sections/text-roles.html test/gallery.spec.ts
git commit -m "docs(gallery): text roles section for lede, note, paragraph and hint (GRE-597)"
```

### Task 3: Release v0.8.0

**Files:**
- Modify: `package.json` (`"version": "0.8.0"`)
- Modify: `README.md` (new `## v0.8.0` section above `## v0.7.1`)

- [ ] **Step 1: README section.** Title: `## v0.8.0: text roles, .ds-lede and .ds-note`. Contents: the four-row table from the spec; that `.ds-help` is only for a hint attached to a form field; that `.ds-hero__lede` is unchanged (16px) and is not an alias of `.ds-lede` (20px); that the release only adds, so upgrading changes no existing page.

- [ ] **Step 2: Bump version, rebuild, test.** `pnpm build && pnpm test` → all PASS; `git status` shows no `dist/` change beyond Task 1's.

- [ ] **Step 3: Commit, merge, tag, push.**

```bash
git add package.json README.md
git commit -m "release: v0.8.0, text roles"
git switch main && git merge --no-ff lee/gre-597-lede-and-note -m "Merge v0.8.0: .ds-lede and .ds-note (GRE-597)"
git tag v0.8.0 && git push origin main v0.8.0
```

- [ ] **Step 4: Close the loop.** Mark GRE-597 Done with the tag. Comment on GRE-596 that v0.8.0 is out and Burnside's pin (a SHA, `ffc84a2`, in the root `package.json`) must move to `#v0.8.0` as part of that sweep.
