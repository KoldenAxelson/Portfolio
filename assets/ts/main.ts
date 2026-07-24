// Entry point. Each init() is idempotent so it can re-run after every hx-boost
// body swap (see htmx:afterSettle below).
import { initNav } from './nav';
import { initScrollTop } from './scrolltop';
import { initSidebar } from './sidebar';
import { initConstellation } from './constellation';
import { initProjectFilter } from './project-filter';
import { initGameModal } from './impossible-modal';
import { initPerfMeters } from './perf-meters';
import { initAiWidget } from './ai-widget';
import { initAuxButton } from './auxiliary-button';
import { initDefinitions } from './definitions';

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
  initGameModal();
  initPerfMeters();
  initAiWidget();
  initAuxButton();
  initDefinitions();
}

function ready(fn: () => void): void {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fn);
  } else {
    fn();
  }
}

// On first load, get out of the way of the LCP paint. The above-the-fold content
// (hero text, nav) is server-rendered HTML that needs no JS to be visible, so we
// let the browser paint it before running the ten idempotent init()s — otherwise
// they pile into one long main-thread task on the pre-LCP critical path and push
// the Largest Contentful Paint out (Lighthouse: "render delay"). rAF waits for the
// first paint; requestIdleCallback then runs init in the next idle gap (capped by
// the timeout so it can't be starved). Falls back to a timeout where rIC is absent
// (Safari). The hx-boost path below stays synchronous — LCP isn't measured on
// boosted navigations, and we want handlers rebound the instant new content lands.
function scheduleInit(fn: () => void): void {
  const ric = window.requestIdleCallback;
  if (ric) {
    requestAnimationFrame(() => ric(fn, { timeout: 1500 }));
  } else {
    requestAnimationFrame(() => window.setTimeout(fn, 1));
  }
}

ready(() => scheduleInit(initPage));

// hx-boost swaps <body> without a reload; re-bind handlers to the new DOM, then
// move focus to the new <main> so keyboard / screen-reader users land in the fresh
// content instead of being stranded on the now-removed link they activated.
// preventScroll: hx-boost already handles scroll position; don't fight it.
document.addEventListener('htmx:afterSettle', () => {
  initPage();
  document.getElementById('main')?.focus({ preventScroll: true });
});
