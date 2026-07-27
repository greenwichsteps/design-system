import { initAll } from "./index.js";

// Script-tag entry point. Re-exports everything so the `DS` global built from this
// file keeps the same shape it has always had, then initializes on load.
//
// Module consumers should import ./index instead, which is side-effect-free.
export * from "./index.js";

if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => initAll());
  else initAll();
}
