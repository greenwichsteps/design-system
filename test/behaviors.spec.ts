import { describe, it, expect, vi, beforeEach } from "vitest";
import { initClipboard } from "../behaviors/clipboard";
import { initTheme } from "../behaviors/theme";
import { initNav } from "../behaviors/nav";

beforeEach(() => { document.body.innerHTML = ""; document.documentElement.removeAttribute("data-theme"); localStorage.clear(); });

describe("clipboard", () => {
  it("copies the data-ds-copy value on click", async () => {
    const writeText = vi.fn(async () => {});
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    document.body.innerHTML = `<button data-ds-copy="hello">Copy</button>`;
    initClipboard();
    document.querySelector("button")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(writeText).toHaveBeenCalledWith("hello");
  });
});
describe("theme toggle", () => {
  it("flips data-theme and persists", () => {
    document.body.innerHTML = `<button data-ds-theme-toggle>T</button>`;
    initTheme();
    document.querySelector("button")!.click();
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(localStorage.getItem("ds-theme")).toBe("dark");
  });
});
describe("nav toggle", () => {
  it("toggles is-open on the target nav", () => {
    document.body.innerHTML = `<button data-ds-nav-toggle="main">M</button><nav data-ds-nav="main"></nav>`;
    initNav();
    document.querySelector("button")!.click();
    expect(document.querySelector("nav")!.classList.contains("is-open")).toBe(true);
  });
});
