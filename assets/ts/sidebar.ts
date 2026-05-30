// Homepage sidebar scroll-spy + desktop bio typewriter. initSidebar() rebuilds
// the IntersectionObserver for the current DOM on each (boosted) navigation.
import { sleep, pickRandom, readMessages, charDelay } from './bio';

// Desktop typewriter beats (ms): rewind the old line, pause, type, hold, hide cursor.
const DELETE_STEP_MS = 12;
const PRE_TYPE_PAUSE_MS = 150;
const POST_TYPE_HOLD_MS = 800;

let sbMqWired = false;
let sbObserver: IntersectionObserver | null = null;
let sbApplyMode: (() => void) | null = null;

export function initSidebar(): void {
  // Tear down any observer/handler from the previous page (boost navigation).
  if (sbObserver) {
    sbObserver.disconnect();
    sbObserver = null;
  }
  sbApplyMode = null;

  const links = Array.from(document.querySelectorAll<HTMLElement>('[data-section-link]'));
  if (!links.length) return; // not a split page
  const idToLink = new Map<string | null, HTMLElement>(
    links.map((l) => [l.getAttribute('data-section-link'), l]),
  );
  const sectionEls = links
    .map((l) => document.getElementById(l.getAttribute('data-section-link') || ''))
    .filter((el): el is HTMLElement => el !== null);
  if (!sectionEls.length) return;

  const indicators = Array.from(
    document.querySelectorAll<HTMLButtonElement>('[data-bio-indicator]'),
  );
  const sectionIdToIndicators = new Map<string, HTMLButtonElement[]>();
  for (const indicator of indicators) {
    if (indicator.disabled) continue;
    const sectionEl = indicator.closest('section[id]');
    if (!sectionEl) continue;
    const id = sectionEl.id;
    if (!sectionIdToIndicators.has(id)) sectionIdToIndicators.set(id, []);
    sectionIdToIndicators.get(id)!.push(indicator);
  }

  const bioEl = document.querySelector<HTMLElement>('[data-bio-typer]');
  const cursorEl = bioEl ? bioEl.querySelector<HTMLElement>('[data-bio-cursor]') : null;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let currentSection: string | null = null;
  let typingToken = 0;

  const getInitialBio = (): string => {
    if (!bioEl) return '';
    let s = '';
    for (const node of Array.from(bioEl.childNodes)) {
      if (node !== cursorEl && node.nodeType === Node.TEXT_NODE) s += node.textContent;
    }
    return s;
  };
  const defaultBio = getInitialBio();

  const setText = (text: string): void => {
    if (!bioEl) return;
    for (const node of Array.from(bioEl.childNodes)) {
      if (node !== cursorEl) bioEl.removeChild(node);
    }
    bioEl.insertBefore(document.createTextNode(text), cursorEl);
  };

  const visibleText = (): string => {
    if (!bioEl) return '';
    let s = '';
    for (const node of Array.from(bioEl.childNodes)) {
      if (node !== cursorEl && node.nodeType === Node.TEXT_NODE) s += node.textContent;
    }
    return s;
  };

  const typeMessage = async (message: string): Promise<void> => {
    const myToken = ++typingToken;
    if (!bioEl) return;
    if (reduceMotion) {
      setText(message);
      return;
    }
    if (cursorEl) cursorEl.style.opacity = '1';
    let current = visibleText();
    while (current.length > 0 && typingToken === myToken) {
      current = current.slice(0, -1);
      setText(current);
      await sleep(DELETE_STEP_MS);
    }
    if (typingToken !== myToken) return;
    await sleep(PRE_TYPE_PAUSE_MS);
    if (typingToken !== myToken) return;
    let typed = '';
    for (const ch of message) {
      if (typingToken !== myToken) return;
      typed += ch;
      setText(typed);
      await sleep(charDelay(ch));
    }
    await sleep(POST_TYPE_HOLD_MS);
    if (typingToken !== myToken) return;
    if (cursorEl) cursorEl.style.opacity = '0';
  };

  let currentIndex = -1;
  let hoverIndex: number | null = null;
  const navLines = Array.from(document.querySelectorAll<HTMLElement>('[data-nav-line]'));

  const updateNavStates = (): void => {
    for (let i = 0; i < links.length; i++) {
      const dot = links[i].querySelector('[data-nav-dot]');
      if (!dot) continue;
      let state = 'future';
      if (i === currentIndex) state = 'current';
      else if (i === hoverIndex) state = 'highlighted';
      else if (i < currentIndex) state = 'passed';
      dot.setAttribute('data-state', state);
    }
    for (let i = 0; i < navLines.length; i++) {
      let state = 'grey';
      const inDashedPath =
        hoverIndex != null && hoverIndex > currentIndex && i + 1 > currentIndex && i + 1 <= hoverIndex;
      if (inDashedPath) state = 'dashed-primary';
      else if (i + 1 <= currentIndex) state = 'primary';
      navLines[i].setAttribute('data-state', state);
    }
  };

  const setSectionActive = (id: string | null): void => {
    for (const [key, el] of idToLink) {
      el.setAttribute('data-active', key === id ? 'true' : 'false');
    }
    currentIndex =
      id == null ? -1 : links.findIndex((l) => l.getAttribute('data-section-link') === id);
    updateNavStates();
  };

  links.forEach((link, i) => {
    const enter = (): void => {
      hoverIndex = i;
      updateNavStates();
    };
    const leave = (): void => {
      if (hoverIndex === i) {
        hoverIndex = null;
        updateNavStates();
      }
    };
    link.addEventListener('mouseenter', enter);
    link.addEventListener('focus', enter);
    link.addEventListener('mouseleave', leave);
    link.addEventListener('blur', leave);
  });

  const setIndicatorActive = (indicator: HTMLButtonElement | null): void => {
    for (const ind of indicators) {
      ind.setAttribute('data-active', ind === indicator ? 'true' : 'false');
    }
  };

  const driveFrom = (indicator: HTMLButtonElement | null): void => {
    if (!indicator) return;
    const msg = pickRandom(readMessages(indicator));
    if (!msg) return;
    setIndicatorActive(indicator);
    typeMessage(msg);
  };

  const restoreDefault = (): void => {
    setIndicatorActive(null);
    if (defaultBio) typeMessage(defaultBio);
  };

  const onSectionEnter = (id: string): void => {
    if (id === currentSection) return;
    currentSection = id;
    setSectionActive(id);
    const pool = sectionIdToIndicators.get(id);
    const pick = pickRandom(pool);
    if (pick) driveFrom(pick);
    else restoreDefault();
  };

  const mq = window.matchMedia('(min-width: 1024px)');

  const setupObserver = (): void => {
    if (sbObserver) return;
    sbObserver = new IntersectionObserver(
      (entries) => {
        const intersecting = entries.filter((e) => e.isIntersecting);
        if (!intersecting.length) return;
        intersecting.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        const top = intersecting[0];
        if (top && top.target.id) onSectionEnter(top.target.id);
      },
      { rootMargin: '-30% 0px -55% 0px', threshold: 0 },
    );
    sectionEls.forEach((el) => sbObserver!.observe(el));
    onSectionEnter(sectionEls[0].id);
  };

  const teardownObserver = (): void => {
    if (sbObserver) {
      sbObserver.disconnect();
      sbObserver = null;
    }
    setIndicatorActive(null);
    setSectionActive(null);
    currentSection = null;
  };

  const applyMode = (): void => {
    if (mq.matches) setupObserver();
    else teardownObserver();
  };
  sbApplyMode = applyMode;

  if (!sbMqWired) {
    sbMqWired = true;
    mq.addEventListener('change', () => sbApplyMode?.());
  }

  for (const indicator of indicators) {
    indicator.addEventListener('click', () => {
      if (!mq.matches) return;
      driveFrom(indicator);
    });
  }

  applyMode();
}
