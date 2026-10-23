/* Sizes and clocks shared by the WebGPU shaders (shaders.ts), the WebGL2 port (fallback/glsl.ts) and sim.ts. A
 * module of its own so the fallback bundle can import them without pulling in shaders.ts's WGSL. */

/** Lifetime of one spiral arm in M; sim.ts ages the arms on this clock. */
export const ARM_LIFE_M = 240;
/** The field texture: GAS_ROWS rows of gas (log r) x FIELD_WIDTH in phi, then two rows of the blackbody table
 *  (chroma, log intensity) across FIELD_WIDTH temperatures. */
export const GAS_ROWS = 252;
export const FIELD_WIDTH = 512;
export const FIELD_HEIGHT = 256;
