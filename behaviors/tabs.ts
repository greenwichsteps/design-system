export function initTabs(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>("[data-ds-tabs]").forEach((group) => {
    const tabs = [...group.querySelectorAll<HTMLElement>("[data-ds-tab]")];
    const select = (id: string | null) => {
      tabs.forEach((t) => t.setAttribute("aria-selected", String(t.getAttribute("data-ds-tab") === id)));
      group.querySelectorAll<HTMLElement>("[data-ds-panel]").forEach((p) => {
        p.toggleAttribute("hidden", p.getAttribute("data-ds-panel") !== id);
      });
    };
    tabs.forEach((t) => t.addEventListener("click", () => select(t.getAttribute("data-ds-tab"))));
  });
}
