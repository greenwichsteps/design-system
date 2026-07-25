export function initNav(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>("[data-ds-nav-toggle]").forEach((btn) => {
    const id = btn.getAttribute("data-ds-nav-toggle");
    btn.addEventListener("click", () => {
      const nav = document.querySelector(`[data-ds-nav="${id}"]`);
      nav?.classList.toggle("is-open");
    });
  });
}
