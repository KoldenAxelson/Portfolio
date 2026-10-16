# Emergence — authoring guide

`/misc/emergence/` is a sandbox where several emergent-behaviour simulations
run on the same particles and blend together. The page is the widget: keep its
prose to a line.

## Where things live

```
content/misc/emergence.md                  the page (one line + the shortcode)
layouts/shortcodes/emergence/lab.html      stage, toolbar, empty panel
layouts/partials/emergence/assets.html     CSS + bundle, emitted by layouts/misc/single.html
assets/css/pages/emergence/emergence.css
assets/scripts/pages/emergence/
  main.ts          mounts every [data-emergence-lab], re-mounts after hx-boost swaps
  lab.ts           the loop, toolbar, presets, resize
  engine.ts        one step + the world-level groups (Population, Motion, Trail)
  behavior.ts      the Behavior contract and the Sim it receives
  params.ts        parameter specs; the panel and presets are built from these
  world.ts         particles as parallel typed arrays, on a torus
  neighbors.ts     spatial grid for neighbour queries
  field.ts         the shared trail (a scalar grid any behaviour can read/write)
  render.ts        canvas drawing + the View group
  palette.ts       species colours, trail colour ramps
  presets.ts       named starting points (type-checked overrides)
  behaviors/       one file per behaviour + index.ts, the registry
  ui/              panel, matrix editor, DOM helpers
```

## How a step works

1. Accelerations are zeroed and the neighbour grid is rebuilt at the largest
   radius any enabled behaviour asks for.
2. Each enabled behaviour's `apply(sim, weight)` adds into `world.ax/ay`. It may
   also rotate `world.vx/vy` directly (slime's Steer coupling does).
3. The engine integrates: drag, jitter, min/max speed, wrap-around.
4. Each behaviour's optional `afterMove` runs (slime deposits trail here).
5. The trail diffuses and evaporates.

Behaviours never integrate and never touch each other. Everything they share
goes through the world arrays and the trail field, which is what makes them
mixable.

## Adding a behaviour

1. Create `behaviors/<name>.ts` exporting `create<Name>(): Behavior<typeof specs>`.
   Copy `boids.ts` for a neighbour-based rule or `slime.ts` for a field-based one.
   - Declare `specs` with `range` / `toggle` / `choice`. The panel builds the
     controls; `values` is typed from the specs.
   - `neighborRadius()` returns the radius you query, or 0.
   - `apply` loops over particles and adds acceleration scaled by `weight`.
     Use `grid.forEachNeighbor` with one closure created outside the loop.
   - Optional hooks: `afterMove`, `reset(species)`, `shuffle()`,
     `mountControls(host, changed)` for UI that isn't a slider.
2. Add one line to `behaviors/index.ts`. Its key there is how presets refer
   to it (`mix: { yourKey: 1 }`, `params: { yourKey: { … } }`).
3. Optionally add a preset to `presets.ts` that shows it off.
4. `make typecheck`, then check it by eye at `make dev`.

No markup, CSS or Hugo changes are needed for a new behaviour.

## Units

The world is 1600 units wide; height follows the stage's aspect. Speeds are
units/second, accelerations units/second². The trail grid is one cell per 4
units. One step per animation frame at 1/60 s times the Speed slider.
