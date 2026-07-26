// The contract between the two bundles.
//
// The lattice and the solver ship separately — the solver is a page-scoped
// runtime and there's no reason for every other page on the site to carry a
// fluid simulation — so they can't share a module instance at runtime. They
// meet on a property of the <section> instead: the lattice publishes, the solver
// reads, and the solver hangs its velocity readback back off the same object.

export interface Flow {
  data: Uint8Array;
  width: number;
  height: number;
}

export interface QuotesBridge {
  // The glyph mask. R is the smoothed letterform field, G the pulsing subset of
  // it that emits, and alpha is pinned — see buildMask in lattice.ts.
  mask: HTMLCanvasElement;
  // Live knob values, read every frame rather than copied, so a slider moves the
  // simulation without a reload and no default exists in two places.
  tune: Record<string, number>;
  color: () => string;
  accent: () => string;
  smokeOn: () => boolean;
  visible: () => boolean;
  // No WebGL2, no float render targets, or a lost context: there is no fluid, so
  // the lattice falls back to drawing dots rather than leaving an empty box.
  onFail: () => void;
  // A lost context can come back. Hand the switch to the reader again when it
  // does, or the fallback is permanent for a fault that wasn't.
  onRecover: () => void;
  flow?: Flow;
}

export type BridgeHost = HTMLElement & { __quotes?: QuotesBridge };

// Emission and dissipation per dye layer — a tight fast core, a mid body, a
// broad slow halo. They live here because both bundles need them: the solver
// applies them, and the tuning panel prints them when you bake a setting back
// into the source.
export const EMIT_RATE: readonly [number, number, number] = [0.18, 0.11, 0.055];
export const DENSITY_DISSIPATION: readonly [number, number, number] = [0.4, 0.24, 0.13];

export const QUOTES_READY_EVENT = 'quotes:ready';
