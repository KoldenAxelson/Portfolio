/* WGSL for the event-loop ribbons (the original ribvs.glsl + ribfs.glsl, loop branch): loops.ts builds one long
 * triangle strip per frame on the CPU (loop strands, flare arcades, flare ribbons, coronal rain, joined by degenerate
 * triangles) into a storage buffer, and this pulls it by vertex_index and draws it additively into the loop layer.
 * A vertex: view-frame position and side offset (R), colour, and edge (-1..1 across the strip). */

/** Floats per ribbon vertex: pos.xy, side.xy, colour.rgb, edge. */
export const RIBBON_VERTEX_FLOATS = 8;
/** The pass uniform: target size (px), star centre (px, y down), radius (px), padding. */
export const RIBBON_UNIFORM_FLOATS = 8;

export const RIBBON_SHADER = /* wgsl */ `
struct Pass { size: vec2f, star: vec2f, radiusPx: f32, pad0: f32, pad1: f32, pad2: f32 }
@group(0) @binding(0) var<uniform> P: Pass;
struct Vertex { pos: vec2f, side: vec2f, col: vec3f, edge: f32 }   // 8 floats: vec3f aligns to 16
@group(0) @binding(1) var<storage, read> verts: array<Vertex>;
struct VertexOut { @builtin(position) pos: vec4f, @location(0) col: vec3f, @location(1) edge: f32 }
@vertex fn vs(@builtin(vertex_index) i: u32) -> VertexOut {
  let v = verts[i];
  let q = v.pos + v.side;
  let px = vec2f(P.star.x + q.x * P.radiusPx, P.star.y - q.y * P.radiusPx);   // view y up, pixels y down
  var o: VertexOut;
  o.pos = vec4f(px.x / P.size.x * 2.0 - 1.0, 1.0 - px.y / P.size.y * 2.0, 0.0, 1.0);
  o.col = v.col; o.edge = v.edge;
  return o;
}
// edge^2 = (distance / (6 core widths))^2: a thin bright core and a faint narrow glow, windowed to reach zero at the strip
// edge (un-windowed, a hot arcade seen from above ended in hard straight edges), then a soft per-strand saturation so a
// very bright strand keeps its profile instead of filling its quad as a flat block
@fragment fn fs(v: VertexOut) -> @location(0) vec4f {
  let e = v.edge * v.edge;
  let win = (1.0 - e) * (1.0 - e);
  let c = v.col * (exp(-e * 36.0) + exp(-e * 4.0) * 0.04 * win);
  return vec4f(1.6 * (1.0 - exp(-c / 1.6)), 0.0);
}`;
