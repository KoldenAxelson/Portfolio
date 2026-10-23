/* Loads the WebGL2 fallback (fallback/entry.ts, its own bundle) only when WebGPU won't start, so browsers that have
 * WebGPU never download it. partials/sun/assets.html puts the bundle's URL and integrity hash on the main script tag;
 * the bundle hands its renderer back through window.sunFallback. */

import type { FallbackRenderer } from './webgl2';

declare global {
  interface Window { sunFallback?: typeof FallbackRenderer }
}

let pending: Promise<typeof FallbackRenderer | null> | null = null;

export function loadFallback(): Promise<typeof FallbackRenderer | null> {
  if (window.sunFallback) return Promise.resolve(window.sunFallback);
  pending ??= new Promise((resolve) => {
    const tag = document.querySelector<HTMLScriptElement>('script[data-sun-fallback]');
    if (!tag?.dataset.sunFallback) { resolve(null); return; }
    const script = document.createElement('script');
    script.src = tag.dataset.sunFallback;
    if (tag.dataset.sunFallbackIntegrity) script.integrity = tag.dataset.sunFallbackIntegrity;
    script.onload = () => resolve(window.sunFallback ?? null);
    script.onerror = () => { pending = null; resolve(null); };
    document.head.append(script);
  });
  return pending;
}
