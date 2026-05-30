// Unified, boost-aware entry. Loaded once from <head> so it survives hx-boost
// body swaps. Each init feature-detects its own DOM and is safe to re-run:
// global window/document listeners are wired once inside the modules, so
// re-running only (re)binds element-level handlers to the freshly-swapped DOM.
import { initNav } from './nav';
import { initScrollTop } from './scrolltop';
import { initSidebar } from './sidebar';
import { initProjectFilter } from './project-filter';

// Cross-page fade on boosted navigation. Wraps each hx-boost body swap in the
// browser's native View Transitions API (document.startViewTransition), which
// crossfades old → new. Pure progressive enhancement: browsers without the API
// just get the existing instant swap, and the CSS honors prefers-reduced-motion.
// Must be set before htmx processes the document. `htmx` is the global from the
// self-hosted vendor script loaded earlier in <head>.
declare global {
  interface Window {
    htmx?: { config: { globalViewTransitions?: boolean } };
  }
}
if (window.htmx) {
  window.htmx.config.globalViewTransitions = true;
}

function initPage(): void {
  initNav();
  initScrollTop();
  initSidebar();
  initProjectFilter();
}

function ready(fn: () => void): void {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fn);
  } else {
    fn();
  }
}

ready(initPage);

// hx-boost swaps the <body> without a full reload, so re-bind element-level
// interactivity to the new DOM after each boosted navigation settles.
document.addEventListener('htmx:afterSettle', initPage);
