/* One lab on the page: owns the world, the loop and the controls. Its DOM hooks
 * are the data-em-* attributes in layouts/shortcodes/emergence/lab.html. */

import type { Behavior, Sim } from './behavior';
import { createBehaviors } from './behaviors';
import { BASE_DT, createEngineGroups, step } from './engine';
import { TrailField } from './field';
import { NeighborGrid } from './neighbors';
import { resetGroup, writeParam } from './params';
import type { ParamGroup, ParamValue } from './params';
import { PRESETS } from './presets';
import type { Preset } from './presets';
import { createViewGroup, Renderer } from './render';
import { Panel } from './ui/panel';
import { World } from './world';

/** World width in simulation units. Height follows the stage's aspect, so
 *  every slider means the same distance on any screen. */
const WORLD_WIDTH = 1600;

export class Lab {
  private readonly world = new World();
  private readonly grid = new NeighborGrid();
  private readonly field = new TrailField();
  private readonly engine = createEngineGroups();
  private readonly view = createViewGroup();
  private readonly behaviors = createBehaviors();
  private readonly behaviorList: readonly Behavior[] = Object.values(this.behaviors);
  private readonly groups: Readonly<Record<string, ParamGroup>> = { ...this.engine, view: this.view, ...this.behaviors };
  private readonly renderer: Renderer;
  private readonly panel: Panel;
  private readonly fpsLabel: HTMLElement | null;
  private readonly toggleButton: HTMLButtonElement | null;
  private isRunning = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  private isVisible = true;
  private needsDraw = true;
  private framesThisSecond = 0;
  private secondStartedAt = 0;

  constructor(private readonly root: HTMLElement) {
    this.renderer = new Renderer(required<HTMLCanvasElement>(root, '[data-em-canvas]'));
    this.panel = new Panel(required(root, '[data-em-panel]'), (group) => this.onParamChange(group));
    this.fpsLabel = root.querySelector('[data-em-fps]');
    this.toggleButton = root.querySelector('[data-em-action="toggle"]');

    for (const behavior of this.behaviorList) this.panel.addBehavior(behavior);
    this.panel.addGroup(this.engine.motion, true);
    this.panel.addGroup(this.engine.population, true);
    this.panel.addGroup(this.engine.trail, false);
    this.panel.addGroup(this.view, false);

    this.bindToolbar();
    this.observeStage(required(root, '[data-em-stage]'));
    this.applyPreset(PRESETS[0]);
    this.updateToggle();
    requestAnimationFrame(this.tick);
  }

  private applyPreset(preset: Preset): void {
    for (const group of Object.values(this.groups)) resetGroup(group);
    for (const [id, behavior] of Object.entries(this.behaviors)) {
      const weight: number | undefined = preset.mix[id as keyof typeof preset.mix];
      behavior.mix.enabled = weight !== undefined;
      behavior.mix.weight = weight ?? 1;
    }
    for (const [groupKey, overrides] of Object.entries(preset.params ?? {})) {
      const group = this.groups[groupKey];
      if (!group || !overrides) continue;
      for (const [key, value] of Object.entries(overrides)) writeParam(group, key, value as ParamValue);
    }
    this.restart();
    preset.prepare?.(this.behaviors);
    this.panel.sync();
  }

  private restart(): void {
    const { count, species, layout } = this.engine.population.values;
    this.world.populate(count, species, layout);
    for (const behavior of this.behaviorList) behavior.reset?.(this.world.species);
    this.field.clear();
    this.needsDraw = true;
  }

  private onParamChange(group: ParamGroup): void {
    if (group === this.engine.population) {
      this.restart();
      this.panel.sync();
    }
    this.needsDraw = true;
  }

  private advance(): void {
    const sim: Sim = {
      world: this.world,
      grid: this.grid,
      field: this.field,
      dt: BASE_DT * this.engine.motion.values.timeScale,
    };
    step(sim, this.behaviorList, this.engine);
    this.needsDraw = true;
  }

  private readonly tick = (time: number): void => {
    // hx-boost swaps the page body out without unloading; stop with it.
    if (!this.root.isConnected) return;
    requestAnimationFrame(this.tick);
    if (!this.isVisible) return;
    if (this.isRunning) this.advance();
    if (this.needsDraw) this.renderer.draw(this.world, this.field, this.view.values);
    this.needsDraw = false;
    this.countFrame(time);
  };

  private countFrame(time: number): void {
    this.framesThisSecond++;
    if (time - this.secondStartedAt < 1000) return;
    if (this.fpsLabel) this.fpsLabel.textContent = this.isRunning ? `${this.framesThisSecond} fps` : 'paused';
    this.framesThisSecond = 0;
    this.secondStartedAt = time;
  }

  private bindToolbar(): void {
    const actions: Record<string, () => void> = {
      toggle: () => {
        this.isRunning = !this.isRunning;
        this.updateToggle();
      },
      step: () => {
        this.isRunning = false;
        this.updateToggle();
        this.advance();
      },
      restart: () => this.restart(),
      shuffle: () => {
        for (const behavior of this.behaviorList) behavior.shuffle?.();
        this.panel.sync();
      },
    };
    for (const control of this.root.querySelectorAll<HTMLButtonElement>('[data-em-action]')) {
      const action = actions[control.dataset.emAction ?? ''];
      if (action) control.addEventListener('click', action);
    }

    const picker = this.root.querySelector<HTMLSelectElement>('[data-em-preset]');
    if (!picker) return;
    for (const preset of PRESETS) picker.append(new Option(preset.label, preset.id));
    picker.addEventListener('change', () => {
      const preset = PRESETS.find((candidate) => candidate.id === picker.value);
      if (preset) this.applyPreset(preset);
    });
  }

  private updateToggle(): void {
    if (!this.toggleButton) return;
    this.toggleButton.textContent = this.isRunning ? 'Pause' : 'Play';
    this.toggleButton.setAttribute('aria-pressed', String(!this.isRunning));
  }

  private observeStage(stage: HTMLElement): void {
    new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width < 1 || height < 1) return;
      this.renderer.resize(width, height);
      this.world.resize(WORLD_WIDTH, WORLD_WIDTH * (height / width));
      this.field.resize(this.world);
      this.needsDraw = true;
    }).observe(stage);
    new IntersectionObserver(([entry]) => {
      this.isVisible = entry.isIntersecting;
    }).observe(stage);
  }
}

function required<T extends HTMLElement = HTMLElement>(root: HTMLElement, selector: string): T {
  const found = root.querySelector<T>(selector);
  if (!found) throw new Error(`emergence: missing ${selector}`);
  return found;
}
