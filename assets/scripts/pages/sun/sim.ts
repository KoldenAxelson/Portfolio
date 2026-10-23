/* One star stage: the clocks, the field, the GPU pipeline and the pickers. DOM hooks are the data-sun-* attributes
 * in layouts/shortcodes/sun/sim.html.
 *
 * Per frame: the clocks advance, the regions evolve (CPU), the field maps rebuild when the field moved
 * (fieldmaps.ts), the surface flow steps (flow.ts), the view's pipeline draws the star into an HDR target
 * (shaders/star.ts), the mip-chain bloom runs, and the tone map writes the canvas (shaders/post.ts). */

import { BUFFER, FULLSCREEN_VS, SHADER_STAGE, TEXTURE, bindGroup, startGpu } from '../../site/gpu/device';
import type { Gpu } from '../../site/gpu/device';
import { Bloom } from '../../site/gpu/bloom';
import { DynamicResolution, GpuTimer } from '../../site/gpu/resolution';
import { Clock, DEFAULT_RATE_INDEX, RATES } from './clock';
import { StarField, seededRandom } from './field';
import { FieldMaps } from './fieldmaps';
import { FrictionalField } from './frictional';
import { SurfaceFlow } from './flow';
import { POST_SHADER } from './shaders/post';
import { FRAME_FLOATS, STAR_SHADER } from './shaders/star';
import { LAYER_FORMAT } from './layer';
import { Cmes } from './cmes';
import { EventLoops } from './loops';
import { Strings } from './strings';
import { loadFallback } from './fallback/load';
import type { FallbackRenderer } from './fallback/webgl2';
import { BLOOM_SETTINGS, BLOOM_STRENGTH, PARALLAX, framing } from './framing';
import { WIND_CLOCK_WRAP_S } from './shaders/strings';
import type { LayerDrawer, LayerFrame } from './layer';
import { SATURATED_ACTIVITY, STARS, coronaHeightScale, derive, starByKey } from './stars';
import type { Derived, StarPreset } from './stars';
import { VIEWS, WHITE_LIGHT, euvExposure, viewByKey } from './views';
import type { View } from './views';

const SCENE_FORMAT: GPUTextureFormat = 'rgba16float';
/** A drag above the limb pushes the string nodes within this many radii of the pointer (the original's 0.15). */
const SKY_PUSH_RADIUS_R = 0.15;
/** Device-pixel cap for the WebGL2 fallback, which has no dynamic resolution. */
const FALLBACK_MAX_SCALE = 1.5;
/** Traced field lines per tier: open (wind) strings and closed EUV loops. Low keeps the original's 1400 + 2000; the
 *  bigger GPUs draw more for finer structure (strings.ts keeps the brightness calibrated at any count). */
const STRING_COUNTS = { low: [1400, 2000], medium: [2100, 3000], high: [2800, 4000] } as const;   // subtle: the original had none in star mode and its views were fitted without it

export class SunSim {
  private star: StarPreset = STARS[0];
  private derived: Derived = derive(STARS[0]);
  private view: View = VIEWS[0];
  private readonly clock: Clock;
  private field: StarField;
  private gpu: Gpu | null = null;
  private maps: FieldMaps | null = null;
  private flow: SurfaceFlow | null = null;
  private strings: Strings | null = null;
  private frictional: FrictionalField | null = null;
  private loops: EventLoops | null = null;
  private cmes: Cmes | null = null;
  private frameCount = 0;
  private flowWidth = 0;
  private resolution: DynamicResolution | null = null;
  private timer: GpuTimer | null = null;
  /** Everything that draws into the loop layer (strings.ts, loops.ts), in draw order. */
  private layerDrawers: LayerDrawer[] = [];
  private readonly frameData = new Float32Array(FRAME_FLOATS);
  private mouse = { x: 0, y: 0 };
  private aim: { x: number; y: number } | null = null;
  /** A press that started off the disc, while it drags: the last sky point (R) and its event time (ms). */
  private skyDrag: { x: number; y: number; ms: number } | null = null;
  /** The WebGL2 renderer, when this browser has no WebGPU: the star, its field and field lines, no events. */
  private fallback: FallbackRenderer | null = null;
  private lastMs = 0;
  private isVisible = true;
  private fpsFrames = 0;
  private fpsSince = 0;
  /** Removes the document-level key handler when hx-boost swaps the page out. */
  private readonly listeners = new AbortController();

  private render: {
    layout: GPUBindGroupLayout; pipelineLayout: GPUPipelineLayout; module: GPUShaderModule;
    pipelines: Map<number, GPURenderPipeline>; frame: GPUBuffer; loopLayer: GPUTexture | null;
    post: GPURenderPipeline; postParams: GPUBuffer; linear: GPUSampler;
    scene: GPUTexture | null; bloom: Bloom; width: number; height: number;
  } | null = null;

  constructor(private readonly root: HTMLElement) {
    const [viewKey, starKey] = location.hash.replace('#', '').split('/');
    this.star = starByKey(starKey ?? '') ?? STARS[0];
    this.view = viewByKey(viewKey ?? '') ?? VIEWS[0];
    this.derived = derive(this.star);
    this.clock = new Clock(this.star, this.derived);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) this.clock.rateIndex = 0;
    this.field = new StarField(this.derived, this.star.radius, seededRandom(hashKey(this.star.key)));
    this.buildControls();
    this.bindStage(required(root, '[data-sun-stage]'));
    this.syncControls();
    void this.start();
  }

  // ---- GPU -------------------------------------------------------------------------------------------------

  private async start(): Promise<void> {
    const canvas = required<HTMLCanvasElement>(this.root, '[data-sun-canvas]');
    const gpu = await startGpu(canvas, () => this.showMessage('The GPU was reset. Reload the page to restart the star.'));
    if (typeof gpu === 'string') {
      // the canvas is still free for WebGL2 unless WebGPU already claimed it
      const Fallback = gpu === 'no-context' ? null : await loadFallback();
      if (!this.root.isConnected) { this.destroy(); return; }
      this.fallback = Fallback ? Fallback.create(canvas) : null;
      if (this.fallback) {
        const label = this.root.querySelector<HTMLElement>('[data-sun-tier]');
        if (label) label.textContent = 'WebGL2 fallback';
        requestAnimationFrame(this.tick);
        return;
      }
      this.showMessage(gpu === 'no-webgpu' ? 'This page draws with WebGPU, which this browser does not offer. Recent Chrome, Edge and Safari have it.' : 'WebGPU could not start here.');
      return;
    }
    this.gpu = gpu;
    const { device } = gpu;
    const tierLabel = this.root.querySelector<HTMLElement>('[data-sun-tier]');
    if (tierLabel) tierLabel.textContent = `${gpu.tier.name} tier`;
    const frictional = this.frictional = new FrictionalField(device, gpu.tier.frictionalGrid);
    this.maps = new FieldMaps(device, { view: frictional.sampledView, sampler: frictional.sampler });
    this.attachFrictional();
    const [coronaCount, euvCount] = STRING_COUNTS[gpu.tier.name];
    this.strings = new Strings(device, this.maps, coronaCount, euvCount);
    this.resetStrings();
    this.cmes = new Cmes(device);
    this.loops = new EventLoops(device, this.cmes);
    this.loops.lite = gpu.tier.name === 'low';
    const strings = this.strings;
    this.loops.onSnapStrings = (dir, angleRad, speedKms) => strings.snapNear(dir, angleRad, speedKms);
    this.loops.stressNear = (dir, angleRad) => frictional.stressNear(dir, angleRad);
    this.loops.onRelaxField = (dir, angleRad, keep) => frictional.relax(dir, angleRad, keep);
    this.resetLoops();
    // event loops under the strings, as the original drew them
    this.layerDrawers = [this.loops, this.strings];
    this.rebuildFlow();
    this.resolution = new DynamicResolution(0.5, Math.min(window.devicePixelRatio || 1, gpu.tier.maxScale));
    this.timer = gpu.hasTimestamps ? new GpuTimer(device) : null;

    const texture = { sampleType: 'float' } as const, sampler = { type: 'filtering' } as const;
    const layout = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: SHADER_STAGE.FRAGMENT, buffer: { type: 'uniform' } },
        ...[1, 2, 3].map((binding) => ({ binding, visibility: SHADER_STAGE.FRAGMENT, texture })),
        { binding: 4, visibility: SHADER_STAGE.FRAGMENT, texture: { sampleType: 'float', viewDimension: '3d' } },
        { binding: 5, visibility: SHADER_STAGE.FRAGMENT, texture },
        { binding: 6, visibility: SHADER_STAGE.FRAGMENT, sampler },
        { binding: 7, visibility: SHADER_STAGE.FRAGMENT, sampler },
        { binding: 8, visibility: SHADER_STAGE.FRAGMENT, texture },
        { binding: 9, visibility: SHADER_STAGE.FRAGMENT, buffer: { type: 'uniform' } },
        { binding: 10, visibility: SHADER_STAGE.FRAGMENT, texture },
      ],
    });
    const postModule = device.createShaderModule({ code: FULLSCREEN_VS + POST_SHADER });
    this.render = {
      layout, pipelineLayout: device.createPipelineLayout({ bindGroupLayouts: [layout] }),
      module: device.createShaderModule({ code: STAR_SHADER }),
      pipelines: new Map(),
      frame: device.createBuffer({ size: FRAME_FLOATS * 4, usage: BUFFER.UNIFORM | BUFFER.COPY_DST }),
      loopLayer: null,
      post: device.createRenderPipeline({ layout: 'auto', vertex: { module: postModule, entryPoint: 'vs' }, fragment: { module: postModule, entryPoint: 'tonemap', targets: [{ format: gpu.format }] } }),
      postParams: device.createBuffer({ size: 16, usage: BUFFER.UNIFORM | BUFFER.COPY_DST }),
      linear: device.createSampler({ magFilter: 'linear', minFilter: 'linear' }),
      scene: null, bloom: new Bloom(device, BLOOM_SETTINGS), width: 0, height: 0,
    };
    device.queue.writeBuffer(this.render.postParams, 0, new Float32Array([BLOOM_STRENGTH, 0, 0, 0]));
    requestAnimationFrame(this.tick);
  }

  private pipelineFor(view: View): GPURenderPipeline {
    const r = this.render!;
    let pipe = r.pipelines.get(view.index);
    if (pipe) return pipe;
    pipe = this.gpu!.device.createRenderPipeline({
      layout: r.pipelineLayout,
      vertex: { module: r.module, entryPoint: 'vs' },
      fragment: { module: r.module, entryPoint: 'fs', targets: [{ format: SCENE_FORMAT }], constants: { VIEW: view.index } },
    });
    r.pipelines.set(view.index, pipe);
    return pipe;
  }

  private resize(): void {
    const r = this.render!, canvas = required<HTMLCanvasElement>(this.root, '[data-sun-canvas]');
    const box = canvas.getBoundingClientRect(), scale = this.resolution!.scale;
    const width = Math.max(16, Math.round(box.width * scale)), height = Math.max(16, Math.round(box.height * scale));
    if (r.scene && r.width === width && r.height === height) return;
    canvas.width = width; canvas.height = height;
    r.scene?.destroy(); r.loopLayer?.destroy();
    const target = (format: GPUTextureFormat): GPUTexture => this.gpu!.device.createTexture({ size: [width, height], format, usage: TEXTURE.RENDER_ATTACHMENT | TEXTURE.TEXTURE_BINDING });
    r.scene = target(SCENE_FORMAT);
    r.loopLayer = target(LAYER_FORMAT);
    r.bloom.resize(r.scene);
    r.width = width; r.height = height;
  }

  private readonly tick = (now: number): void => {
    if (!this.root.isConnected) { this.destroy(); return; }
    requestAnimationFrame(this.tick);
    const dt = this.lastMs ? (now - this.lastMs) / 1000 : 0;
    this.lastMs = now;
    if (!this.isVisible || document.hidden) return;
    if (this.fallback) { this.tickFallback(now, dt); return; }
    if (!this.render) return;
    this.clock.advance(dt);
    this.field.evolve(this.clock.dDays);
    // loops first: an eruption launches its CME this frame
    this.loops?.step(this.clock, this.field, this.flow);
    this.cmes?.step(this.clock, this.field, this.derived);
    this.easeMouse(now, dt);
    this.resize();
    this.draw();
    if (this.resolution!.sample(this.timer ? this.timer.lastMs : dt * 1000, now, this.timer !== null)) this.resize();
    this.countFrame(now);
  };

  /** Without WebGPU: the clock, the field and its look; no flow, loops, CMEs or strings. */
  private tickFallback(now: number, dt: number): void {
    this.clock.advance(dt);
    this.field.evolve(this.clock.dDays);
    this.easeMouse(now, dt);
    const box = required<HTMLCanvasElement>(this.root, '[data-sun-canvas]').getBoundingClientRect();
    const scale = Math.min(window.devicePixelRatio || 1, FALLBACK_MAX_SCALE);
    this.fallback!.draw({
      view: this.view, star: this.star, derived: this.derived, field: this.field,
      rotation: this.clock.rotation, anim: this.clock.anim, mouse: this.mouse,
      width: Math.max(16, Math.round(box.width * scale)), height: Math.max(16, Math.round(box.height * scale)),
    });
    this.countFrame(now);
  }

  private draw(): void {
    const gpu = this.gpu!, r = this.render!, maps = this.maps!, flow = this.flow!, { device } = gpu;
    const encoder = device.createCommandEncoder();
    this.timer?.start(encoder);
    const frictional = this.frictional!;
    // the traced field (maps, strings) follows the dipoles and the magnetofrictional field both
    const fieldVersion = this.field.version + frictional.version;
    maps.update(encoder, fieldVersion, this.field, this.derived, this.star.mass);
    frictional.step(encoder, this.clock.dDays, this.field, maps.uniform, flow.state);
    this.strings?.update(encoder, fieldVersion);
    this.strings?.move(encoder, { windS: this.clock.wind, dWindS: this.clock.dWind, rotation: this.clock.rotation }, this.cmes!.list);
    flow.step(encoder, this.clock.dAnim, this.field.regions.map((g) => ({ ...g, age: g.ageDays })), maps.surface.createView());
    // the loops' footpoints sample the surface plasma every fourth frame (read back without stalling)
    if (this.loops && (this.frameCount++ & 3) === 0) {
      flow.probe(encoder, this.loops.probePoints());
      frictional.measure(encoder);
    }
    const layerFrame = this.layerFrame();
    this.writeFrame();
    // the loop layer: strings, event loops, arcades and rain, added onto the image by the star pass
    const layerPass = encoder.beginRenderPass({ colorAttachments: [{ view: r.loopLayer!.createView(), loadOp: 'clear', storeOp: 'store', clearValue: { r: 0, g: 0, b: 0, a: 0 } }] });
    for (const drawer of this.layerDrawers) drawer.draw(layerPass, layerFrame);
    layerPass.end();
    this.cmes!.writeUniform(device.queue, layerFrame);
    const group = device.createBindGroup({
      layout: r.layout,
      entries: [
        { binding: 0, resource: { buffer: r.frame } },
        { binding: 1, resource: maps.surface.createView() },
        { binding: 2, resource: maps.corona.createView() },
        { binding: 3, resource: maps.striation.createView() },
        { binding: 4, resource: maps.parker.createView({ dimension: '3d' }) },
        { binding: 5, resource: flow.state },
        { binding: 6, resource: maps.sampler },
        { binding: 7, resource: maps.parkerSampler },
        { binding: 8, resource: r.loopLayer!.createView() },
        { binding: 9, resource: { buffer: this.cmes!.uniform } },
        { binding: 10, resource: maps.spots.createView() },
      ],
    });
    const scenePass = encoder.beginRenderPass({
      colorAttachments: [{ view: r.scene!.createView(), loadOp: 'clear', storeOp: 'store', clearValue: { r: 0, g: 0, b: 0, a: 1 } }],
    });
    scenePass.setPipeline(this.pipelineFor(this.view)); scenePass.setBindGroup(0, group); scenePass.draw(3); scenePass.end();
    r.bloom.encode(encoder);
    const postGroup = bindGroup(device, r.post, [r.scene!.createView(), r.bloom.output.createView(), r.linear, { buffer: r.postParams }]);
    const postPass = encoder.beginRenderPass({
      colorAttachments: [{ view: gpu.context.getCurrentTexture().createView(), loadOp: 'clear', storeOp: 'store', clearValue: { r: 0, g: 0, b: 0, a: 1 } }],
      timestampWrites: this.timer ? this.timer.end : undefined,
    });
    postPass.setPipeline(r.post); postPass.setBindGroup(0, postGroup); postPass.draw(3); postPass.end();
    const timed = this.timer?.collect(encoder) ?? false;
    device.queue.submit([encoder.finish()]);
    if (timed) this.timer!.read();
  }

  /** Where the star sits this frame, shared by the star pass and the layer drawers. */
  private layerFrame(): LayerFrame {
    const r = this.render!, v = this.view, { radius, zoom } = framing(v, r.width, r.height);
    return {
      width: r.width, height: r.height,
      // the parallax shift the star shader applies, in y-down pixels
      starX: r.width * 0.5 + this.mouse.x * PARALLAX[0] * r.height, starY: r.height * 0.5 - this.mouse.y * PARALLAX[1] * r.height,
      radiusPx: radius / zoom, rotation: this.clock.rotation, view: v,
      windClockS: this.clock.wind % WIND_CLOCK_WRAP_S, animClock: this.clock.anim,
    };
  }

  private writeFrame(): void {
    const r = this.render!, d = this.derived, v = this.view, width = r.width, height = r.height;
    const { radius, zoom } = framing(v, width, height);
    const wind = this.clock.windPhases;
    const tilt = 0.35 * Math.sin(this.clock.cameraAngle * 0.6);
    this.frameData.set([
      width, height, width * 0.5, height * 0.5,
      radius, this.clock.anim, this.clock.rotation, d.thetaE,
      this.clock.cameraAngle, tilt, this.mouse.x, this.mouse.y,
      euvExposure(v, d.activity, d.tcor), d.activity, 0, d.granScale,
      d.carpet, this.cmes!.marchRadius(v), wind.a, wind.b,
      d.tcor[0], d.tcor[1], d.tcor[2], d.radiusKm,
      d.bbColor[0], d.bbColor[1], d.bbColor[2], wind.weightA,
      ...v.fit.disc, v.fit.disc2[0] * coronaHeightScale(this.star, d), v.fit.disc2[1], v.fit.disc2[2], v.fit.disc2[3],
      v.fit.limbAbs, v.fit.shellH, zoom, this.gpu!.tier.name === 'low' ? 1 : 0,
      0, this.stringFraction(), this.resolution!.scale, 0,
      WHITE_LIGHT.beltBase, WHITE_LIGHT.beltAmp, WHITE_LIGHT.stringFraction, 0,
      WHITE_LIGHT.exposure, WHITE_LIGHT.fAmp, WHITE_LIGHT.fSlope, 0,
      ...d.spot, ...d.limbRgb, 0,
    ]);
    this.gpu!.device.queue.writeBuffer(r.frame, 0, this.frameData);
  }

  /** 1 when the strings carry their share of the white-light electrons in this view (star.ts applies the share). */
  private stringFraction(): number {
    return (this.strings?.stringFractionFor(this.view) ?? 0) > 0 ? 1 : 0;
  }

  // ---- state ---------------------------------------------------------------------------------------------

  private selectStar(star: StarPreset): void {
    if (star === this.star) return;
    this.star = star;
    this.derived = derive(star);
    this.clock.setStar(star, this.derived);
    // a new star starts clean: its own seeded regions, a fresh flow (the original kept the old star's CMEs,
    // strings and callbacks running into the new one)
    this.field = new StarField(this.derived, star.radius, seededRandom(hashKey(star.key)));
    this.attachFrictional();
    this.maps?.invalidate();
    this.frictional?.reset();
    this.rebuildFlow();
    this.resetStrings();
    this.resetLoops();
    this.writeHash();
    this.syncControls();
  }

  private selectView(view: View): void {
    this.view = view;
    this.writeHash();
    this.syncControls();
  }

  /** The CPU's field (loops' traces and eruption tests, CMEs, the CPU wind) includes the magnetofrictional field. */
  private attachFrictional(): void {
    const frictional = this.frictional;
    if (frictional) this.field.nonPotential = (p) => frictional.nonPotentialAt(p);
  }

  /** Loops, rain and CMEs start clean with each star (the original carried the old star's into the new one). */
  private resetLoops(): void {
    this.loops?.reset(this.clock, this.field, this.derived, this.star, seededRandom(hashKey(this.star.key) ^ 0x9e3779b9));
  }

  private resetStrings(): void {
    const d = this.derived;
    this.strings?.reset({ radiusSun: this.star.radius, radiusKm: d.radiusKm, massSun: this.star.mass, activity: d.activity, bref: d.bref }, hashKey(this.star.key));
  }

  /** A fresh flow for the current star, at the resolution it can afford: a small, fast-spinning star's waves
   *  cross a cell quickly and need ~4x the sub-steps, so it runs at 256 x 128 (as does the low tier). */
  private rebuildFlow(): void {
    if (!this.gpu) return;
    const width = this.gpu.tier.name === 'low' || this.star.radius < 0.35 ? 256 : 512;
    if (!this.flow || this.flowWidth !== width) {
      this.flow?.destroy();
      this.flow = new SurfaceFlow(this.gpu.device, width);
      this.flowWidth = width;
    }
    this.flow.reset(this.flowStar());
  }

  private flowStar(): { radiusSun: number; omegaRadPerDay: number; diffRot: number; activity: number; granScale: number } {
    const d = this.derived;
    return { radiusSun: this.star.radius, omegaRadPerDay: d.omega, diffRot: d.diffRot, activity: d.activity, granScale: d.granScale };
  }

  private writeHash(): void {
    const hash = `#${this.view.key}/${this.star.key}`;
    if (location.hash !== hash) history.replaceState(null, '', hash);
  }

  private easeMouse(now: number, dt: number): void {
    const t = now / 1000;
    const aim = this.aim ?? (this.clock.isPaused ? { x: 0, y: 0 } : { x: Math.sin(t * 0.17) * 0.35, y: Math.cos(t * 0.13) * 0.25 });
    const k = 1 - Math.exp(-dt / 0.27);   // the original's 6 % a frame at 60 fps, independent of the frame rate
    this.mouse.x += (aim.x - this.mouse.x) * k;
    this.mouse.y += (aim.y - this.mouse.y) * k;
  }

  // ---- controls ------------------------------------------------------------------------------------------

  private starSelect: HTMLSelectElement | null = null;
  private viewSelect: HTMLSelectElement | null = null;
  private rateSelect: HTMLSelectElement | null = null;

  private buildControls(): void {
    const fill = (selector: string, options: readonly { label: string; title: string }[], onSelect: (i: number) => void): HTMLSelectElement => {
      const select = required<HTMLSelectElement>(this.root, selector);
      options.forEach((o, i) => { const option = new Option(o.label, String(i)); option.title = o.title; select.append(option); });
      select.addEventListener('change', () => onSelect(select.selectedIndex));
      return select;
    };
    this.starSelect = fill('[data-sun-stars]', STARS.map((s) => ({ label: s.label, title: s.note })), (i) => this.selectStar(STARS[i]));
    this.viewSelect = fill('[data-sun-views]', VIEWS.map((v) => ({ label: v.label, title: v.note })), (i) => this.selectView(VIEWS[i]));
    this.rateSelect = fill('[data-sun-rates]', RATES.map((r) => ({ label: r.label, title: '' })), (i) => { this.clock.rateIndex = i; this.syncControls(); });
    document.addEventListener('keydown', (e) => {
      if (!this.root.isConnected || e.metaKey || e.ctrlKey || (e.target instanceof HTMLElement && /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName))) return;
      if (e.key === ' ' && this.root.contains(document.activeElement)) { e.preventDefault(); this.clock.rateIndex = this.clock.isPaused ? DEFAULT_RATE_INDEX : 0; this.syncControls(); }
      else if (e.key === ']') { this.clock.rateIndex = Math.min(RATES.length - 1, this.clock.rateIndex + 1); this.syncControls(); }
      else if (e.key === '[') { this.clock.rateIndex = Math.max(0, this.clock.rateIndex - 1); this.syncControls(); }
    }, { signal: this.listeners.signal });
  }

  private syncControls(): void {
    if (this.starSelect) this.starSelect.selectedIndex = STARS.indexOf(this.star);
    if (this.viewSelect) {
      this.viewSelect.selectedIndex = VIEWS.indexOf(this.view);
      this.viewSelect.style.setProperty('--chip', this.view.chip);   // the instrument's own colour
    }
    if (this.rateSelect) this.rateSelect.selectedIndex = this.clock.rateIndex;
    this.root.querySelector('[data-sun-canvas]')?.setAttribute('aria-label', `Simulated ${this.star.label} in ${this.view.label}: ${this.view.note}`);
    this.writeReadout();
  }

  private writeReadout(): void {
    const host = this.root.querySelector<HTMLElement>('[data-sun-readout]');
    if (!host) return;
    const s = this.star, d = this.derived;
    const rows: [string, string][] = [
      ['Star', `${s.label} · ${s.note}`],
      ['Temperature', `${s.teff} K`],
      ['Mass · radius', `${s.mass} M☉ · ${s.radius} R☉`],
      ['Rotation', `${s.protDays} days`],
      ['Activity', `${d.activity.toFixed(1)} × Sun${d.activity >= SATURATED_ACTIVITY ? ' (saturated)' : ''}`],
      ['Corona', `${d.tcor.map((t) => t.toFixed(1)).join(' / ')} MK`],
      ['View', this.view.note],
    ];
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
    stage.addEventListener('pointermove', (e) => {
      const box = stage.getBoundingClientRect();
      this.aim = { x: (e.clientX - box.left) / box.width * 2 - 1, y: 1 - (e.clientY - box.top) / box.height * 2 };
      this.dragSky(stage, e);
    });
    stage.addEventListener('pointerleave', () => { this.aim = null; this.skyDrag = null; });
    stage.addEventListener('pointerup', () => { this.skyDrag = null; });
    stage.addEventListener('pointercancel', () => { this.skyDrag = null; });
    stage.addEventListener('pointerdown', (e) => this.press(stage, e));
    new IntersectionObserver((entries) => { this.isVisible = entries[0]?.isIntersecting ?? true; }).observe(stage);
  }

  /** A press on or near the star: a flare-like flash with a 300 km/s ring, a new loop if none is rooted there,
   *  and, on the disc, heat and dye splashed into the surface flow (which the probe carries back to the loops). */
  private press(stage: HTMLElement, e: PointerEvent): void {
    if (!this.render || !this.loops) return;
    const f = this.layerFrame(), pv = this.skyPoint(stage, e, f);
    const d = Math.hypot(pv.x, pv.y);
    this.skyDrag = d >= 1 ? { ...pv, ms: e.timeStamp } : null;
    if (d > 2.6) return;
    const onDisc = d < 1;
    const view: [number, number, number] = onDisc ? [pv.x, pv.y, Math.sqrt(1 - d * d)] : [pv.x / d, pv.y / d, 0];
    const c = Math.cos(-f.rotation), s = Math.sin(-f.rotation);
    const dir: [number, number, number] = [c * view[0] + s * view[2], view[1], -s * view[0] + c * view[2]];
    this.loops.impact(dir, 1);
    if (onDisc) this.flow?.splat({ lon: Math.atan2(dir[0], dir[2]), lat: Math.asin(dir[1]), radiusRad: 0.06, heat: 6, dye: 4 });
  }

  /** The pointer on the sky plane, stellar radii from the star's centre (x right, y up). */
  private skyPoint(stage: HTMLElement, e: PointerEvent, f: LayerFrame): { x: number; y: number } {
    const box = stage.getBoundingClientRect();
    const px = (e.clientX - box.left) * f.width / box.width, py = (e.clientY - box.top) * f.height / box.height;
    return { x: (px - f.starX) / f.radiusPx, y: (f.starY - py) / f.radiusPx };
  }

  /** A drag above the limb pushes the strings it crosses at the drag's speed on the corona's own clock. */
  private dragSky(stage: HTMLElement, e: PointerEvent): void {
    const from = this.skyDrag;
    if (!from || !this.render || !this.strings || this.clock.isPaused) return;
    const f = this.layerFrame(), to = this.skyPoint(stage, e, f);
    const starSeconds = Math.max(1e-3, (e.timeStamp - from.ms) / 1000) * this.clock.windRate;
    const vx = (to.x - from.x) / starSeconds, vy = (to.y - from.y) / starSeconds;
    const c = Math.cos(-f.rotation), s = Math.sin(-f.rotation);
    this.strings.push([to.x, to.y], SKY_PUSH_RADIUS_R, [c * vx, vy, -s * vx]);
    this.skyDrag = { ...to, ms: e.timeStamp };
  }

  private showMessage(text: string): void {
    const message = this.root.querySelector<HTMLElement>('[data-sun-message]');
    if (!message) return;
    message.textContent = text;
    message.hidden = false;
  }

  private countFrame(now: number): void {
    this.fpsFrames++;
    if (now - this.fpsSince < 1000) return;
    const label = this.root.querySelector<HTMLElement>('[data-sun-fps]');
    if (label) label.textContent = `${Math.round(this.fpsFrames * 1000 / (now - this.fpsSince))} fps · ${(this.resolution?.scale ?? 1).toFixed(2)}×`;
    this.fpsFrames = 0;
    this.fpsSince = now;
  }

  private destroy(): void {
    this.listeners.abort();
    this.fallback?.destroy();
    this.loops?.destroy();
    this.cmes?.destroy();
    this.strings?.destroy();
    this.flow?.destroy();
    this.maps?.destroy();
    this.frictional?.destroy();
    this.gpu?.device.destroy();
  }
}

// ---- helpers -----------------------------------------------------------------------------------------------

function required<T extends Element = HTMLElement>(root: ParentNode, selector: string): T {
  const node = root.querySelector<T>(selector);
  if (!node) throw new Error(`sun: missing ${selector} (layouts/shortcodes/sun/sim.html)`);
  return node;
}

/** FNV-1a of a preset key: the seed for that star's regions, strings and loops. */
function hashKey(key: string): number {
  let h = 2166136261;
  for (const ch of key) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}
