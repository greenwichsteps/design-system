import { initAll } from "./index";

// Script-tag entry point. Re-exports everything so the `DS` global built from this
// file keeps the same shape it has always had, then initializes on load.
//
// Module consumers should import ./index instead, which is side-effect-free.
export * from "./index";

if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => initAll());
  else initAll();
}
