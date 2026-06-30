// TopNav interactivity. Global listeners wired once and live-query elements so
// they survive hx-boost swaps; element handlers re-bound per page via initNav().
import { sleep, pickRandom, readMessages, charDelay } from './bio';
import { buildStars, buildCarousel, buildSeries } from './stars';
import type { MediaImage, SeriesEntry } from './stars';

const SHOW_NAV_BELOW_PX = 50;
const SCROLL_JITTER_PX = 4;
// Let the panel finish opening before typing, so the bio doesn't race the animation.
const PANEL_OPEN_DELAY_MS = 280;

let navGlobalsWired = false;
let bioTypingToken = 0;

function wireNavGlobalsOnce(): void {
  if (navGlobalsWired) return;
  navGlobalsWired = true;

  // Autohide-on-scroll.
  let lastY = window.scrollY;
  let ticking = false;
  const onScroll = (): void => {
    const nav = document.querySelector<HTMLElement>('[data-top-nav]');
    const mobileNav = document.querySelector<HTMLDetailsElement>('[data-mobile-nav]');
    const y = window.scrollY;
    if (mobileNav && mobileNav.open) {
      lastY = y;
      ticking = false;
      return;
    }
    if (nav) {
      if (y < SHOW_NAV_BELOW_PX) nav.style.transform = '';
      else if (y > lastY + SCROLL_JITTER_PX) nav.style.transform = 'translateY(-100%)';
      else if (y < lastY - SCROLL_JITTER_PX) nav.style.transform = '';
    }
    lastY = y;
    ticking = false;
  };
  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        requestAnimationFrame(onScroll);
        ticking = true;
      }
    },
    { passive: true },
  );

  // Close the mobile panel on click-outside / Escape.
  document.addEventListener('click', (e) => {
    const mobileNav = document.querySelector<HTMLDetailsElement>('[data-mobile-nav]');
    if (!mobileNav || !mobileNav.open) return;
    const mobilePanel = document.querySelector<HTMLElement>('[data-mobile-panel]');
    const target = e.target as Element | null;
    const insideNav = target ? mobileNav.contains(target) : false;
    const insidePanel = mobilePanel && target ? mobilePanel.contains(target) : false;
    const onBioIndicator = target?.closest('[data-bio-indicator]');
    if (!insideNav && !insidePanel && !onBioIndicator) mobileNav.open = false;
  });
  document.addEventListener('keydown', (e) => {
    const mobileNav = document.querySelector<HTMLDetailsElement>('[data-mobile-nav]');
    if (e.key === 'Escape' && mobileNav && mobileNav.open) mobileNav.open = false;
  });

  // Close the CV actions speed-dial (<details data-cv-actions>) on click-outside
  // / Escape. Live-queried so it survives hx-boost swaps; no-ops off the CV page.
  document.addEventListener('click', (e) => {
    const cvActions = document.querySelector<HTMLDetailsElement>('[data-cv-actions]');
    if (!cvActions || !cvActions.open) return;
    const target = e.target as Element | null;
    if (target && !cvActions.contains(target)) cvActions.open = false;
  });
  document.addEventListener('keydown', (e) => {
    const cvActions = document.querySelector<HTMLDetailsElement>('[data-cv-actions]');
    if (e.key === 'Escape' && cvActions && cvActions.open) cvActions.open = false;
  });
}

function wireNavElements(): void {
  const mobileNav = document.querySelector<HTMLDetailsElement>('[data-mobile-nav]');
  if (!mobileNav) return;
  const mobilePanel = document.querySelector<HTMLElement>('[data-mobile-panel]');
  const bioTyper = document.querySelector<HTMLElement>('[data-bio-mobile-typer]');
  const summary = mobileNav.querySelector('summary');
  const toolsTrigger = document.querySelector<HTMLElement>('[data-mobile-tools-trigger]');
  const aiTrigger = document.querySelector<HTMLElement>('[data-ai-mobile-trigger]');
  const bioIndicators = Array.from(
    document.querySelectorAll<HTMLButtonElement>('[data-bio-indicator]'),
  );

  const syncToolsTriggerVisibility = (): void => {
    if (!toolsTrigger || !mobilePanel) return;
    const toolsActive = mobileNav.open && mobilePanel.dataset.mode === 'tools';
    toolsTrigger.dataset.hidden = String(toolsActive);
  };

  // Hide the AI nav button while a game detail is showing, so the panel reads as
  // a focused view (matches how the tools trigger hides in tools mode).
  const syncAiTriggerVisibility = (): void => {
    if (!aiTrigger || !mobilePanel) return;
    const gameActive = mobileNav.open && mobilePanel.dataset.mode === 'game';
    aiTrigger.dataset.gameHidden = String(gameActive);
  };

  const syncPanel = (): void => {
    if (mobilePanel) mobilePanel.classList.toggle('is-open', mobileNav.open);
    syncToolsTriggerVisibility();
    syncAiTriggerVisibility();
    if (!mobileNav.open) {
      bioIndicators.forEach((i) => i.setAttribute('data-active', 'false'));
      bioTypingToken += 1;
      if (bioTyper) bioTyper.textContent = '';
    }
  };
  mobileNav.addEventListener('toggle', syncPanel);
  syncPanel();

  if (summary) {
    summary.addEventListener('click', () => {
      // Always reopen on the main nav list, never a stale bio/tools mode.
      if (!mobileNav.open && mobilePanel) mobilePanel.dataset.mode = 'nav';
    });
  }

  if (toolsTrigger && mobilePanel) {
    toolsTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const alreadyToolsOpen = mobileNav.open && mobilePanel.dataset.mode === 'tools';
      if (alreadyToolsOpen) {
        mobileNav.open = false;
        return;
      }
      mobilePanel.dataset.mode = 'tools';
      const nav = document.querySelector<HTMLElement>('[data-top-nav]');
      if (nav) nav.style.transform = '';
      if (!mobileNav.open) {
        mobileNav.open = true;
      } else {
        syncToolsTriggerVisibility();
      }
    });
  }

  if (mobilePanel && bioTyper) {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const typeInto = async (element: HTMLElement, message: string): Promise<void> => {
      const myToken = ++bioTypingToken;
      if (reduceMotion) {
        element.textContent = message;
        return;
      }
      element.textContent = '';
      let typed = '';
      for (const ch of message) {
        if (bioTypingToken !== myToken) return;
        typed += ch;
        element.textContent = typed;
        await sleep(charDelay(ch));
      }
    };

    for (const indicator of bioIndicators) {
      if (indicator.disabled) continue;
      indicator.addEventListener('click', (e) => {
        if (window.matchMedia('(min-width: 1024px)').matches) return;
        e.preventDefault();
        e.stopPropagation();
        const msg = pickRandom(readMessages(indicator));
        if (!msg) return;
        const wasOpen = mobileNav.open;
        mobilePanel.dataset.mode = 'bio';
        bioIndicators.forEach((i) =>
          i.setAttribute('data-active', i === indicator ? 'true' : 'false'),
        );
        syncToolsTriggerVisibility();
        const nav = document.querySelector<HTMLElement>('[data-top-nav]');
        if (nav) nav.style.transform = '';
        if (!wasOpen) mobileNav.open = true;
        const delay = wasOpen || reduceMotion ? 0 : PANEL_OPEN_DELAY_MS;
        setTimeout(() => typeInto(bioTyper, msg), delay);
      });
    }
  }

  // Completed-game line items reuse this very panel as a new 'game' mode, so the
  // card, the grid-rows drop, and the hamburger→X are identical to the nav menu.
  // Desktop is handled separately by ts/impossible-modal.ts (the right drawer).
  const gamePanel = document.querySelector<HTMLElement>('[data-mobile-panel-game]');
  const gameTriggers = Array.from(
    document.querySelectorAll<HTMLButtonElement>('[data-game-open]'),
  );
  if (mobilePanel && gamePanel && gameTriggers.length) {
    const gMedia = gamePanel.querySelector<HTMLElement>('[data-game-mobile-media]');
    const gTitle = gamePanel.querySelector<HTMLElement>('[data-game-mobile-title]');
    const gStars = gamePanel.querySelector<HTMLElement>('[data-game-mobile-stars]');
    const gStatus = gamePanel.querySelector<HTMLElement>('[data-game-mobile-status]');
    const gSeries = gamePanel.querySelector<HTMLElement>('[data-game-mobile-series]');
    const gBlurb = gamePanel.querySelector<HTMLElement>('[data-game-mobile-blurb]');
    const gConsoleIcons = Array.from(
      gamePanel.querySelectorAll<HTMLElement>('[data-console-icon-for]'),
    );
    for (const trigger of gameTriggers) {
      trigger.addEventListener('click', (e) => {
        if (window.matchMedia('(min-width: 1024px)').matches) return; // desktop → drawer
        e.preventDefault();
        e.stopPropagation();
        const d = trigger.dataset;
        mobilePanel.dataset.mode = 'game';
        if (gTitle) gTitle.textContent = d.title || '';
        if (gBlurb) gBlurb.textContent = d.blurb || '';
        if (gMedia) {
          let imgs: MediaImage[] = [];
          try {
            imgs = JSON.parse(d.images || '[]');
          } catch {
            imgs = [];
          }
          gMedia.innerHTML = buildCarousel(imgs);
          gMedia.setAttribute('data-kind', d.kind || 'game');
          gMedia.scrollLeft = 0;
        }
        const r = parseFloat(d.rating || '0');
        const hasRating = Boolean(d.rating) && r > 0;
        if (gStars) {
          if (hasRating) {
            gStars.innerHTML = buildStars(r);
            gStars.setAttribute('role', 'img');
            gStars.setAttribute('aria-label', `Rated ${r.toFixed(1)} out of 5`);
            gStars.hidden = false;
          } else {
            gStars.innerHTML = '';
            gStars.hidden = true;
          }
        }
        if (gStatus) {
          if (d.status && !hasRating) {
            gStatus.textContent = d.status;
            gStatus.hidden = false;
          } else {
            gStatus.hidden = true;
          }
        }
        if (gSeries) {
          let entries: SeriesEntry[] = [];
          if (d.series) {
            try {
              entries = JSON.parse(d.series);
            } catch {
              entries = [];
            }
          }
          gSeries.innerHTML = entries.length ? buildSeries(entries) : '';
          gSeries.hidden = entries.length === 0;
        }
        for (const el of gConsoleIcons) {
          el.hidden = el.getAttribute('data-console-icon-for') !== d.console;
        }
        syncToolsTriggerVisibility();
        syncAiTriggerVisibility();
        const nav = document.querySelector<HTMLElement>('[data-top-nav]');
        if (nav) nav.style.transform = '';
        if (!mobileNav.open) mobileNav.open = true;
      });
    }
  }
}

export function initNav(): void {
  wireNavGlobalsOnce();
  wireNavElements();
}
