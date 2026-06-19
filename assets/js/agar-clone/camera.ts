// camera.ts — viewport that follows the player and zooms out as they grow. In a
// looping world the follow has to move along the shortest wrapped path and keep
// its own position wrapped, or it would fling across the map at the seam. Pure
// geometry — no simulation knowledge — so a future server swap leaves it alone.

import { CONFIG, wrapCoord, wrapDelta } from './config';

export class Camera {
  // Centre of the view, in world coordinates.
  x = CONFIG.WORLD_SIZE / 2;
  y = CONFIG.WORLD_SIZE / 2;
  // World-units → CSS-pixels scale factor.
  zoom = 1;

  // Viewport size in CSS pixels (the canvas' logical size, not its backing store).
  private viewW = 1;
  private viewH = 1;

  setViewport(w: number, h: number): void {
    this.viewW = Math.max(1, w);
    this.viewH = Math.max(1, h);
  }

  // Jump straight to a point (used on spawn/respawn so the world doesn't slide
  // into place and look like the player is auto-moving).
  snapTo(x: number, y: number, radius: number): void {
    this.x = wrapCoord(x);
    this.y = wrapCoord(y);
    const desiredVisibleRadius = Math.min(radius * 9 + 220, CONFIG.WORLD_SIZE * 0.55);
    this.zoom = Math.min(this.viewW, this.viewH) / (2 * desiredVisibleRadius);
  }

  // Ease the camera toward the target each frame, along the shortest wrapped path.
  follow(targetX: number, targetY: number, targetRadius: number, dt: number): void {
    const lerp = 1 - Math.pow(0.0001, dt); // frame-rate independent smoothing
    this.x = wrapCoord(this.x + wrapDelta(targetX, this.x) * lerp);
    this.y = wrapCoord(this.y + wrapDelta(targetY, this.y) * lerp);

    // Show roughly a fixed multiple of the player's radius; clamp so tiny cells
    // aren't absurdly zoomed in and giants don't see the whole map at once.
    const desiredVisibleRadius = Math.min(targetRadius * 9 + 220, CONFIG.WORLD_SIZE * 0.55);
    const targetZoom = Math.min(this.viewW, this.viewH) / (2 * desiredVisibleRadius);
    const zlerp = 1 - Math.pow(0.001, dt);
    this.zoom += (targetZoom - this.zoom) * zlerp;
  }

  // Project a world point to the screen, choosing the wrapped copy nearest the
  // camera so objects across the seam render seamlessly.
  worldToScreenX(wx: number): number {
    return wrapDelta(wx, this.x) * this.zoom + this.viewW / 2;
  }

  worldToScreenY(wy: number): number {
    return wrapDelta(wy, this.y) * this.zoom + this.viewH / 2;
  }

  // Inverse transform — turn a cursor position into a world target.
  screenToWorldX(sx: number): number {
    return wrapCoord((sx - this.viewW / 2) / this.zoom + this.x);
  }

  screenToWorldY(sy: number): number {
    return wrapCoord((sy - this.viewH / 2) / this.zoom + this.y);
  }
}
