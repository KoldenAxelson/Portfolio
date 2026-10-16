/* Draws the trail as a tone-mapped image under the particles, one path per
 * species. Owns the View group, which changes how things look and never what
 * the simulation does. */

import type { TrailField } from './field';
import { buildLookup, RAMP_OPTIONS, SPECIES_COLORS } from './palette';
import { choice, createGroup, range, toggle } from './params';
import type { World } from './world';

/** Trail value that maps to half brightness at gain 1. */
const TRAIL_HALF_LEVEL = 6;
const STAGE_COLOR = '#050509';

const viewSpecs = {
  showParticles: toggle('Particles', true),
  showTrail: toggle('Trail', true),
  ramp: choice('Trail colours', RAMP_OPTIONS, 'topographic'),
  trailGain: range('Trail gain', 0.1, 5, 0.1, 1),
  dotSize: range('Dot size', 0.5, 4, 0.25, 1.5),
};

export function createViewGroup() {
  return createGroup('View', viewSpecs);
}

type ViewValues = ReturnType<typeof createViewGroup>['values'];

export class Renderer {
  private readonly context: CanvasRenderingContext2D;
  private readonly trailCanvas = document.createElement('canvas');
  private readonly trailContext: CanvasRenderingContext2D;
  private trailImage: ImageData | null = null;
  private trailPixels: Uint32Array = new Uint32Array(0);
  private lookup: Uint32Array = new Uint32Array(0);
  private lookupRamp = '';

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.context = requireContext(canvas);
    this.trailContext = requireContext(this.trailCanvas);
  }

  resize(cssWidth: number, cssHeight: number): void {
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.max(1, Math.round(cssWidth * ratio));
    this.canvas.height = Math.max(1, Math.round(cssHeight * ratio));
  }

  draw(world: World, field: TrailField, view: ViewValues): void {
    const { context, canvas } = this;
    context.globalCompositeOperation = 'source-over';
    context.fillStyle = STAGE_COLOR;
    context.fillRect(0, 0, canvas.width, canvas.height);
    if (view.showTrail) this.drawTrail(field, view);
    if (view.showParticles) this.drawParticles(world, view.dotSize);
  }

  private drawTrail(field: TrailField, view: ViewValues): void {
    if (this.lookupRamp !== view.ramp) {
      this.lookup = buildLookup(view.ramp);
      this.lookupRamp = view.ramp;
    }
    const image = this.trailImageFor(field);
    const scale = view.trailGain / TRAIL_HALF_LEVEL;
    const { values } = field;
    for (let c = 0; c < values.length; c++) {
      const level = values[c] * scale;
      this.trailPixels[c] = this.lookup[((level / (level + 1)) * 255) | 0];
    }
    this.trailContext.putImageData(image, 0, 0);
    this.context.imageSmoothingEnabled = true;
    this.context.drawImage(this.trailCanvas, 0, 0, this.canvas.width, this.canvas.height);
  }

  private trailImageFor(field: TrailField): ImageData {
    if (this.trailImage && this.trailImage.width === field.cols && this.trailImage.height === field.rows) return this.trailImage;
    this.trailCanvas.width = field.cols;
    this.trailCanvas.height = field.rows;
    this.trailImage = this.trailContext.createImageData(field.cols, field.rows);
    this.trailPixels = new Uint32Array(this.trailImage.data.buffer);
    return this.trailImage;
  }

  private drawParticles(world: World, dotSize: number): void {
    const { context, canvas } = this;
    const scaleX = canvas.width / world.width;
    const scaleY = canvas.height / world.height;
    const size = dotSize * Math.min(2, window.devicePixelRatio || 1);
    const offset = size / 2;
    context.globalCompositeOperation = 'lighter';
    for (let species = 0; species < world.species; species++) {
      context.beginPath();
      for (let i = 0; i < world.count; i++) {
        if (world.kind[i] !== species) continue;
        context.rect(world.x[i] * scaleX - offset, world.y[i] * scaleY - offset, size, size);
      }
      context.fillStyle = SPECIES_COLORS[species];
      context.fill();
    }
  }
}

function requireContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext('2d');
  if (!context) throw new Error('emergence: 2D canvas unavailable');
  return context;
}
