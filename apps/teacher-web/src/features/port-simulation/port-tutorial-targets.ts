/** Stable UI anchors shared by the coach, full-screen workspace and browser acceptance. */
export function tutorialElements(root: HTMLElement, key: string): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>("[data-tutorial-target]")).filter(el => el.dataset.tutorialTarget === key);
}
export function tutorialElement(root: HTMLElement, key: string): HTMLElement | undefined {
  const elements = tutorialElements(root, key);
  const onscreen = (el: HTMLElement) => { if (!el.getClientRects().length) return false; if (typeof el.getBoundingClientRect !== "function" || typeof window === "undefined") return true; const r=el.getBoundingClientRect(); return r.top>=0&&r.bottom<=window.innerHeight&&r.left>=0&&r.right<=window.innerWidth; };
  return elements.find(el => el.closest("[data-tutorial-rack]") && onscreen(el)) ?? elements.find(onscreen) ?? elements.find(el => el.getClientRects().length);
}
