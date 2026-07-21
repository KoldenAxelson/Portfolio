// auxiliary-button — dismiss every floating FAB (<details data-aux-fab>) on
// outside-click / Escape. The <details> handles the open/close toggle itself;
// this only closes it when you click away or press Escape, so each FAB's markup
// stays declarative. Global, wired once from main.ts; live-queries the DOM so it
// survives hx-boost body swaps.

let bound = false;

export function initAuxButton(): void {
  if (bound) return;
  bound = true;

  document.addEventListener('click', (e) => {
    const target = e.target as Element | null;
    for (const fab of Array.from(document.querySelectorAll<HTMLDetailsElement>('[data-aux-fab][open]'))) {
      if (target && !fab.contains(target)) fab.open = false;
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    for (const fab of Array.from(document.querySelectorAll<HTMLDetailsElement>('[data-aux-fab][open]'))) {
      fab.open = false;
      const summary = fab.querySelector('summary');
      if (summary instanceof HTMLElement) summary.focus();
    }
  });
}
