import { initClipboard } from "./clipboard";
import { initTheme } from "./theme";
import { initNav } from "./nav";
import { initMenu } from "./menu";
import { initTabs } from "./tabs";
import { initModal } from "./modal";
import { toast, initToast } from "./toast";
export { initClipboard, initTheme, initNav, initMenu, initTabs, initModal, toast, initToast };
export function initAll(root: ParentNode = document): void {
  initClipboard(root); initTheme(root); initNav(root); initMenu(root); initTabs(root); initModal(root); initToast(root);
}
// This module is deliberately side-effect-free, so a consumer can import one
// behavior without silently running the rest. That matters most for initTheme,
// which writes data-theme and reads localStorage: a page that follows the OS
// preference would be overridden with no error and no obvious cause.
// The auto-initializing entry point is ./auto, used for the script-tag build.
