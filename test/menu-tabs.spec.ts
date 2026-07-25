import { describe, it, expect, beforeEach } from "vitest";
import { initMenu } from "../behaviors/menu";
import { initTabs } from "../behaviors/tabs";
beforeEach(() => { document.body.innerHTML = ""; });

describe("menu", () => {
  it("opens on trigger and closes on Escape", () => {
    document.body.innerHTML = `<div data-ds-menu><button data-ds-menu-trigger>M</button><div data-ds-menu-list></div></div>`;
    initMenu();
    const menu = document.querySelector("[data-ds-menu]")!;
    (menu.querySelector("[data-ds-menu-trigger]") as HTMLElement).click();
    expect(menu.classList.contains("is-open")).toBe(true);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(menu.classList.contains("is-open")).toBe(false);
  });
});
describe("tabs", () => {
  it("selects a tab and shows its panel", () => {
    document.body.innerHTML = `<div data-ds-tabs>
      <button role="tab" data-ds-tab="a" aria-selected="true">A</button>
      <button role="tab" data-ds-tab="b" aria-selected="false">B</button>
      <div data-ds-panel="a"></div><div data-ds-panel="b" hidden></div></div>`;
    initTabs();
    (document.querySelector('[data-ds-tab="b"]') as HTMLElement).click();
    expect(document.querySelector('[data-ds-tab="b"]')!.getAttribute("aria-selected")).toBe("true");
    expect(document.querySelector('[data-ds-panel="b"]')!.hasAttribute("hidden")).toBe(false);
    expect(document.querySelector('[data-ds-panel="a"]')!.hasAttribute("hidden")).toBe(true);
  });
});
