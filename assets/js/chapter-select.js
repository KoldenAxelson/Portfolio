/* chapter-select — closes the desktop "jump to chapter" FAB on outside-click and
 * Escape (the <details> handles the toggle itself). Mirrors the cv-actions close
 * behavior in ts/nav.ts, but scoped: loaded only on Basic Logic chapter pages.
 *
 * Plain JS (out of the tsgo gate). Listeners are delegated off document and
 * bound once, so they survive hx-boost body swaps.
 */
(function () {
  if (window.__chapterSelectBound) return;
  window.__chapterSelectBound = true;

  document.addEventListener('click', function (ev) {
    var fab = document.querySelector('[data-chapter-select]');
    if (!fab || !fab.open) return;
    if (!fab.contains(ev.target)) fab.open = false;
  });
  document.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Escape') return;
    var fab = document.querySelector('[data-chapter-select]');
    if (fab && fab.open) { fab.open = false; var s = fab.querySelector('summary'); if (s) s.focus(); }
  });
})();
