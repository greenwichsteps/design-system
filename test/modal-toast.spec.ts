import { describe, it, expect, beforeEach, vi } from "vitest";
import { initModal } from "../behaviors/modal";
import { toast } from "../behaviors/toast";
beforeEach(() => { document.body.innerHTML = ""; });

describe("modal", () => {
  it("opens the targeted dialog on trigger", () => {
    document.body.innerHTML = `<button data-ds-modal-open="x">Open</button><dialog data-ds-modal="x"></dialog>`;
    const dlg = document.querySelector("dialog") as HTMLDialogElement;
    dlg.showModal = vi.fn(); dlg.close = vi.fn();
    initModal();
    (document.querySelector("[data-ds-modal-open]") as HTMLElement).click();
    expect(dlg.showModal).toHaveBeenCalled();
  });
});
describe("toast", () => {
  it("adds a toast into a region", () => {
    toast("saved");
    const region = document.querySelector(".ds-toast-region")!;
    expect(region.textContent).toContain("saved");
  });
});
