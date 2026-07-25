export function initMenu(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>("[data-ds-menu]").forEach((menu) => {
    const trigger = menu.querySelector<HTMLElement>("[data-ds-menu-trigger]");
    const close = () => menu.classList.remove("is-open");
    trigger?.addEventListener("click", (e) => { e.stopPropagation(); menu.classList.toggle("is-open"); });
    document.addEventListener("click", (e) => { if (!menu.contains(e.target as Node)) close(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  });
}
