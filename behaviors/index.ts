import { initClipboard } from "./clipboard.js";
import { initTheme } from "./theme.js";
import { initNav } from "./nav.js";
import { initStickyHeader } from "./sticky-header.js";
import { initMenu } from "./menu.js";
import { initTabs } from "./tabs.js";
import { initModal } from "./modal.js";
import { toast, initToast } from "./toast.js";
export { initClipboard, initTheme, initNav, initStickyHeader, initMenu, initTabs, initModal, toast, initToast };
export function initAll(root: ParentNode = document): void {
  initClipboard(root); initTheme(root); initNav(root); initStickyHeader(root); initMenu(root); initTabs(root); initModal(root); initToast(root);
}
// This module is deliberately side-effect-free, so a consumer can import one
// behavior without silently running the rest. That matters most for initTheme,
// which writes data-theme and reads localStorage: a page that follows the OS
// preference would be overridden with no error and no obvious cause.
// The auto-initializing entry point is ./auto, used for the script-tag build.
