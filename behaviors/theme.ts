const KEY = "ds-theme";

export function initTheme(root: ParentNode = document): void {
  // Precedence: an explicit stored choice always wins. Failing that, follow the OS,
  // and keep following it. The OS preference is deliberately NOT persisted; a stored
  // value is indistinguishable from an explicit choice and would freeze the page
  // against the visitor's later system changes.
  const mql = typeof matchMedia === "function" ? matchMedia("(prefers-color-scheme: dark)") : null;

  const set = (v: "dark" | "light") => document.documentElement.setAttribute("data-theme", v);
  const stored = (): "dark" | "light" | null => {
    const v = localStorage.getItem(KEY);
    return v === "dark" || v === "light" ? v : null;
  };
  // Always sets an explicit value rather than clearing the attribute: dark.css selects
  // on [data-theme="dark"], so an unset attribute would strand a previously-dark page.
  const followOS = () => { if (!stored()) set(mql?.matches ? "dark" : "light"); };

  const choice = stored();
  if (choice) set(choice);
  else followOS();

  mql?.addEventListener("change", followOS);

  root.querySelectorAll<HTMLElement>("[data-ds-theme-toggle]").forEach((el) => {
    el.addEventListener("click", () => {
      const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      set(next);
      localStorage.setItem(KEY, next);
    });
  });
}
