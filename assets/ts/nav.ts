// TopNav interactivity. Global listeners wired once and live-query elements so
// they survive hx-boost swaps; element handlers re-bound per page via initNav().
import { sleep, pickRandom, readMessages, charDelay } from './bio';
import { populateGameCard, wireCarouselDots } from './game-card';
import { wirePanelMode } from './sub-nav';
import type { PanelHost } from './sub-nav';

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

  // Detail modes reuse this very panel: tapping a trigger swaps it into a focused
  // view, so the card, the grid-rows drop, and the hamburger→X match the nav menu.
  // The shared choreography lives in sub-nav.ts; each mode supplies only its
  // triggers, its content panel, and how to fill it. Desktop drawers handle the
  // >=1024px case separately (impossible-modal.ts, definitions.ts).
  if (!mobilePanel) return;
  const host: PanelHost = {
    nav: mobileNav,
    panel: mobilePanel,
    topNav: document.querySelector<HTMLElement>('[data-top-nav]'),
    afterOpen: () => {
      syncToolsTriggerVisibility();
      syncAiTriggerVisibility();
    },
  };

  // Completed-game line items on /impossible-list.
  wirePanelMode(
    {
      mode: 'game',
      trigger: '[data-game-open]',
      content: '[data-mobile-panel-game]',
      setup: (content) =>
        wireCarouselDots(
          content.querySelector<HTMLElement>('[data-game-mobile-media]'),
          content.querySelector<HTMLElement>('[data-game-dots]'),
        ),
      populate: (trigger, content) =>
        populateGameCard(trigger.dataset, {
          title: content.querySelector<HTMLElement>('[data-game-mobile-title]'),
          blurb: content.querySelector<HTMLElement>('[data-game-mobile-blurb]'),
          media: content.querySelector<HTMLElement>('[data-game-mobile-media]'),
          dots: content.querySelector<HTMLElement>('[data-game-dots]'),
          stars: content.querySelector<HTMLElement>('[data-game-mobile-stars]'),
          status: content.querySelector<HTMLElement>('[data-game-mobile-status]'),
          series: content.querySelector<HTMLElement>('[data-game-mobile-series]'),
          consoleIcons: Array.from(content.querySelectorAll<HTMLElement>('[data-console-icon-for]')),
        }),
    },
    host,
  );

  // Glossary terms on Basic Logic pages.
  wirePanelMode(
    {
      mode: 'definition',
      trigger: '[data-term-def]',
      content: '[data-mobile-panel-definition]',
      populate: (trigger, content) => {
        const label = content.querySelector<HTMLElement>('[data-definition-label]');
        const body = content.querySelector<HTMLElement>('[data-definition-body]');
        if (label) label.textContent = trigger.getAttribute('data-term-label') || '';
        if (body) body.textContent = trigger.getAttribute('data-term-def') || '';
      },
    },
    host,
  );
}

export function initNav(): void {
  wireNavGlobalsOnce();
  wireNavElements();
}
