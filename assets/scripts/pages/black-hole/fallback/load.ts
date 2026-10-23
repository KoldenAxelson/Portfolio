/* Loads the WebGL2 fallback (fallback/entry.ts, its own bundle) only when WebGPU won't start, so browsers that have
 * WebGPU never download it. partials/black-hole/assets.html puts the bundle's URL and integrity hash on the main
 * script tag; the bundle hands its renderer back through window.blackHoleFallback. */

import type { FallbackRenderer } from './webgl2';

declare global {
  interface Window { blackHoleFallback?: typeof FallbackRenderer }
}

let pending: Promise<typeof FallbackRenderer | null> | null = null;

export function loadFallback(): Promise<typeof FallbackRenderer | null> {
  if (window.blackHoleFallback) return Promise.resolve(window.blackHoleFallback);
  pending ??= new Promise((resolve) => {
    const tag = document.querySelector<HTMLScriptElement>('script[data-bh-fallback]');
    if (!tag?.dataset.bhFallback) { resolve(null); return; }
    const script = document.createElement('script');
    script.src = tag.dataset.bhFallback;
    if (tag.dataset.bhFallbackIntegrity) script.integrity = tag.dataset.bhFallbackIntegrity;
    script.onload = () => resolve(window.blackHoleFallback ?? null);
    script.onerror = () => { pending = null; resolve(null); };
    document.head.append(script);
  });
  return pending;
}
