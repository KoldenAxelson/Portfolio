/* definitions — tap a {{< term >}} word to open its glossary definition.
 *
 * DESKTOP (>=1024px) only: a card slides in from the right, beside the text. On
 * MOBILE the term routes into the shared top-nav panel instead (a 'definition'
 * mode — see topnav.html / ts/nav.ts), so the navbar stays and the hamburger
 * becomes the X, exactly like the impossible-list game detail.
 *
 * Plain JS (kept out of the tsgo gate). The drawer is one shared element;
 * listeners are delegated off document and bound once, so they survive hx-boost
 * body swaps. Idempotent on htmx:afterSettle.
 */
(function () {
  var DESKTOP = '(min-width: 1024px)';

  function buildDrawer() {
    if (document.getElementById('def-drawer')) return;
    var drawer = document.createElement('div');
    drawer.id = 'def-drawer';
    drawer.className = 'def-drawer';
    drawer.innerHTML =
      '<div class="def-drawer__card def-glass" role="dialog" aria-label="Definition" tabindex="-1">' +
      '<div class="def-card__head"><p class="def-card__label"></p>' +
      '<button type="button" class="def-close" data-def-close aria-label="Close definition">' +
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 18 18 6M6 6l12 12"/></svg>' +
      '</button></div><p class="def-card__body"></p></div>';
    document.body.appendChild(drawer);
  }

  var current = null;   // the trigger whose definition is showing, or null

  // Seat the card in the gutter to the right of the text column when it fits
  // there (so it never covers the prose); otherwise pin it to the edge.
  function positionDrawer() {
    var card = document.querySelector('.def-drawer__card');
    if (!card) return;
    var vw = document.documentElement.clientWidth;
    var main = document.querySelector('main');
    var contentRight = main ? main.getBoundingClientRect().right : vw / 2 + 360;
    var cardW = card.offsetWidth || 304;
    var EDGE = 24, GAP = 24;
    if (vw - contentRight >= cardW + GAP) {
      card.style.left = Math.min(contentRight + GAP, vw - cardW - EDGE) + 'px';
      card.style.right = 'auto';
    } else {
      card.style.left = 'auto';
      card.style.right = EDGE + 'px';
    }
  }

  function openDrawer(trigger) {
    var definition = trigger.getAttribute('data-term-def');
    if (!definition) return;
    if (current === trigger) { closeDrawer(); return; }   // tapping the open word toggles it shut
    buildDrawer();
    var drawer = document.getElementById('def-drawer');
    drawer.querySelector('.def-card__label').textContent = trigger.getAttribute('data-term-label') || '';
    drawer.querySelector('.def-card__body').textContent = definition;
    current = trigger;
    trigger.setAttribute('aria-expanded', 'true');
    positionDrawer();
    drawer.setAttribute('data-open', '');
  }

  function closeDrawer() {
    if (current) { current.setAttribute('aria-expanded', 'false'); current = null; }
    var drawer = document.getElementById('def-drawer');
    if (drawer) drawer.removeAttribute('data-open');
  }

  function init() { buildDrawer(); current = null; }   // hx-boost swaps <body>; recreate the drawer if gone

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  if (!window.__definitionsBound) {
    window.__definitionsBound = true;
    document.addEventListener('click', function (ev) {
      if (ev.target.closest('[data-def-close]')) { closeDrawer(); return; }
      var trigger = ev.target.closest('[data-term-def]');
      if (trigger) {
        if (!window.matchMedia(DESKTOP).matches) return;   // mobile → nav panel handles it (nav.ts)
        ev.preventDefault(); openDrawer(trigger); return;
      }
      if (current && !ev.target.closest('.def-drawer__card')) closeDrawer();   // click off the card closes it
    });
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && current) { var t = current; closeDrawer(); t.focus(); }
    });
    document.addEventListener('htmx:afterSettle', init);
    window.addEventListener('resize', function () { if (current) positionDrawer(); });
  }
})();
