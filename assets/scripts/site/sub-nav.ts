// Shared "top-nav detail panel" wiring. A detail mode reuses the mobile nav
// panel ([data-mobile-panel]) as a focused view: tapping a trigger on mobile
// swaps the panel into that mode, so the navbar stays put and the hamburger
// morphs to an X — the same open/dismiss affordance as the main menu, instead of
// each feature reinventing (and re-breaking) it. Desktop is handled by a
// page-specific drawer, so triggers no-op here at >=1024px.
//
// Every detail feature (completed-game card, glossary definition, ...) differs
// only in three things: which elements are tappable, which panel holds its
// content, and how that content is filled. Those are the hooks below; the
// choreography around them is identical and lives here once.

const DESKTOP = '(min-width: 1024px)';

export interface PanelMode {
  // data-mode value to switch to — matches a [data-mobile-panel-*] child and the
  // mode-switch CSS in topnav.html.
  mode: string;
  // Selector for the tappable triggers, e.g. '[data-game-open]'.
  trigger: string;
  // Selector for this mode's content container inside the panel.
  content: string;
  // Fill the content container from the tapped trigger.
  populate: (trigger: HTMLElement, content: HTMLElement) => void;
  // Optional setup on the container (e.g. wiring a carousel). Runs on each init;
  // safe to re-run because the container is replaced on every hx-boost swap. Only
  // runs when the mode actually has both a container and triggers on this page.
  setup?: (content: HTMLElement) => void;
}

export interface PanelHost {
  // The mobile nav <details> whose open state drives the hamburger→X.
  nav: HTMLDetailsElement;
  // The panel wrapper ([data-mobile-panel]) whose data-mode selects the view.
  panel: HTMLElement;
  // The sticky header, so an autohidden navbar snaps back on open.
  topNav: HTMLElement | null;
  // Re-sync ancillary trigger visibility (tools / AI buttons) once a mode opens.
  afterOpen: () => void;
}

export function wirePanelMode(mode: PanelMode, host: PanelHost): void {
  const content = document.querySelector<HTMLElement>(mode.content);
  const triggers = Array.from(document.querySelectorAll<HTMLElement>(mode.trigger));
  if (!content || !triggers.length) return;
  mode.setup?.(content);
  for (const trigger of triggers) {
    trigger.addEventListener('click', (e) => {
      if (window.matchMedia(DESKTOP).matches) return; // desktop → page drawer
      e.preventDefault();
      e.stopPropagation();
      host.panel.dataset.mode = mode.mode;
      mode.populate(trigger, content);
      host.afterOpen();
      if (host.topNav) host.topNav.style.transform = '';
      if (!host.nav.open) host.nav.open = true;
    });
  }
}
