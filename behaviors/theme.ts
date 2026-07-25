export function initTheme(root: ParentNode = document): void {
  const saved = localStorage.getItem("ds-theme");
  if (saved === "dark" || saved === "light") document.documentElement.setAttribute("data-theme", saved);
  root.querySelectorAll<HTMLElement>("[data-ds-theme-toggle]").forEach((el) => {
    el.addEventListener("click", () => {
      const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem("ds-theme", next);
    });
  });
}
