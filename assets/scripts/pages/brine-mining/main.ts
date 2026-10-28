// /misc/brine-mining/ — the payback slider (layouts/shortcodes/brine-mining/swing.html)
// and the scroll-in animations for the explainers marked data-bm-anim.
//
// The shortcode already prints a static grid of payback years; this reveals
// the panel above it: drag the magnesium price, pick a cost case, and revenue,
// operating profit and payback recompute with the same arithmetic the grid
// used (see the shortcode's comment). Nothing is stored.

const fmtM = (n: number): string => `${n < 0 ? '−' : ''}$${Math.abs(n).toFixed(1).replace(/\.0$/, '')}M`;

function mount(root: HTMLElement): void {
  const range = root.querySelector<HTMLInputElement>('[data-bm-range]');
  const price = root.querySelector<HTMLOutputElement>('[data-bm-price]');
  const rev = root.querySelector<HTMLElement>('[data-bm-rev]');
  const profit = root.querySelector<HTMLElement>('[data-bm-profit]');
  const payback = root.querySelector<HTMLElement>('[data-bm-payback]');
  const cases = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-bm-case]'));
  if (!range || !price || !rev || !profit || !payback || !cases.length) return;

  const tonnes = Number(root.dataset.tonnes);
  const other = Number(root.dataset.other);
  let pick = cases.find((b) => b.getAttribute('aria-checked') === 'true') || cases[0];

  const render = (): void => {
    const p = Number(range.value);
    const opex = Number(pick.dataset.opex);
    const capex = Number(pick.dataset.capex);
    const revenue = (tonnes * p) / 1e6 + other;
    const ebit = revenue - opex;
    price.textContent = `$${p.toLocaleString('en-US')}/t`;
    rev.textContent = `${fmtM(revenue)}/yr`;
    profit.textContent = `${fmtM(ebit)}/yr`;
    payback.textContent = ebit > 0 ? `${(capex / ebit).toFixed(1)} yrs` : 'never';
    root.style.setProperty('--bm-fill', String((p - Number(range.min)) / (Number(range.max) - Number(range.min))));
    root.classList.toggle('is-under', ebit <= 0 || capex / ebit > 10);
    // Roving tabindex: Tab lands on the chosen case, arrows move within.
    for (const b of cases) b.tabIndex = b === pick ? 0 : -1;
  };

  range.addEventListener('input', render);
  for (const button of cases) {
    button.addEventListener('click', () => {
      pick = button;
      for (const b of cases) b.setAttribute('aria-checked', String(b === button));
      render();
    });
  }
  // Arrow keys move between the cost cases, as a radio group should.
  root.querySelector('.bm-cases')?.addEventListener('keydown', (event) => {
    const key = (event as KeyboardEvent).key;
    if (key !== 'ArrowLeft' && key !== 'ArrowRight') return;
    event.preventDefault();
    const next = cases[(cases.indexOf(pick) + (key === 'ArrowRight' ? 1 : cases.length - 1)) % cases.length];
    next.focus();
    next.click();
  });
  root.querySelector<HTMLElement>('[data-bm-live]')!.hidden = false;
  render();
}

// Explainers animate in when they scroll into view. Only ones that start off
// screen are armed (put in their start state), so nothing visible on load
// jumps; with reduced motion, or no IntersectionObserver, none are, and every
// figure just shows its end state (as it does without this script at all).
function armAnimations(): void {
  const els = Array.from(document.querySelectorAll<HTMLElement>('[data-bm-anim]:not(.bm-armed):not(.bm-in)'));
  if (!els.length || !('IntersectionObserver' in window)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('bm-in');
      io.unobserve(entry.target);
    }
  }, { threshold: 0.3 });
  for (const el of els) {
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) continue;
    el.classList.add('bm-armed');
    io.observe(el);
  }
}

// The brine counter: what the world's desal plants have made since the page
// opened. Ticks only while it is on screen, and stops for good when the figure
// leaves the page (htmx swaps it out).
function mountCounter(root: HTMLElement): void {
  const gal = root.querySelector<HTMLElement>('[data-bm-gal]');
  const galLabel = root.querySelector<HTMLElement>('[data-bm-gal-label]');
  const mg = root.querySelector<HTMLElement>('[data-bm-mg]');
  const mgLabel = root.querySelector<HTMLElement>('[data-bm-mg-label]');
  if (!gal || !galLabel || !mg || !mgLabel) return;
  const galPerMs = Number(root.dataset.galPerDay) / 86_400_000;
  const mgPerGal = Number(root.dataset.mgPerGal);
  const opened = performance.now();
  galLabel.textContent = 'gallons of brine made worldwide since you opened this page';
  mgLabel.textContent = 'tonnes of magnesium in it';
  const tick = (): void => {
    if (!root.isConnected) { window.clearInterval(timer); io.disconnect(); return; }
    const g =(performance.now() - opened) * galPerMs;
    gal.textContent = Math.round(g).toLocaleString('en-US');
    mg.textContent = (g * mgPerGal).toLocaleString('en-US', { maximumFractionDigits: 1, minimumFractionDigits: 1 });
  };
  let timer = 0;
  const io = new IntersectionObserver(([entry]) => {
    window.clearInterval(timer);
    timer = 0;
    if (!root.isConnected) { io.disconnect(); return; }
    if (entry.isIntersecting) timer = window.setInterval(tick, 90);
    else tick();
  });
  io.observe(root);
}

function mountAll(): void {
  armAnimations();
  for (const root of document.querySelectorAll<HTMLElement>('[data-bm-counter]')) {
    if (root.dataset.bmMounted) continue;
    root.dataset.bmMounted = 'true';
    mountCounter(root);
  }
  for (const root of document.querySelectorAll<HTMLElement>('[data-bm-swing]')) {
    if (root.dataset.bmMounted) continue;
    root.dataset.bmMounted = 'true';
    mount(root);
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountAll);
else mountAll();
document.addEventListener('htmx:afterSettle', mountAll);

export {}; // a module, so its helpers don't collide with other page scripts
