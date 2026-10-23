/* One black-hole stage: the GPU pipeline, the loop and the controls. DOM hooks are the data-bh-* attributes in
 * layouts/shortcodes/black-hole/sim.html; the WGSL is in ./shaders.ts.
 *
 * The frame is split by what changes. The lens (every pixel's bent ray, the shadow, the lensed sky) depends only
 * on the view, so it is traced once per preset, tilt, zoom or resize. The gas is re-rendered and re-lit every
 * frame, a few texture taps a pixel. Paused and unchanged, nothing is drawn at all.
 *
 * The render scale follows the GPU's frame time (site/gpu/resolution.ts). A scale change re-traces the lens once,
 * so it is rate-limited; while you drag the tilt every frame re-traces, and those frames are what pull it down. */

import { Bloom } from '../../site/gpu/bloom';
import { BUFFER, TEXTURE, bindGroup, dispatch, startGpu } from '../../site/gpu/device';
import { DynamicResolution, GpuTimer } from '../../site/gpu/resolution';
import { logBandIntensity } from './blackbody';
import { loadFallback } from './fallback/load';
import type { FallbackRenderer } from './fallback/webgl2';
import { BAND_LABELS, PRESETS, colourCorrection, iscoRadius, orbitPeriodM, pageThorneQ, presetByKey, secondsPerM, shadowCentreOffset, temperatureScale } from './presets';
import type { Band, Preset } from './presets';
import { ARM_LIFE_M, FIELD_HEIGHT, FIELD_WIDTH, GAS_ROWS, GAS_WORKGROUP, TABLE_WORKGROUP, fieldShader, meterShader, postShader, shadeShader, traceShader } from './shaders';

/** How long one ISCO orbit takes on screen at each speed, in seconds (0 = paused). */
const RATES: readonly { label: string; iscoSeconds: number }[] = [
  { label: 'Pause', iscoSeconds: 0 },
  { label: 'Slow', iscoSeconds: 6 },
  { label: 'Normal', iscoSeconds: 1.6 },
  { label: 'Fast', iscoSeconds: 0.5 },
];

const DEFAULT_RATE = 2;
const METER_EVERY_FRAMES = 6;
const TILT_DEG_PER_PX = 0.25;
const PARAM_FLOATS = 24;   // shaders.ts Params
/** Camera orbit for the starfield at Normal speed, rad/s; the Speed picker scales it like the disk. */
const SKY_ORBIT_RAD_PER_S = 0.03;
/** Parallax gain: how far the star layers shift for a cursor at the stage edge (the original's 0.012). */
const PARALLAX = 0.012;
/** Bloom on shade's glow target, which already holds only the light above the shoulder: no threshold of its own. */
const BLOOM_SETTINGS = { threshold: 0, knee: 0.01, radius: 1 };

interface Targets {
  readonly width: number;
  readonly height: number;
  readonly textures: GPUTexture[];
  readonly trace: GPUBindGroup;
  readonly shade: GPUBindGroup;
  readonly meter: GPUBindGroup;
  readonly scene: GPUTextureView;
  readonly glow: GPUTextureView;
  readonly composite: GPUBindGroup;
}

interface Pipelines {
  readonly gas: GPUComputePipeline;
  readonly tables: GPUComputePipeline;
  readonly trace: GPUComputePipeline;
  readonly meter: GPUComputePipeline;
  readonly shade: GPURenderPipeline;
  readonly composite: GPURenderPipeline;
}

export class BlackHoleSim {
  private readonly canvas: HTMLCanvasElement;
  private readonly fpsLabel: HTMLElement | null;
  private preset: Preset = PRESETS[0];
  private band: Band = 0;
  private incDeg = PRESETS[0].incDeg;
  private zoom = 1;
  private isSpinAccurate = true;
  private rateIndex = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : DEFAULT_RATE;
  private diskTimeM = 0;
  private skyOrbitRad = 0;
  private cursor: { x: number; y: number } | null = null;
  private parallax = { x: 0, y: 0 };
  private needsTrace = true;
  private needsTables = true;
  private needsDraw = true;
  private isVisible = true;
  private lastFrameMs = 0;
  private framesThisSecond = 0;
  private secondStartedAt = 0;
  private frameCount = 0;

  private gpu: {
    device: GPUDevice; context: GPUCanvasContext; pipes: Pipelines; maxScale: number; bloom: Bloom;
    params: GPUBuffer; meter: GPUBuffer; gasClock: GPUBuffer; field: GPUTexture;
    gasGroup: GPUBindGroup; tablesGroup: GPUBindGroup; wrapLinear: GPUSampler; clampLinear: GPUSampler;
  } | null = null;
  private targets: Targets | null = null;
  /** Without WebGPU: the WebGL2 renderer (fallback/webgl2.ts), and the render size it was last given. */
  private fallback: FallbackRenderer | null = null;
  private fallbackSize: { width: number; height: number } | null = null;
  private resolution: DynamicResolution | null = null;
  private timer: GpuTimer | null = null;
  /** Whether the last animation frame drew: the rAF interval only measures a frame if the one before it drew too. */
  private drewLastFrame = false;
  private readonly paramData = new Float32Array(PARAM_FLOATS);

  constructor(private readonly root: HTMLElement) {
    this.canvas = required<HTMLCanvasElement>(root, '[data-bh-canvas]');
    this.fpsLabel = root.querySelector('[data-bh-fps]');
    const fromHash = presetByKey((location.hash.split('/').pop() ?? '').replace('#', '').toLowerCase());
    this.buildControls();
    this.selectPreset(fromHash ?? PRESETS[0]);
    this.bindStage(required(root, '[data-bh-stage]'));
    void this.start();
  }

  // ---- GPU ----------------------------------------------------------------------------------------------

  private async start(): Promise<void> {
    const gpu = await startGpu(this.canvas, () => this.showMessage('The GPU device was lost. Reload to restart.'));
    if (typeof gpu === 'string') {
      // the canvas is still free for WebGL2 unless WebGPU already claimed it
      const Fallback = gpu === 'no-context' ? null : await loadFallback();
      if (!this.root.isConnected) return;
      this.fallback = Fallback ? Fallback.create(this.canvas) : null;
      if (this.fallback) {
        this.resolution = new DynamicResolution(0.5, this.maxRenderScale());
        requestAnimationFrame(this.tick);
        return;
      }
      this.showMessage(gpu === 'no-webgpu' ? 'This page draws with WebGPU, which this browser does not offer. Recent Chrome, Edge and Safari have it.' : 'WebGPU could not start here.');
      return;
    }
    const { device, context, format } = gpu;

    const module = (code: string): GPUShaderModule => device.createShaderModule({ code });
    const compute = (code: GPUShaderModule, entryPoint: string): GPUComputePipeline => device.createComputePipeline({ layout: 'auto', compute: { module: code, entryPoint } });
    const render = (code: GPUShaderModule, entryPoint: string, target: GPUTextureFormat): GPURenderPipeline =>
      device.createRenderPipeline({ layout: 'auto', vertex: { module: code, entryPoint: 'vs' }, fragment: { module: code, entryPoint, targets: [{ format: target }] } });
    const field = module(fieldShader), post = module(postShader), shadeModule = module(shadeShader);
    const pipes: Pipelines = {
      gas: compute(field, 'gas'), tables: compute(field, 'tables'), trace: compute(module(traceShader), 'trace'), meter: compute(module(meterShader), 'meterStep'),
      shade: device.createRenderPipeline({ layout: 'auto', vertex: { module: shadeModule, entryPoint: 'vs' }, fragment: { module: shadeModule, entryPoint: 'fs', targets: [{ format: 'rgba16float' }, { format: 'rgba16float' }] } }),
      composite: render(post, 'composite', format),
    };
    const params = device.createBuffer({ size: PARAM_FLOATS * 4, usage: BUFFER.UNIFORM | BUFFER.COPY_DST });
    const meter = device.createBuffer({ size: 16, usage: BUFFER.STORAGE | BUFFER.COPY_DST });
    const gasClock = device.createBuffer({ size: this.clockData.byteLength, usage: BUFFER.STORAGE | BUFFER.COPY_DST });
    const fieldTex = device.createTexture({ size: [FIELD_WIDTH, FIELD_HEIGHT], format: 'rgba16float', usage: TEXTURE.STORAGE_BINDING | TEXTURE.TEXTURE_BINDING });
    this.gpu = {
      device, context, pipes, params, meter, gasClock, field: fieldTex, maxScale: gpu.tier.maxScale, bloom: new Bloom(device, BLOOM_SETTINGS),
      gasGroup: bindGroup(device, pipes.gas, [{ buffer: params }, fieldTex.createView(), { buffer: gasClock }]),
      tablesGroup: bindGroup(device, pipes.tables, [{ buffer: params }, fieldTex.createView()]),
      wrapLinear: device.createSampler({ magFilter: 'linear', minFilter: 'linear', addressModeU: 'repeat' }),
      clampLinear: device.createSampler({ magFilter: 'linear', minFilter: 'linear' }),
    };
    this.resolution = new DynamicResolution(0.5, this.maxRenderScale());
    this.timer = gpu.hasTimestamps ? new GpuTimer(device) : null;
    this.resetExposure();
    requestAnimationFrame(this.tick);
  }

  private buildTargets(width: number, height: number): Targets {
    const gpu = this.gpu!;
    this.targets?.textures.forEach((t) => t.destroy());
    const storage = TEXTURE.STORAGE_BINDING | TEXTURE.TEXTURE_BINDING;
    const attachment = TEXTURE.RENDER_ATTACHMENT | TEXTURE.TEXTURE_BINDING;
    const make = (w: number, h: number, format: GPUTextureFormat, usage: number): GPUTexture =>
      gpu.device.createTexture({ size: [Math.max(1, w), Math.max(1, h)], format, usage });
    const geo1 = make(width, height, 'rgba32float', storage), geo2 = make(width, height, 'rgba32float', storage);
    const ring = make(width, height, 'rgba32float', storage), sky = make(width, height, 'rgba32float', storage);
    const scene = make(width, height, 'rgba16float', attachment), glow = make(width, height, 'rgba16float', attachment);
    const { pipes, device } = gpu;
    gpu.bloom.resize(glow);
    return {
      width, height,
      textures: [geo1, geo2, ring, sky, scene, glow],
      trace: bindGroup(device, pipes.trace, [{ buffer: gpu.params }, geo1.createView(), geo2.createView(), ring.createView(), sky.createView()]),
      shade: bindGroup(device, pipes.shade, [{ buffer: gpu.params }, gpu.field.createView(), gpu.wrapLinear, geo1.createView(), geo2.createView(), ring.createView(), sky.createView(), { buffer: gpu.meter }]),
      meter: bindGroup(device, pipes.meter, [scene.createView(), { buffer: gpu.meter }]),
      scene: scene.createView(), glow: glow.createView(),
      composite: bindGroup(device, pipes.composite, [{ buffer: gpu.params }, scene.createView(), gpu.clampLinear, gpu.bloom.output.createView()]),
    };
  }

  private readonly tick = (now: number): void => {
    if (!this.root.isConnected) { this.gpu?.bloom.destroy(); this.gpu?.device.destroy(); this.fallback?.destroy(); return; }   // hx-boost swapped the page out
    requestAnimationFrame(this.tick);
    const dt = Math.min(0.1, Math.max(0, (now - this.lastFrameMs) / 1000));
    this.lastFrameMs = now;
    if ((!this.gpu && !this.fallback) || !this.isVisible || document.hidden) return;
    const rate = this.diskRateMPerSecond(), speed = this.clockSpeed();
    if (rate > 0) this.diskTimeM += dt * rate;
    if (speed > 0) { this.skyOrbitRad += dt * SKY_ORBIT_RAD_PER_S * speed; this.easeParallax(now, dt); this.needsDraw = true; }
    this.resize();
    if (!this.needsDraw && !this.needsTrace) { this.drewLastFrame = false; return; }
    this.draw();
    if (this.timer || this.drewLastFrame) this.resolution!.sample(this.timer ? this.timer.lastMs : dt * 1000, now, this.timer !== null);
    this.drewLastFrame = true;
    this.countFrame(now);
  };

  private draw(): void {
    if (this.fallback) { this.drawFallback(); return; }
    const gpu = this.gpu!, targets = this.targets!, { device, pipes } = gpu;
    this.writeParams();
    const encoder = device.createCommandEncoder();
    this.timer?.start(encoder);
    if (this.needsTables) { dispatch(encoder, pipes.tables, gpu.tablesGroup, Math.ceil(FIELD_WIDTH / TABLE_WORKGROUP)); this.needsTables = false; }
    if (this.needsTrace) { dispatch(encoder, pipes.trace, targets.trace, Math.ceil(targets.width / 8), Math.ceil(targets.height / 8)); this.needsTrace = false; }
    dispatch(encoder, pipes.gas, gpu.gasGroup, Math.ceil(FIELD_WIDTH / GAS_WORKGROUP[0]), Math.ceil(GAS_ROWS / GAS_WORKGROUP[1]));
    const shadePass = encoder.beginRenderPass({ colorAttachments: [targets.scene, targets.glow].map((view) => ({ view, loadOp: 'clear' as const, storeOp: 'store' as const, clearValue: { r: 0, g: 0, b: 0, a: 1 } })) });
    shadePass.setPipeline(pipes.shade); shadePass.setBindGroup(0, targets.shade); shadePass.draw(3); shadePass.end();
    if (this.preset.rOut > 0 && this.frameCount++ % METER_EVERY_FRAMES === 0) dispatch(encoder, pipes.meter, targets.meter, 1);
    gpu.bloom.encode(encoder);
    const composite = encoder.beginRenderPass({
      colorAttachments: [{ view: gpu.context.getCurrentTexture().createView(), loadOp: 'clear', storeOp: 'store', clearValue: { r: 0, g: 0, b: 0, a: 1 } }],
      timestampWrites: this.timer ? this.timer.end : undefined,
    });
    composite.setPipeline(pipes.composite); composite.setBindGroup(0, targets.composite); composite.draw(3); composite.end();
    const timed = this.timer?.collect(encoder) ?? false;
    device.queue.submit([encoder.finish()]);
    if (timed) this.timer!.read();
    // a disk that is still settling its exposure keeps drawing while paused, until the meter has had its say
    this.needsDraw = this.frameCount < 90 && this.preset.rOut > 0;
  }

  /** The same frame through WebGL2: the same Params and gas clock; no meter, so nothing left to settle. */
  private drawFallback(): void {
    const { width, height } = this.fallbackSize!;
    this.computeParams(width, height);
    this.fallback!.draw({
      params: this.paramData, gasClock: this.clockData, needsTrace: this.needsTrace, needsTables: this.needsTables,
      width, height, bloom: BLOOM_SETTINGS,
    });
    this.needsTrace = this.needsTables = this.needsDraw = false;
  }

  private resize(): void {
    const box = this.canvas.getBoundingClientRect();
    const ratio = this.renderScale();
    const width = Math.max(8, Math.round(box.width * ratio)), height = Math.max(8, Math.round(box.height * ratio));
    const size = this.targets ?? this.fallbackSize;
    if (size && size.width === width && size.height === height) return;
    this.canvas.width = width; this.canvas.height = height;
    if (this.fallback) this.fallbackSize = { width, height };
    else this.targets = this.buildTargets(width, height);
    this.needsTrace = true;
  }

  private writeParams(): void {
    const targets = this.targets!, gpu = this.gpu!;
    this.computeParams(targets.width, targets.height);
    gpu.device.queue.writeBuffer(gpu.params, 0, this.paramData);
    gpu.device.queue.writeBuffer(gpu.gasClock, 0, this.clockData);
  }

  /** Fill paramData (shaders.ts Params) and clockData for a render target of this size. */
  private computeParams(width: number, height: number): void {
    const p = this.preset, inc = this.incDeg * Math.PI / 180, risco = p.rOut > 0 ? iscoRadius(p.spin) : 6;
    // fit the disk: its full width, and its projected height at this tilt (never under a third of the radius,
    // which leaves room for the far side lensed up over the shadow when edge-on)
    const extent = p.rOut > 0 ? p.rOut * 1.05 : 22;
    const halfHeight = Math.max(extent * Math.abs(Math.cos(inc)), extent * 0.3) + 4;
    const pxPerM = this.zoom * Math.min(width * 0.46 / extent, height * 0.46 / halfHeight);
    const cssHeight = height / this.renderScale();
    this.paramData.set([
      // frame the shadow, not the hole: with spin its middle sits ~2 M to one side
      width, height, width * 0.5 - (this.isSpinAccurate ? shadowCentreOffset(p.spin, inc) * pxPerM : 0), height * 0.5,
      pxPerM, inc, p.spin, risco,
      p.rOut, p.hr, temperatureScale(p), p.tSlope,
      p.beam, this.band, this.isSpinAccurate ? 1 : 0, this.exposureSeed,
      cssHeight / 600, p.bloom, Math.log(risco * 0.95), Math.log(Math.max(p.rOut, 1) * 1.05),
      // the original's camera drift: the sky slides as the camera orbits, bobbing with a slow tilt
      -this.skyOrbitRad * 0.25, 0.35 * Math.sin(this.skyOrbitRad * 0.6) * 0.25, this.parallax.x * PARALLAX, this.parallax.y * PARALLAX,
    ]);
    this.writeGasClock(this.paramData[18], this.paramData[19]);
  }

  /** Render px per CSS px: what the frame time allows (DynamicResolution), up to maxRenderScale. */
  private renderScale(): number { return this.resolution?.scale ?? this.maxRenderScale(); }

  /** The screen's px per CSS px, capped by what the GPU's quality tier can afford (site/gpu/tier.ts). */
  private maxRenderScale(): number { return Math.min(window.devicePixelRatio || 1, this.gpu?.maxScale ?? 1.5); }

  private readonly clockData = new Float32Array(GAS_ROWS + 12);

  /** The disk clock reduced in double precision: each gas row's phase Omega(r) t mod 2 pi, then each arm's
   *  (cycle, age). Arms are staggered by a sixth of a life and reborn with a new shape each cycle. */
  private writeGasClock(logR0: number, logR1: number): void {
    const t = this.diskTimeM, spin = this.preset.spin;
    for (let row = 0; row < GAS_ROWS; row++) {
      const r = Math.exp(logR0 + (row + 0.5) / GAS_ROWS * (logR1 - logR0));
      this.clockData[row] = (t / (Math.pow(r, 1.5) + spin)) % (2 * Math.PI);
    }
    for (let arm = 0; arm < 6; arm++) {
      const cycle = Math.floor(t / ARM_LIFE_M - arm / 6);
      this.clockData[GAS_ROWS + 2 * arm] = cycle % 4096;   // only feeds the per-cycle pseudo-random shape
      this.clockData[GAS_ROWS + 2 * arm + 1] = t - (arm / 6 + cycle) * ARM_LIFE_M;
    }
  }

  // ---- exposure ------------------------------------------------------------------------------------------

  private exposureSeed = 0;

  /** The face-on thin disk's area-weighted log-mean intensity at 0.45 of white, its peak at most 8x white;
   *  a band the disk barely emits in is never exposed more than 10^6 x brighter than visible light. */
  private resetExposure(): void {
    const p = this.preset;
    if (p.rOut <= 0) { this.exposureSeed = 0; return; }
    const risco = iscoRadius(p.spin), t0 = temperatureScale(p);
    const expose = (band: Band): number => {
      let peak = -Infinity, sum = 0, weight = 0;
      for (let r = risco + 0.01; r < p.rOut; r += 0.05) {
        const te = diskTemperature(p, risco, t0, r), f = colourCorrection(te);
        const T = f * te * Math.pow(circularRedshift(p.spin, r), p.beam);
        if (T < 1000) continue;
        const logY = logBandIntensity(T, band) - 4 * Math.log10(f);   // shaders.ts diskLight
        peak = Math.max(peak, logY); sum += logY * r; weight += r;
      }
      return Math.max(sum / Math.max(weight, 1e-9) - Math.log10(0.45), peak - Math.log10(8));
    };
    const seed = expose(this.band);
    this.exposureSeed = this.band === 0 ? seed : Math.max(seed, expose(0) - 6);
    this.gpu?.device.queue.writeBuffer(this.gpu.meter, 0, new Float32Array([0, 0, 0, 0]));
    this.frameCount = 0;
  }

  // ---- state ---------------------------------------------------------------------------------------------

  private selectPreset(preset: Preset): void {
    this.preset = preset;
    this.band = preset.band;
    this.incDeg = preset.incDeg;
    this.zoom = 1;
    this.diskTimeM = 0;
    if (location.hash !== '#' + preset.key) history.replaceState(null, '', '#' + preset.key);
    this.resetExposure();
    this.needsTables = this.needsTrace = this.needsDraw = true;
    this.syncControls();
  }

  private selectBand(band: Band): void {
    this.band = band;
    this.resetExposure();
    this.needsTables = this.needsDraw = true;
    this.syncControls();
  }

  private setTilt(deg: number): void {
    this.incDeg = Math.min(89, Math.max(2, deg));
    this.needsTrace = this.needsDraw = true;
    this.syncControls();
  }

  private setZoom(zoom: number): void {
    this.zoom = Math.min(4, Math.max(0.5, zoom));
    this.needsTrace = this.needsDraw = true;
  }

  /** The Speed picker as a multiple of Normal (0 = paused). */
  private clockSpeed(): number {
    const seconds = RATES[this.rateIndex].iscoSeconds;
    return seconds > 0 ? RATES[DEFAULT_RATE].iscoSeconds / seconds : 0;
  }

  /** Star layers follow the cursor over the stage; left alone they wander on a slow Lissajous, as the original's did. */
  private easeParallax(now: number, dt: number): void {
    const t = now / 1000;
    const aim = this.cursor ?? { x: Math.sin(t * 0.17) * 0.35, y: Math.cos(t * 0.13) * 0.25 };
    const k = 1 - Math.exp(-dt * 3.7);   // the original's 0.06 per frame at 60 fps, made frame-rate independent
    this.parallax.x += (aim.x - this.parallax.x) * k;
    this.parallax.y += (aim.y - this.parallax.y) * k;
  }

  private diskRateMPerSecond(): number {
    const seconds = RATES[this.rateIndex].iscoSeconds;
    if (seconds <= 0 || this.preset.rOut <= 0) return 0;
    return orbitPeriodM(iscoRadius(this.preset.spin), this.preset.spin) / seconds;
  }

  // ---- controls ------------------------------------------------------------------------------------------

  private presetSelect: HTMLSelectElement | null = null;
  private bandSelect: HTMLSelectElement | null = null;
  private rateSelect: HTMLSelectElement | null = null;
  private spinButton: HTMLButtonElement | null = null;
  private tiltInput: HTMLInputElement | null = null;

  private buildControls(): void {
    const fill = (selector: string, options: readonly { label: string; title: string }[], onSelect: (i: number) => void): HTMLSelectElement => {
      const select = required<HTMLSelectElement>(this.root, selector);
      options.forEach((o, i) => { const option = new Option(o.label, String(i)); option.title = o.title; select.append(option); });
      select.addEventListener('change', () => onSelect(select.selectedIndex));
      return select;
    };
    this.presetSelect = fill('[data-bh-presets]', PRESETS.map((p) => ({ label: p.label, title: p.note })), (i) => this.selectPreset(PRESETS[i]));
    this.bandSelect = fill('[data-bh-bands]', BAND_LABELS.map((label) => ({ label, title: '' })), (i) => this.selectBand(i as Band));
    this.rateSelect = fill('[data-bh-rates]', RATES.map((r) => ({ label: r.label, title: '' })), (i) => { this.rateIndex = i; this.syncControls(); });
    const chip = (host: HTMLElement, label: string, title: string, onClick: () => void): HTMLButtonElement => {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'sim-switch'; button.textContent = label; button.title = title;
      button.addEventListener('click', onClick);
      host.append(button);
      return button;
    };
    this.spinButton = chip(required(this.root, '[data-bh-lens]'), 'Spinning',   // reads as Lens: Spinning
      'On: light bends around the spinning hole’s real shadow, flattened on the side turning toward you. Off: the lens is drawn as if the hole did not spin, a round centred shadow like the original page.',
      () => { this.isSpinAccurate = !this.isSpinAccurate; this.needsTrace = this.needsDraw = true; this.syncControls(); });
    this.tiltInput = this.root.querySelector<HTMLInputElement>('[data-bh-tilt]');
    this.tiltInput?.addEventListener('input', () => this.setTilt(Number(this.tiltInput!.value)));
  }

  private syncControls(): void {
    const hasDisk = this.preset.rOut > 0;
    if (this.presetSelect) this.presetSelect.selectedIndex = PRESETS.indexOf(this.preset);
    if (this.bandSelect) { this.bandSelect.selectedIndex = this.band; this.bandSelect.disabled = !hasDisk; }
    if (this.rateSelect) this.rateSelect.selectedIndex = this.rateIndex;   // it runs the sky too
    if (this.spinButton) { this.spinButton.setAttribute('aria-pressed', String(this.isSpinAccurate)); this.spinButton.disabled = this.preset.spin <= 0 || !hasDisk; }
    if (this.tiltInput) { this.tiltInput.value = String(Math.round(this.incDeg)); this.tiltInput.disabled = !hasDisk; }
    const tiltValue = this.root.querySelector('[data-bh-tilt-value]');
    if (tiltValue) tiltValue.textContent = hasDisk ? `${Math.round(this.incDeg)}°` : '';
    this.root.querySelector('[data-bh-canvas]')?.setAttribute('aria-label', `Ray-traced black hole, ${this.preset.label}: ${this.preset.note}`);
    this.writeReadout();
  }

  private writeReadout(): void {
    const host = this.root.querySelector<HTMLElement>('[data-bh-readout]');
    if (!host) return;
    const p = this.preset, rows: [string, string][] = [['Preset', p.note], ['Mass', `${formatMass(p.massSun)} M☉`], ['Spin', `a = ${p.spin}`]];
    if (p.rOut > 0) {
      const risco = iscoRadius(p.spin), mKm = 1.4766 * p.massSun;
      const seconds = RATES[this.rateIndex].iscoSeconds;
      const peak = peakTemperature(p), hardened = colourCorrection(peak) * peak;
      rows.push(
        ['Inclination', `${Math.round(this.incDeg)}°`],
        ['ISCO radius', `${risco.toFixed(2)} M · ${formatLength(risco * mKm)}`],
        ['ISCO orbit', formatDuration(orbitPeriodM(risco, p.spin) * secondsPerM(p.massSun))],
        ['Peak T_eff', formatTemperature(peak)],
      );
      // a hot disk's scattering atmosphere shows a harder spectrum than its T_eff (presets.ts colourCorrection)
      if (hardened > peak * 1.05) rows.push(['Colour temperature', `${formatTemperature(hardened)} · ${(hardened * 8.617e-8).toFixed(1)} keV`]);
      rows.push(
        ['Clock', seconds > 0 ? `1 s here ≈ ${formatDuration(this.diskRateMPerSecond() * secondsPerM(p.massSun))}` : 'paused'],
      );
    } else {
      rows.push(['Shadow radius', `${(3 * Math.sqrt(3)).toFixed(2)} M · ${formatLength(3 * Math.sqrt(3) * 1.4766 * p.massSun)}`]);
    }
    // each pair in its own <div>, so the grid lays out term-value pairs rather than loose terms and values
    host.replaceChildren(...rows.map(([term, value]) => {
      const row = document.createElement('div'), dt = document.createElement('dt'), dd = document.createElement('dd');
      dt.textContent = term; dd.textContent = value;
      row.append(dt, dd);
      row.classList.toggle('is-wide', value.length > 24);   // a sentence-long value takes two cells (sim/panel.css)
      return row;
    }));
  }

  private bindStage(stage: HTMLElement): void {
    let dragY: number | null = null;
    stage.addEventListener('pointerdown', (e) => { if (this.preset.rOut <= 0) return; dragY = e.clientY; stage.setPointerCapture(e.pointerId); });
    stage.addEventListener('pointermove', (e) => {
      const box = stage.getBoundingClientRect();
      this.cursor = { x: (e.clientX - box.left) / box.width * 2 - 1, y: 1 - (e.clientY - box.top) / box.height * 2 };
      if (dragY === null) return;
      this.setTilt(this.incDeg + (e.clientY - dragY) * TILT_DEG_PER_PX);
      dragY = e.clientY;
    });
    const endDrag = (): void => { dragY = null; };
    stage.addEventListener('pointerup', endDrag);
    stage.addEventListener('pointercancel', endDrag);
    stage.addEventListener('pointerleave', () => { this.cursor = null; });
    stage.addEventListener('wheel', (e) => { e.preventDefault(); this.setZoom(this.zoom * Math.exp(-e.deltaY * 0.0015)); }, { passive: false });
    stage.addEventListener('dblclick', () => { this.setZoom(1); this.setTilt(this.preset.incDeg); });
    // the keyboard's way to the same: + and - zoom, the up and down arrows tilt, 0 resets (the stage is focusable)
    stage.addEventListener('keydown', (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tilt = this.preset.rOut > 0 ? 2 : 0;
      if (e.key === '+' || e.key === '=') this.setZoom(this.zoom * 1.15);
      else if (e.key === '-' || e.key === '_') this.setZoom(this.zoom / 1.15);
      else if (e.key === 'ArrowUp' && tilt) this.setTilt(this.incDeg - tilt);
      else if (e.key === 'ArrowDown' && tilt) this.setTilt(this.incDeg + tilt);
      else if (e.key === '0') { this.setZoom(1); this.setTilt(this.preset.incDeg); }
      else return;
      e.preventDefault();
    });
    new IntersectionObserver((entries) => {
      this.isVisible = entries[0]?.isIntersecting ?? true;
      this.needsDraw = true;
    }).observe(stage);
  }

  private showMessage(text: string): void {
    const message = this.root.querySelector<HTMLElement>('[data-bh-message]');
    if (!message) return;
    message.textContent = text;
    message.hidden = false;
  }

  private countFrame(now: number): void {
    this.framesThisSecond++;
    if (now - this.secondStartedAt < 1000) return;
    if (this.fpsLabel) this.fpsLabel.textContent = `${Math.round(this.framesThisSecond * 1000 / (now - this.secondStartedAt))} fps`;
    this.framesThisSecond = 0;
    this.secondStartedAt = now;
  }
}

// ---- helpers ---------------------------------------------------------------------------------------------

function required<T extends Element = HTMLElement>(root: ParentNode, selector: string): T {
  const node = root.querySelector<T>(selector);
  if (!node) throw new Error(`black-hole: missing ${selector} (layouts/shortcodes/black-hole/sim.html)`);
  return node;
}

/** g = 1 / (u^t (1 - Omega L)) for a prograde circular orbit at r, photon L = 0 (the face-on view). */
function circularRedshift(spin: number, r: number): number {
  const omega = 1 / (Math.pow(r, 1.5) + spin), gtt = -(1 - 2 / r), gtp = -2 * spin / r, gpp = r * r + spin * spin + 2 * spin * spin / r;
  return Math.sqrt(Math.max(-(gtt + 2 * gtp * omega + gpp * omega * omega), 1e-6));
}

/** The disk's rest-frame effective temperature at r (shaders.ts tempAt, for unit surface density): a power law in
 *  r with the relativistic zero-torque inner edge (Page & Thorne) at the ISCO. */
function diskTemperature(p: Preset, risco: number, t0: number, r: number): number {
  return t0 * Math.pow(r, -p.tSlope) * Math.pow(risco, p.tSlope - 0.75) * Math.pow(pageThorneQ(r, p.spin), 0.25);
}

/** The hottest effective temperature on the disk, in the gas's own frame. */
function peakTemperature(p: Preset): number {
  const risco = iscoRadius(p.spin), t0 = temperatureScale(p);
  let peak = 0;
  for (let r = risco + 0.005; r < p.rOut; r += 0.01) peak = Math.max(peak, diskTemperature(p, risco, t0, r));
  return peak;
}

function formatMass(m: number): string {
  if (m < 1000) return String(m);
  const exp = Math.floor(Math.log10(m)), mant = m / Math.pow(10, exp);
  const sup = String(exp).replace(/\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(d)]);
  return mant === 1 ? `10${sup}` : `${+mant.toFixed(1)} × 10${sup}`;
}

function formatLength(km: number): string {
  if (km < 1e4) return `${Math.round(km)} km`;
  const au = km / 1.496e8;
  return au < 0.1 ? `${(km / 1e6).toFixed(1)} million km` : `${au.toFixed(au < 10 ? 2 : 0)} AU`;
}

function formatDuration(s: number): string {
  if (s < 1) return `${(s * 1000).toPrecision(2)} ms`;
  if (s < 120) return `${s.toPrecision(2)} s`;
  if (s < 7200) return `${(s / 60).toPrecision(2)} min`;
  if (s < 172800) return `${(s / 3600).toPrecision(2)} h`;
  return `${(s / 86400).toPrecision(2)} days`;
}

function formatTemperature(k: number): string {
  return k < 1e5 ? `${Math.round(k / 100) * 100} K` : `${(k / 1e6).toPrecision(2)} million K`;
}
