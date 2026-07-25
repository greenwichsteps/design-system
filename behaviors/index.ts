import { initClipboard } from "./clipboard";
import { initTheme } from "./theme";
import { initNav } from "./nav";
export { initClipboard, initTheme, initNav };
export function initAll(root: ParentNode = document): void {
  initClipboard(root); initTheme(root); initNav(root);
}
if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => initAll());
  else initAll();
}
