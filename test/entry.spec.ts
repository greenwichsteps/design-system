import { describe, it, expect } from "vitest";

// The barrel must be importable without doing anything. A consumer that wants one
// behavior should not silently get all of them, and above all should not get
// initTheme, which writes data-theme and reads localStorage.
describe("behaviors barrel", () => {
  it("initializes nothing on import", async () => {
    document.documentElement.removeAttribute("data-theme");
    await import("../behaviors/index");
    expect(document.documentElement.getAttribute("data-theme")).toBeNull();
  });

  it("exports the behaviors by name", async () => {
    const mod = await import("../behaviors/index");
    for (const fn of ["initClipboard", "initTheme", "initNav", "initMenu", "initTabs", "initModal", "initToast", "initAll"]) {
      expect(typeof (mod as Record<string, unknown>)[fn], `${fn} not exported`).toBe("function");
    }
  });
});
