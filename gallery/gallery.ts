const sel = document.querySelector<HTMLSelectElement>("[data-gallery-brand]");
sel?.addEventListener("change", () => document.documentElement.setAttribute("data-theme-brand", sel.value));
document.documentElement.setAttribute("data-theme-brand", "burnside");
