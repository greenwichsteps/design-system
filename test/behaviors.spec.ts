import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { initClipboard } from "../behaviors/clipboard";
import { initTheme } from "../behaviors/theme";
import { initNav } from "../behaviors/nav";
import { initStickyHeader } from "../behaviors/sticky-header";

beforeEach(() => { document.body.innerHTML = ""; document.documentElement.removeAttribute("data-theme"); document.documentElement.style.removeProperty("--ds-header-h"); localStorage.clear(); });
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

// jsdom has no IntersectionObserver and no layout, so both are stubbed. The
// callback is captured so the test can drive the intersection directly.
function stubIO() {
  const instances: Array<{ cb: IntersectionObserverCallback; target?: Element }> = [];
  class IO {
    cb: IntersectionObserverCallback;
    constructor(cb: IntersectionObserverCallback) { this.cb = cb; instances.push({ cb: this.cb }); }
    observe(target: Element) { instances[instances.length - 1].target = target; }
    disconnect() {}
    unobserve() {}
  }
  vi.stubGlobal("IntersectionObserver", IO);
  return {
    fire(isIntersecting: boolean) {
      instances.forEach((i) => i.cb([{ isIntersecting } as IntersectionObserverEntry], {} as IntersectionObserver));
    },
  };
}

describe("sticky header", () => {
  it("adds is-scrolled when the sentinel leaves the viewport", () => {
    const io = stubIO();
    document.body.innerHTML = `<header class="ds-header"></header>`;
    initStickyHeader();
    const hdr = document.querySelector(".ds-header")!;
    expect(hdr.classList.contains("is-scrolled")).toBe(false);
    io.fire(false);
    expect(hdr.classList.contains("is-scrolled")).toBe(true);
    io.fire(true);
    expect(hdr.classList.contains("is-scrolled")).toBe(false);
  });

  it("publishes the measured bar height as --ds-header-h", () => {
    stubIO();
    document.body.innerHTML = `<header class="ds-header"></header>`;
    const hdr = document.querySelector(".ds-header")! as HTMLElement;
    hdr.getBoundingClientRect = () => ({ height: 48 }) as DOMRect;
    initStickyHeader();
    expect(document.documentElement.style.getPropertyValue("--ds-header-h")).toBe("48px");
  });

  it("does nothing and does not throw when no header is present", () => {
    stubIO();
    document.body.innerHTML = `<div>no chrome here</div>`;
    expect(() => initStickyHeader()).not.toThrow();
    expect(document.documentElement.style.getPropertyValue("--ds-header-h")).toBe("");
  });

  it("survives an environment with no IntersectionObserver", () => {
    // Old Safari and any SSR pass. The height should still be published.
    vi.stubGlobal("IntersectionObserver", undefined);
    document.body.innerHTML = `<header class="ds-header"></header>`;
    const hdr = document.querySelector(".ds-header")! as HTMLElement;
    hdr.getBoundingClientRect = () => ({ height: 44 }) as DOMRect;
    expect(() => initStickyHeader()).not.toThrow();
    expect(document.documentElement.style.getPropertyValue("--ds-header-h")).toBe("44px");
  });

  it("does not accumulate sentinels or observers on a second call", () => {
    stubIO();
    document.body.innerHTML = `<header class="ds-header"></header>`;
    initStickyHeader();
    initStickyHeader();
    expect(document.querySelectorAll(".ds-header-sentinel").length).toBe(1);
  });
});
