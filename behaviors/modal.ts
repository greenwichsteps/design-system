export function initModal(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>("[data-ds-modal-open]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-ds-modal-open");
      const dlg = document.querySelector<HTMLDialogElement>(`[data-ds-modal="${id}"]`);
      dlg?.showModal();
    });
  });
  root.querySelectorAll<HTMLDialogElement>("[data-ds-modal]").forEach((dlg) => {
    dlg.querySelectorAll<HTMLElement>("[data-ds-modal-close]").forEach((c) => c.addEventListener("click", () => dlg.close()));
    dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); }); // backdrop
  });
}
