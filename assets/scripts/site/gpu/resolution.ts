/* Dynamic resolution: the render scale (render px per CSS px) follows the GPU's frame time toward a budget.
 * With 'timestamp-query' it reads the GPU's own time for the frame; without (Safari, Firefox), the rAF interval,
 * which also counts vsync waits: that one is judged against the display's own refresh, so it only steps down
 * when frames are actually being dropped. Steps are coarse and rate-limited because every change reallocates
 * the render targets. */

import { BUFFER, MAP_MODE } from './device';

const STEP = 0.125;
const SETTLE_MS = 600;
/** The longest display refresh interval assumed (57 Hz, a little under 60 for jitter). */
const REFRESH_CAP_MS = 17.5;

export class DynamicResolution {
  private emaMs = 0;
  private lastChange = 0;
  /** The shortest rAF interval seen lately: the display's refresh, which a vsynced frame can't beat. */
  private refreshMs = 0;
  scale: number;

  constructor(private readonly minScale: number, private readonly maxScale: number, private readonly budgetMs = 13) {
    this.scale = maxScale;
  }

  /** Feed one frame's cost; true when the scale changed and targets need rebuilding. */
  sample(frameMs: number, now: number, fromGpuClock: boolean): boolean {
    if (!(frameMs > 0) || frameMs > 250) return false;   // a tab switch or a debugger pause, not a frame
    this.emaMs = this.emaMs === 0 ? frameMs : this.emaMs + (frameMs - this.emaMs) * 0.08;
    // the floor creeps up slowly, so a refresh-rate change (a laptop leaving 120 Hz) is picked up in a few seconds
    // (never above 60 Hz's interval: a GPU that holds a steady 30 fps is slow, not on a 30 Hz screen)
    if (!fromGpuClock) this.refreshMs = Math.min(REFRESH_CAP_MS, this.refreshMs === 0 ? frameMs : Math.min(frameMs, this.refreshMs * 1.002));
    if (now - this.lastChange < SETTLE_MS) return false;
    // a 60 Hz display shows 16.7 ms between frames however light the frame is: without the GPU clock, only a
    // frame well past one refresh interval says the GPU is behind (it used to read every 60 Hz frame as too slow)
    const limit = fromGpuClock ? this.budgetMs * 1.15 : Math.max(this.budgetMs * 1.15, this.refreshMs * 1.3);
    let next = this.scale;
    if (this.emaMs > limit) next = this.scale - STEP;
    // the rAF interval never drops below the display's refresh, so without the GPU clock only step down
    else if (fromGpuClock && this.emaMs < this.budgetMs * 0.6) next = this.scale + STEP;
    next = Math.min(this.maxScale, Math.max(this.minScale, next));
    if (next === this.scale) return false;
    this.scale = next;
    this.lastChange = now;
    this.emaMs = 0;
    return true;
  }
}

/** GPU time between the start of the first pass and the end of the last, read back without stalling:
 *  a frame's result arrives a frame or two later. */
export class GpuTimer {
  private readonly query: GPUQuerySet;
  private readonly resolve: GPUBuffer;
  private readonly readback: GPUBuffer;
  private pending = false;
  lastMs = 0;

  constructor(device: GPUDevice) {
    this.query = device.createQuerySet({ type: 'timestamp', count: 2 });
    this.resolve = device.createBuffer({ size: 16, usage: BUFFER.QUERY_RESOLVE | BUFFER.COPY_SRC });
    this.readback = device.createBuffer({ size: 16, usage: BUFFER.COPY_DST | BUFFER.MAP_READ });
  }

  /** Call first in the frame's encoder: an empty pass stamps the start, so the compute work before the first
   *  render pass is timed too. */
  start(encoder: GPUCommandEncoder): void {
    encoder.beginComputePass({ timestampWrites: { querySet: this.query, beginningOfPassWriteIndex: 0 } }).end();
  }

  /** Timestamp writes for the frame's last pass. */
  get end(): GPURenderPassTimestampWrites { return { querySet: this.query, endOfPassWriteIndex: 1 }; }

  /** Call after the frame's last pass, before finish(). Skips frames while a readback is still in flight. */
  collect(encoder: GPUCommandEncoder): boolean {
    if (this.pending) return false;
    encoder.resolveQuerySet(this.query, 0, 2, this.resolve, 0);
    encoder.copyBufferToBuffer(this.resolve, 0, this.readback, 0, 16);
    return true;
  }

  /** After submit: start the async read of what collect() queued. */
  read(): void {
    if (this.pending) return;
    this.pending = true;
    this.readback.mapAsync(MAP_MODE.READ).then(() => {
      const t = new BigInt64Array(this.readback.getMappedRange());
      const ns = Number(t[1] - t[0]);
      this.readback.unmap();
      if (ns > 0) this.lastMs = ns / 1e6;
      this.pending = false;
    }, () => { this.pending = false; });
  }
}
