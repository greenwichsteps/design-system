export function initClipboard(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>("[data-ds-copy]").forEach((el) => {
    el.addEventListener("click", () => {
      const text = el.getAttribute("data-ds-copy") ?? "";
      void navigator.clipboard?.writeText(text);
      el.setAttribute("data-ds-copied", "1");
      setTimeout(() => el.removeAttribute("data-ds-copied"), 1200);
    });
  });
}
