/* The Emergence card on /misc (partials/misc/live/emergence.html): the lab's
 * own engine, behaviours and renderer, running one small preset in the card's
 * band, with the three flocks hunting each other in a rock-paper-scissors cycle
 * (chase.ts). It warms up off screen into a still, then runs only while the
 * card is awake (hovered or focused, see scripts/site/widgets/card-wake.ts),
 * so a page of cards costs nothing at rest. */

import type { Behavior, Sim } from './behavior';
import { createBehaviors } from './behaviors';
import { createChase } from './chase';
import { BASE_DT, createEngineGroups, step } from './engine';
import { TrailField } from './field';
import { NeighborGrid } from './neighbors';
import { resetGroup, writeParam } from './params';
import type { ParamGroup, ParamValue } from './params';
import { PRESETS } from './presets';
import { createViewGroup, Renderer } from './render';
import { World } from './world';

const PRESET_ID = 'flocks';
const COUNT = 420; // a card is a few hundred pixels wide; the lab runs 1800
const WORLD_WIDTH = 520;
const WARM_UP_STEPS = 420;

function mount(root: HTMLElement): void {
  const canvas = root.querySelector<HTMLCanvasElement>('canvas');
  const preset = PRESETS.find((candidate) => candidate.id === PRESET_ID);
  if (!canvas || !preset || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const world = new World();
  const grid = new NeighborGrid();
  const field = new TrailField();
  const engine = createEngineGroups();
  const view = createViewGroup();
  const behaviors = createBehaviors();
  // The Flocks preset plus rock, paper, scissors between its three colours.
  const list: readonly Behavior[] = [...Object.values(behaviors), createChase()];
  const groups: Readonly<Record<string, ParamGroup>> = { ...engine, view, ...behaviors };
  const renderer = new Renderer(canvas);

  for (const group of Object.values(groups)) resetGroup(group);
  for (const [id, behavior] of Object.entries(behaviors)) {
    const weight: number | undefined = preset.mix[id as keyof typeof preset.mix];
    behavior.mix.enabled = weight !== undefined;
    behavior.mix.weight = weight ?? 1;
  }
  for (const [key, overrides] of Object.entries(preset.params ?? {})) {
    const group = groups[key];
    if (!group || !overrides) continue;
    for (const [name, value] of Object.entries(overrides)) writeParam(group, name, value as ParamValue);
  }
  writeParam(engine.population, 'count', COUNT);
  writeParam(view, 'dotSize', 2.5); // bigger dots read better at card size

  const { count, species, layout } = engine.population.values;
  world.populate(count, species, layout);
  for (const behavior of list) behavior.reset?.(world.species);
  preset.prepare?.(behaviors);

  const advance = (): void => {
    const sim: Sim = { world, grid, field, dt: BASE_DT * engine.motion.values.timeScale };
    step(sim, list, engine);
  };

  let sized = false;
  let warm = false;
  let hovered = false;
  let raf = 0;

  const draw = (): void => renderer.draw(world, field, view.values);
  const tick = (): void => {
    raf = 0;
    if (!root.isConnected || !hovered) return;
    advance();
    draw();
    raf = requestAnimationFrame(tick);
  };

  new ResizeObserver(([entry]) => {
    const { width, height } = entry.contentRect;
    if (width < 1 || height < 1) return;
    renderer.resize(width, height);
    world.resize(WORLD_WIDTH, WORLD_WIDTH * (height / width));
    field.resize(world);
    sized = true;
    if (warm) draw();
  }).observe(canvas);

  // Warm up the first time the card scrolls into view, so the still it shows
  // is the flocks already formed rather than a random scatter.
  const seen = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting || warm || !sized) return;
    seen.disconnect();
    for (let i = 0; i < WARM_UP_STEPS; i++) advance();
    warm = true;
    draw();
    root.classList.add('is-live');
  });
  seen.observe(root);

  // Runs while the band is awake (scripts/site/widgets/card-wake.ts: hovered
  // or focused, plus a short afterlife), and stops when it falls asleep.
  const band = root.closest<HTMLElement>('[data-asleep]');
  band?.addEventListener('card:wake', () => {
    hovered = true;
    if (warm && !raf) raf = requestAnimationFrame(tick);
  });
  band?.addEventListener('card:sleep', () => {
    hovered = false;
  });
}

function mountAll(): void {
  for (const root of document.querySelectorAll<HTMLElement>('[data-live-emergence]')) {
    if (root.dataset.liveMounted) continue;
    root.dataset.liveMounted = 'true';
    mount(root);
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountAll);
else mountAll();
