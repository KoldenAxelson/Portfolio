// Shared modal-content renderers for the impossible list (used by the desktop
// drawer in impossible-modal.ts and the mobile nav panel in nav.ts): star
// ratings, the image carousel, and the series progress checklist. Inline styles
// + CSS theme vars, because Tailwind doesn't scan .ts for classes.

export interface MediaImage {
  src: string;
  srcset?: string;
}
export interface SeriesEntry {
  title: string;
  done: boolean;
}

const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const STAR_PATH =
  'M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006Z';

const starSvg = (filled: boolean): string =>
  `<svg viewBox="0 0 24 24" width="15" height="15" fill="${filled ? 'currentColor' : 'none'}"${filled ? '' : ' stroke="currentColor" stroke-width="1.5"'} aria-hidden="true"><path d="${STAR_PATH}" /></svg>`;

// Full / half (50%-clipped overlay) / empty stars, plus a numeric readout.
export const buildStars = (rating: number): string => {
  let html = '<span style="display:inline-flex;align-items:center;gap:2px;">';
  for (let i = 0; i < 5; i++) {
    const full = rating >= i + 1;
    const half = !full && rating >= i + 0.5;
    if (half) {
      html += `<span style="position:relative;display:inline-flex;color:var(--color-border);">${starSvg(false)}<span style="position:absolute;inset:0;width:50%;overflow:hidden;color:var(--color-accent);">${starSvg(true)}</span></span>`;
    } else {
      html += `<span style="display:inline-flex;color:${full ? 'var(--color-accent)' : 'var(--color-border)'};">${starSvg(full)}</span>`;
    }
  }
  html += '</span>';
  return html;
};

// Horizontal scroll-snap carousel slides (one image, or several to swipe through).
// Each image carries data-full (the largest variant) for the desktop lightbox.
export const buildCarousel = (images: MediaImage[]): string =>
  images
    .map((im) => {
      let full = im.src;
      if (im.srcset) {
        const last = im.srcset.split(',').pop();
        if (last) full = last.trim().split(' ')[0];
      }
      return `<div style="flex:0 0 100%;scroll-snap-align:center;display:flex;align-items:center;justify-content:center;height:100%;"><img src="${im.src}"${im.srcset ? ` srcset="${im.srcset}"` : ''} data-full="${full}" alt="" decoding="async" style="width:100%;height:100%;object-fit:contain;display:block;cursor:zoom-in;" /></div>`;
    })
    .join('');

// Carousel position dots. Rendered only when there's more than one image.
export const buildDots = (count: number): string => {
  let html = '';
  for (let i = 0; i < count; i++) {
    html +=
      '<span style="width:6px;height:6px;border-radius:9999px;background:var(--color-border);transition:background 150ms ease,transform 150ms ease;"></span>';
  }
  return html;
};

export const setActiveDot = (dotsEl: HTMLElement, index: number): void => {
  const dots = dotsEl.children;
  for (let i = 0; i < dots.length; i++) {
    const el = dots[i] as HTMLElement;
    el.style.background = i === index ? 'var(--color-accent)' : 'var(--color-border)';
    el.style.transform = i === index ? 'scale(1.35)' : 'scale(1)';
  }
};

const SERIES_CHECK =
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" style="color:var(--color-accent);flex:0 0 auto;"><path d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>';
const SERIES_CIRCLE =
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true" style="color:var(--color-border);flex:0 0 auto;"><circle cx="12" cy="12" r="9" /></svg>';

// Series progress checklist: an "N of M read" header and a checked/unchecked list.
export const buildSeries = (items: SeriesEntry[]): string => {
  const read = items.filter((i) => i.done).length;
  const rows = items
    .map(
      (i) =>
        `<li style="display:flex;align-items:center;gap:8px;padding:3px 0;">${i.done ? SERIES_CHECK : SERIES_CIRCLE}<span style="${i.done ? 'text-decoration:line-through;color:var(--color-muted);' : 'color:var(--color-fg);'}">${escapeHtml(i.title)}</span></li>`,
    )
    .join('');
  return `<p style="margin:0 0 6px;font-family:var(--font-mono);font-size:12px;color:var(--color-muted);">${read} of ${items.length} read</p><ul style="list-style:none;margin:0;padding:0;font-size:14px;">${rows}</ul>`;
};
