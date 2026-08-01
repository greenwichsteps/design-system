// Sticky header chrome. Two jobs, both cheap.
//
// 1. Toggle `is-scrolled` so the hairline arrives once the page moves. A 1px
//    sentinel plus IntersectionObserver does this without a scroll listener,
//    so there is no per-frame work on the main thread.
// 2. Publish the measured bar height as --ds-header-h, which reset.css feeds
//    into scroll-padding-top so anchor jumps clear the bar instead of tucking
//    under it. Measured rather than assumed, because the height moves with the
//    brand token and the viewport.
export function initStickyHeader(root: ParentNode = document): void {
  const header = root.querySelector<HTMLElement>(".ds-header");
  if (!header) return;

  // Unlike its neighbours in behaviors/, this function inserts a live DOM node
  // (the sentinel below) and constructs an IntersectionObserver, not just event
  // listeners. A second call on the same header (SPA route re-init, hot reload,
  // a test harness reusing a document) would leave sentinels and observers
  // physically accumulating in the tree, not just extra closures in memory, so
  // this guard is load-bearing in a way the un-guarded pattern elsewhere is not.
  // Do not remove it for consistency with the other behaviors.
  // The flag lives on the header element itself, so a genuinely different
  // .ds-header node (e.g. after the DOM is replaced) still gets initialized.
  if (header.dataset.dsSticky) return;
  header.dataset.dsSticky = "1";

  const publishHeight = () => {
    const h = Math.round(header.getBoundingClientRect().height);
    document.documentElement.style.setProperty("--ds-header-h", `${h}px`);
  };
  publishHeight();
  if (typeof window !== "undefined") window.addEventListener("resize", publishHeight, { passive: true });

  // Absent in older Safari and in any server-side pass. The height above is the
  // part that matters for correctness; the hairline is decoration.
  if (typeof IntersectionObserver === "undefined") return;

  const sentinel = document.createElement("div");
  sentinel.className = "ds-header-sentinel";
  sentinel.setAttribute("aria-hidden", "true");
  sentinel.style.cssText = "position:absolute;top:0;left:0;height:1px;width:1px;pointer-events:none;";
  header.parentNode?.insertBefore(sentinel, header);

  new IntersectionObserver((entries) => {
    // Only the sentinel is ever observed, so entries always has exactly one.
    header.classList.toggle("is-scrolled", !entries[0]!.isIntersecting);
  }).observe(sentinel);
}
