// Fullscreen, for showing the deck off.
//
// The whole <section> goes, not just the canvas — the stage button has to come
// with it or click-to-advance stops working — and the stylesheet strips the
// chrome down to the quote and an X.
//
// Two ways in. The Fullscreen API where it exists, and a fixed-position cover of
// the viewport where it doesn't: Safari on iPhone only ever offered fullscreen
// to <video>, so requesting it for a <section> there is refused and the button
// used to hide itself, which is why the mode was missing on a phone. Both routes
// set .is-immersive, so the stylesheet has one state to describe rather than two
// — and it can't be written as `:fullscreen, .is-immersive`, because a browser
// that doesn't understand `:fullscreen` drops the whole selector list, taking
// the fallback with it exactly where the fallback is needed.

type FullscreenElement = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };
type FullscreenDocument = Document & { webkitFullscreenEnabled?: boolean };

const IMMERSIVE_CLASS = 'is-immersive';
const PAGE_CLASS = 'quotes-immersive'; // locks the page behind the cover

export function wireFullscreen(root: HTMLElement): () => void {
  const toggleButton = root.querySelector<HTMLButtonElement>('[data-quotes-fullscreen]');
  // The button's label lives in an sr-only span alongside an icon. Writing to
  // toggleButton.textContent would take the icon out with it on the first sync.
  const toggleLabel = root.querySelector<HTMLElement>('[data-quotes-fullscreen-label]');
  const exitButton = root.querySelector<HTMLButtonElement>('[data-quotes-exit]');
  if (!toggleButton) return () => {};

  const hasApi =
    !!document.fullscreenEnabled || !!(document as FullscreenDocument).webkitFullscreenEnabled;
  let covering = false; // the fallback is on

  const isActive = (): boolean => document.fullscreenElement === root || covering;

  const sync = (): void => {
    const active = isActive();
    root.classList.toggle(IMMERSIVE_CLASS, active);
    document.documentElement.classList.toggle(PAGE_CLASS, active);
    const label = active ? 'Exit fullscreen' : 'Fullscreen';
    if (toggleLabel) toggleLabel.textContent = label;
    else toggleButton.textContent = label;
    toggleButton.setAttribute('aria-pressed', String(active));
  };

  const cover = (): void => {
    covering = true;
    sync();
  };

  const enter = (): void => {
    if (!hasApi) {
      cover();
      return;
    }
    const element = root as FullscreenElement;
    try {
      // A refusal is not an error to recover from, it's the signal to use the
      // other route — which is also what a browser that reports the API and then
      // declines for a <section> needs.
      Promise.resolve(element.requestFullscreen?.() ?? element.webkitRequestFullscreen?.()).catch(
        cover,
      );
    } catch {
      cover();
    }
  };

  const exit = (): void => {
    if (covering) {
      covering = false;
      sync();
      return;
    }
    void document.exitFullscreen?.();
  };

  const toggle = (): void => (isActive() ? exit() : enter());

  // The browser handles Escape for real fullscreen; the fallback has to itself.
  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && covering) exit();
  };

  toggleButton.addEventListener('click', toggle);
  exitButton?.addEventListener('click', exit);
  document.addEventListener('fullscreenchange', sync);
  document.addEventListener('keydown', onKeyDown);
  sync();

  return () => {
    toggleButton.removeEventListener('click', toggle);
    exitButton?.removeEventListener('click', exit);
    document.removeEventListener('fullscreenchange', sync);
    document.removeEventListener('keydown', onKeyDown);
    root.classList.remove(IMMERSIVE_CLASS);
    document.documentElement.classList.remove(PAGE_CLASS);
  };
}
