// TopNav interactivity, boost-aware. Window/document listeners are wired once
// (they query live elements each time they fire, so they survive hx-boost body
// swaps); element-level listeners are (re)bound per page via initNav().

let navGlobalsWired = false;
let bioTypingToken = 0;

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

const pickRandom = <T>(arr: T[] | undefined): T | null => {
  if (!arr || !arr.length) return null;
  return arr[Math.floor(Math.random() * arr.length)];
};

const readMessages = (indicator: Element): string[] => {
  try {
    const parsed = JSON.parse(indicator.getAttribute('data-bio-messages') || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
};

function wireNavGlobalsOnce(): void {
  if (navGlobalsWired) return;
  navGlobalsWired = true;

  // Autohide-on-scroll. Live-queries the nav each frame so it keeps working
  // across boosted navigations (the nav element is replaced on body swap).
  let lastY = window.scrollY;
  let ticking = false;
  const THRESHOLD = 50;
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
      if (y < THRESHOLD) nav.style.transform = '';
      else if (y > lastY + 4) nav.style.transform = 'translateY(-100%)';
      else if (y < lastY - 4) nav.style.transform = '';
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
    }
  };
  mobileNav.addEventListener('toggle', syncPanel);
  syncPanel();

  if (summary) {
    summary.addEventListener('click', () => {
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
        const isPunct = /[.!?,;:]/.test(ch);
        await sleep(isPunct ? 140 : 28 + Math.random() * 24);
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
        const delay = wasOpen || reduceMotion ? 0 : 280;
        setTimeout(() => typeInto(bioTyper, msg), delay);
      });
    }
  }
}

export function initNav(): void {
  wireNavGlobalsOnce();
  wireNavElements();
}
