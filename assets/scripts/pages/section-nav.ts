// section-nav — behaviour for the "jump to section" FAB (partials/section-nav.html).
//
// The menu rows are real <a href="#id"> links carrying hx-boost="false", so the
// nav works with JavaScript off: the browser jumps, and CSS scroll-margin-top
// keeps the heading clear of the sticky navbar. This file only upgrades that —
// a smooth scroll, closing whichever surface launched it (the desktop FAB or
// the mobile navbar panel), and marking the section you are currently in.
//
// Shipped per page by partials/section-nav.html, not from the global bundle.

/** Close the desktop FAB and the mobile nav panel, whichever is open. */
function closeLaunchers(): void {
  document
    .querySelectorAll<HTMLDetailsElement>('[data-aux-fab][open], [data-mobile-nav][open]')
    .forEach((d) => d.removeAttribute('open'));
}

function init(): void {
  const triggers = Array.from(document.querySelectorAll<HTMLElement>('[data-section-goto]'));
  if (!triggers.length) return;

  triggers.forEach((el) => {
    el.addEventListener('click', (e) => {
      const id = el.getAttribute('data-section-goto');
      const target = id ? document.getElementById(id) : null;
      if (!target || !id) return; // no such heading — let a real href fall through
      e.preventDefault();
      closeLaunchers();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Keep the section linkable and the Back button sane, without the second
      // jump a plain hash assignment would cause.
      if (window.history.replaceState) window.history.replaceState(null, '', `#${id}`);
      // Land keyboard and screen-reader users in the section itself rather than
      // leaving them on the menu row they just activated.
      if (target.getAttribute('tabindex') === null) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    });
  });

  // Mark the section in view, the way chapter-select marks the current chapter.
  // Decorative only, so it is skipped where IntersectionObserver is missing.
  if (!('IntersectionObserver' in window)) return;
  const sections = triggers
    .map((el) => document.getElementById(el.getAttribute('data-section-goto') || ''))
    .filter((el): el is HTMLElement => !!el);
  if (!sections.length) return;

  const visible = new Set<string>();
  const mark = (): void => {
    // Topmost still-intersecting section wins; falling back to the first keeps
    // something marked when the page is scrolled above them all.
    const current = sections.find((s) => visible.has(s.id)) || sections[0];
    triggers.forEach((el) => {
      const on = el.getAttribute('data-section-goto') === current.id;
      if (el.classList.contains('aux-fab__row')) el.classList.toggle('aux-fab__row--current', on);
      if (on) el.setAttribute('aria-current', 'true');
      else el.removeAttribute('aria-current');
    });
  };

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) visible.add(entry.target.id);
        else visible.delete(entry.target.id);
      });
      mark();
    },
    // Bias the band toward the top of the viewport, so "current" is the section
    // being read rather than one just peeking in from the bottom.
    { rootMargin: '-20% 0px -70% 0px' },
  );
  sections.forEach((s) => io.observe(s));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export {}; // isolatedModules: this file is a module, not a global script
