export function toast(message: string, opts: { duration?: number } = {}): void {
  let region = document.querySelector(".ds-toast-region");
  if (!region) { region = document.createElement("div"); region.className = "ds-toast-region"; document.body.appendChild(region); }
  const el = document.createElement("div");
  el.className = "ds-toast"; el.setAttribute("role", "status"); el.textContent = message;
  region.appendChild(el);
  setTimeout(() => el.remove(), opts.duration ?? 4000);
}
export function initToast(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>("[data-ds-toast]").forEach((btn) =>
    btn.addEventListener("click", () => toast(btn.getAttribute("data-ds-toast") ?? "")));
}
