/* Small 3-vector helpers for the CPU side of the star (field.ts, cmes.ts, loops*.ts, frictional.ts, the fallback).
 * Star frame: y is the rotation axis; the view is rotY(rotation) applied to the star frame (layer.ts). */

export type Vec3 = [number, number, number];

export const add = (a: Vec3, b: Vec3, s = 1): Vec3 => [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s];
export const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const length = (a: Vec3): number => Math.hypot(a[0], a[1], a[2]);
export const normalize = (a: Vec3): Vec3 => scale(a, 1 / (length(a) || 1));
/** Angle between two unit vectors, rad. */
export const angleBetween = (a: Vec3, b: Vec3): number => Math.acos(Math.max(-1, Math.min(1, dot(a, b))));

export const rotY = (v: Vec3, a: number): Vec3 => {
  const c = Math.cos(a), s = Math.sin(a);
  return [c * v[0] + s * v[2], v[1], -s * v[0] + c * v[2]];
};

/** The unit vector at a longitude and latitude: (cos lat sin lon, sin lat, cos lat cos lon). */
export const direction = (lon: number, lat: number): Vec3 => [Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon)];
export const lonLatOf = (d: Vec3): { lon: number; lat: number } => ({ lon: Math.atan2(d[0], d[2]), lat: Math.asin(Math.max(-1, Math.min(1, d[1]))) });

/** A unit tangent at `dir`, `angleRad` around it from an arbitrary reference (the original's tangentAt). */
export function tangentAt(dir: Vec3, angleRad: number): Vec3 {
  const e1 = normalize(cross(dir, Math.abs(dir[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0])), e2 = normalize(cross(dir, e1));
  return normalize(add(scale(e1, Math.cos(angleRad)), e2, Math.sin(angleRad)));
}
