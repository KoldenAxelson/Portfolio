// Entry point. Each init() is idempotent so it can re-run after every hx-boost
// body swap (see htmx:afterSettle below).
import { initNav } from './nav';
import { initScrollTop } from './scrolltop';
import { initSidebar } from './sidebar';
import { initConstellation } from './constellation';
import { initProjectFilter } from './project-filter';
import { initPerfMeters } from './perf-meters';
import { initAiWidget } from './ai-widget';

declare global {
  interface Window {
    htmx?: { config: { globalViewTransitions?: boolean } };
  }
}

// Crossfade boosted navigations via the View Transitions API. Must be set before
// htmx processes the document.
if (window.htmx) {
  window.htmx.config.globalViewTransitions = true;
}

function initPage(): void {
  initNav();
  initScrollTop();
  initSidebar();
  initConstellation();
  initProjectFilter();
  initPerfMeters();
  initAiWidget();
}

function ready(fn: () => void): void {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fn);
  } else {
    fn();
  }
}

ready(initPage);

// hx-boost swaps <body> without a reload; re-bind handlers to the new DOM, then
// move focus to the new <main> so keyboard / screen-reader users land in the fresh
// content instead of being stranded on the now-removed link they activated.
// preventScroll: hx-boost already handles scroll position; don't fight it.
document.addEventListener('htmx:afterSettle', () => {
  initPage();
  document.getElementById('main')?.focus({ preventScroll: true });
});
