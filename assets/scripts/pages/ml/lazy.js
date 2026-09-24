// Heavy demo code loads only when its demo scrolls near the viewport.

const loaded = {};

export function loadScript(src, onReady) {
  if (loaded[src] === true) { onReady(); return; }
  if (loaded[src]) { loaded[src].push(onReady); return; }
  loaded[src] = [onReady];
  const el = document.createElement('script');
  el.src = src;
  el.async = true;
  el.onload = () => {
    const waiting = loaded[src];
    loaded[src] = true;
    waiting.forEach((cb) => cb());
  };
  // Forget the failure so a later demo can retry the same file.
  el.onerror = () => { loaded[src] = null; };
  document.head.appendChild(el);
}

export function loadScripts(srcs, onReady) {
  if (!srcs.length) { onReady(); return; }
  loadScript(srcs[0], () => loadScripts(srcs.slice(1), onReady));
}

export function whenVisible(el, onVisible) {
  if (!el) return;
  if (!('IntersectionObserver' in window)) { onVisible(); return; }
  const io = new IntersectionObserver((entries) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    io.disconnect();
    onVisible();
  }, { rootMargin: '250px 0px' });
  io.observe(el);
}
