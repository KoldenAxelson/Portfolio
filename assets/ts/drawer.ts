// A desktop "detail drawer" that slides in from the right. It owns the lifecycle
// every such drawer shares — desktop-only triggers, the [data-open] slide,
// [hidden] toggled in step with the slide-out, Escape and close-button dismissal,
// focus save/restore, aria-expanded on the trigger, and hx-boost-safe rebinding —
// so a new drawer only has to say how to fill its card. Mobile is handled by the
// top-nav panel (sub-nav.ts), hence the desktop gate. Content, positioning, and
// any extras (a lightbox, an image carousel) stay with the caller via the hooks.

const DESKTOP = '(min-width: 1024px)';
const SLIDE_MS = 320; // keep in sync with the drawer slide transitions in the CSS

// Per-drawer teardown for the document-level listeners, so re-binding after an
// hx-boost body swap replaces this drawer's old handlers instead of stacking them.
const teardown = new Map<string, () => void>();

export interface DrawerHooks {
  // Fill the card from the tapped trigger, before the slide-in.
  populate: (trigger: HTMLElement) => void;
  // After the card is laid out but before the slide begins (position it, move
  // focus, ...) — so positioning can't be seen jumping mid-slide.
  onOpen?: (trigger: HTMLElement) => void;
  // As the card starts sliding out (tear down transient UI, e.g. a lightbox).
  onClose?: () => void;
  // Veto an Escape / outside-click close while a nested layer owns dismissal
  // (e.g. a lightbox is up over the card).
  blockClose?: () => boolean;
}

export interface DrawerConfig {
  // Stable key across page swaps, so re-init can replace this drawer's listeners.
  id: string;
  // The element that carries [data-open] (and, when closed, [hidden]).
  root: HTMLElement;
  // The interactive card: the outside-click boundary and focus container.
  card: HTMLElement;
  // Selector for the tappable triggers.
  trigger: string;
  // Selector for close controls inside the drawer.
  closeButton?: string;
  // Clicking off the card dismisses it (default false — the game drawer lets
  // clicks pass through to the page instead).
  outsideClickCloses?: boolean;
  // Re-clicking the already-open trigger dismisses it (default false).
  toggleCloses?: boolean;
  // Slide the old card out then the new one in when switching triggers while
  // open (default false — otherwise the content swaps in place).
  animateSwap?: boolean;
  // Slide duration to respect before hiding (default SLIDE_MS).
  slideMs?: number;
}

export interface Drawer {
  open: (trigger: HTMLElement) => void;
  close: () => void;
  isOpen: () => boolean;
}

export function createDrawer(config: DrawerConfig, hooks: DrawerHooks): Drawer {
  const { root, card } = config;
  const slideMs = config.slideMs ?? SLIDE_MS;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let activeTrigger: HTMLElement | null = null;
  let hideTimer = 0;
  let swapTimer = 0;
  let swapPending = false; // a swap's reveal is queued but its card isn't shown yet

  // "Open" spans the swap gap too, so an Escape / close during it isn't ignored
  // (which would otherwise let the queued reveal re-open the drawer).
  const isOpen = (): boolean => root.hasAttribute('data-open') || swapPending;

  const reveal = (trigger: HTMLElement): void => {
    if (activeTrigger && activeTrigger !== trigger) {
      activeTrigger.setAttribute('aria-expanded', 'false');
    }
    hooks.populate(trigger);
    root.hidden = false;
    void root.offsetWidth; // reflow so the slide runs from the closed state
    activeTrigger = trigger;
    trigger.setAttribute('aria-expanded', 'true');
    hooks.onOpen?.(trigger); // laid out but not yet sliding — safe to position
    root.setAttribute('data-open', '');
  };

  const open = (trigger: HTMLElement): void => {
    window.clearTimeout(hideTimer);
    window.clearTimeout(swapTimer);
    if (config.toggleCloses && isOpen() && trigger === activeTrigger) {
      close(false);
      return;
    }
    // Already open on another trigger → optional slide-out-then-in.
    if (isOpen() && config.animateSwap && !reduceMotion) {
      root.removeAttribute('data-open');
      swapPending = true;
      swapTimer = window.setTimeout(() => {
        swapPending = false;
        reveal(trigger);
      }, slideMs);
      return;
    }
    reveal(trigger);
  };

  // restoreFocus is false for pointer dismissals (outside-click / re-tap) so the
  // page isn't yanked back to the trigger; true for Escape and the close button.
  const close = (restoreFocus = true): void => {
    window.clearTimeout(swapTimer);
    const wasOpen = root.hasAttribute('data-open') || swapPending;
    swapPending = false; // cancel any queued swap reveal
    if (!wasOpen) return;
    const trigger = activeTrigger;
    root.removeAttribute('data-open');
    hooks.onClose?.();
    trigger?.setAttribute('aria-expanded', 'false');
    activeTrigger = null;
    if (restoreFocus) trigger?.focus();
    if (reduceMotion) {
      root.hidden = true;
    } else {
      window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => {
        root.hidden = true;
      }, slideMs);
    }
  };

  // Triggers and close controls are page elements, replaced wholesale on each
  // hx-boost swap, so binding them per element never accumulates.
  for (const el of Array.from(document.querySelectorAll<HTMLElement>(config.trigger))) {
    el.addEventListener('click', (e) => {
      if (!window.matchMedia(DESKTOP).matches) return; // mobile → top-nav panel
      e.preventDefault();
      open(el);
    });
  }
  if (config.closeButton) {
    for (const el of Array.from(root.querySelectorAll<HTMLElement>(config.closeButton))) {
      el.addEventListener('click', () => close());
    }
  }

  // Escape and outside-click are document-level; drop this drawer's previous
  // handlers first so a re-init doesn't stack them.
  teardown.get(config.id)?.();
  const onKey = (e: KeyboardEvent): void => {
    if (e.key !== 'Escape' || !isOpen() || hooks.blockClose?.()) return;
    close();
  };
  const onClick = (e: MouseEvent): void => {
    if (!config.outsideClickCloses || !isOpen() || hooks.blockClose?.()) return;
    const target = e.target as Element | null;
    if (target && (card.contains(target) || target.closest(config.trigger))) return;
    close(false);
  };
  document.addEventListener('keydown', onKey);
  document.addEventListener('click', onClick);
  teardown.set(config.id, () => {
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('click', onClick);
  });

  return { open, close, isOpen };
}
