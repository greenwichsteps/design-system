import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { initClipboard } from "../behaviors/clipboard";
import { initTheme } from "../behaviors/theme";
import { initNav } from "../behaviors/nav";

beforeEach(() => { document.body.innerHTML = ""; document.documentElement.removeAttribute("data-theme"); localStorage.clear(); });
afterEach(() => vi.unstubAllGlobals());

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

// jsdom's matchMedia always reports matches:false and ignores listeners, so the OS
// preference has to be stubbed to be testable at all.
function stubPrefersDark(matches: boolean) {
  const listeners: Array<() => void> = [];
  const mql = {
    matches,
    addEventListener: (_type: string, fn: () => void) => { listeners.push(fn); },
    removeEventListener: () => {},
  };
  vi.stubGlobal("matchMedia", () => mql);
  return { setOS(next: boolean) { mql.matches = next; listeners.forEach((fn) => fn()); } };
}

describe("theme, following the OS", () => {
  it("uses the OS preference when nothing is stored", () => {
    stubPrefersDark(true);
    initTheme();
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("sets light explicitly when the OS is light, so dark.css cannot linger", () => {
    stubPrefersDark(false);
    initTheme();
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("does not persist the OS preference, which would freeze the page against later changes", () => {
    stubPrefersDark(true);
    initTheme();
    expect(localStorage.getItem("ds-theme")).toBeNull();
  });

  it("follows the OS live when the visitor has not chosen", () => {
    const os = stubPrefersDark(false);
    initTheme();
    os.setOS(true);
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("lets an explicit stored choice win over the OS", () => {
    localStorage.setItem("ds-theme", "light");
    stubPrefersDark(true);
    initTheme();
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("keeps an explicit choice when the OS later changes", () => {
    const os = stubPrefersDark(false);
    document.body.innerHTML = `<button data-ds-theme-toggle>T</button>`;
    initTheme();
    document.querySelector("button")!.click();
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    os.setOS(false);
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
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
