// TopNav interactivity. Global listeners wired once and live-query elements so
// they survive hx-boost swaps; element handlers re-bound per page via initNav().
import { sleep, pickRandom, readMessages, charDelay } from './bio';

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
  const bioIndicators = Array.from(
    document.querySelectorAll<HTMLButtonElement>('[data-bio-indicator]'),
  );

  // Mobile nav drill-in (Email / CV page-over).
  const navStack = document.querySelector<HTMLElement>('[data-mobile-nav-stack]');
  const drillButtons = navStack
    ? Array.from(navStack.querySelectorAll<HTMLButtonElement>('[data-mobile-drill]'))
    : [];
  const backButtons = navStack
    ? Array.from(navStack.querySelectorAll<HTMLButtonElement>('[data-mobile-drill-back]'))
    : [];
  const subpanels = navStack
    ? Array.from(navStack.querySelectorAll<HTMLElement>('[data-mobile-subpanel]'))
    : [];

  const resetDrill = (): void => {
    if (!navStack) return;
    delete navStack.dataset.drilled;
    subpanels.forEach((p) => {
      p.dataset.active = 'false';
      p.setAttribute('aria-hidden', 'true');
    });
  };

  const syncToolsTriggerVisibility = (): void => {
    if (!toolsTrigger || !mobilePanel) return;
    const toolsActive = mobileNav.open && mobilePanel.dataset.mode === 'tools';
    toolsTrigger.dataset.hidden = String(toolsActive);
  };

  const syncPanel = (): void => {
    if (mobilePanel) mobilePanel.classList.toggle('is-open', mobileNav.open);
    syncToolsTriggerVisibility();
    if (!mobileNav.open) {
      bioIndicators.forEach((i) => i.setAttribute('data-active', 'false'));
      bioTypingToken += 1;
      if (bioTyper) bioTyper.textContent = '';
      resetDrill();
    }
  };
  mobileNav.addEventListener('toggle', syncPanel);
  syncPanel();

  if (summary) {
    summary.addEventListener('click', () => {
      if (!mobileNav.open && mobilePanel) mobilePanel.dataset.mode = 'nav';
      // Always reopen on the main list, never a stale drilled sub-panel.
      resetDrill();
    });
  }

  // Drill into a sub-panel (Email / CV) and back out.
  drillButtons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!navStack) return;
      const key = btn.dataset.mobileDrill;
      subpanels.forEach((p) => {
        const active = p.dataset.mobileSubpanel === key;
        p.dataset.active = String(active);
        p.setAttribute('aria-hidden', String(!active));
      });
      navStack.dataset.drilled = '1';
    });
  });
  backButtons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      resetDrill();
    });
  });

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
}

export function initNav(): void {
  wireNavGlobalsOnce();
  wireNavElements();
}
