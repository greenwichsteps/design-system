import { initClipboard } from "./clipboard";
import { initTheme } from "./theme";
import { initNav } from "./nav";
import { initMenu } from "./menu";
import { initTabs } from "./tabs";
export { initClipboard, initTheme, initNav, initMenu, initTabs };
export function initAll(root: ParentNode = document): void {
  initClipboard(root); initTheme(root); initNav(root); initMenu(root); initTabs(root);
}
if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => initAll());
  else initAll();
}
