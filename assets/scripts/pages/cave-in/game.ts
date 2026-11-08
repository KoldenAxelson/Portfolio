/* One Cave In board: the loop, the canvas and the controls. The data-ci-*
 * hooks it reads are in layouts/shortcodes/cave-in/game.html. */

import { DIRECTIONS, GRID_SIZE } from './grid';
import type { DirectionName } from './grid';
import { PathFinder } from './pathfinder';
import { drawFacingDot, drawRoute, drawTile } from './render';
import type { Board } from './render';
import { World } from './world';
import type { RockPlacement } from './world';

type Mode = 'play' | 'watch';

const WATCH_RESTART_MS = 2500;

const KEY_DIRECTIONS: Record<string, DirectionName> = {
  KeyW: 'up', ArrowUp: 'up',
  KeyD: 'right', ArrowRight: 'right',
  KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left',
};
const USE_KEYS = new Set(['Space', 'Enter']);
const RESTART_KEYS = new Set(['KeyR', 'Escape']);

export class Game {
  private readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;
  private readonly stage: HTMLElement;
  private readonly sticksLabel: HTMLElement;
  private readonly movesLabel: HTMLElement;
  private readonly statusLabel: HTMLElement;
  private readonly speedInput: HTMLInputElement;
  private readonly rocksSelect: HTMLSelectElement;

  private mode: Mode = 'play';
  private world: World;
  private pathFinder = new PathFinder();
  private isOver = false;
  private overAtMs = 0;
  private sinceStepMs = 0;
  private lastFrameMs = 0;

  constructor(private readonly root: HTMLElement) {
    this.canvas = this.find<HTMLCanvasElement>('[data-ci-canvas]');
    this.stage = this.find<HTMLElement>('[data-ci-stage]');
    this.sticksLabel = this.find<HTMLElement>('[data-ci-sticks]');
    this.movesLabel = this.find<HTMLElement>('[data-ci-moves]');
    this.statusLabel = this.find<HTMLElement>('[data-ci-status]');
    this.speedInput = this.find<HTMLInputElement>('[data-ci-speed]');
    this.rocksSelect = this.find<HTMLSelectElement>('[data-ci-rocks]');
    const context = this.canvas.getContext('2d');
    if (!context) throw new Error('Cave In: no 2D canvas');
    this.context = context;

    this.world = new World(this.rockPlacement());
    root.classList.add('is-ready');
    root.addEventListener('click', (event) => this.onClick(event));
    root.addEventListener('keydown', (event) => this.onKeydown(event));
    this.rocksSelect.addEventListener('change', () => this.restart());
    this.stage.addEventListener('pointerdown', () => this.stage.focus());
    this.setMode('play');
    requestAnimationFrame((now) => this.frame(now));
  }

  private find<T extends Element>(selector: string): T {
    const node = this.root.querySelector<T>(selector);
    if (!node) throw new Error(`Cave In: missing ${selector}`);
    return node;
  }

  private rockPlacement(): RockPlacement {
    return this.rocksSelect.value === 'safe' ? 'safe' : 'random';
  }

  private restart(): void {
    this.world = new World(this.rockPlacement());
    this.pathFinder = new PathFinder();
    this.isOver = false;
    this.statusLabel.textContent = '';
    this.updateStats();
  }

  private setMode(mode: Mode): void {
    this.mode = mode;
    this.root.dataset.mode = mode;
    for (const button of this.root.querySelectorAll<HTMLElement>('[data-ci-mode]')) {
      button.setAttribute('aria-pressed', String(button.dataset.ciMode === mode));
    }
    this.restart();
  }

  // ── input ────────────────────────────────────────────────────────────────

  private onClick(event: MouseEvent): void {
    const button = (event.target as Element).closest<HTMLElement>('button');
    if (!button) return;
    const { ciMode, ciAction, ciMove } = button.dataset;
    if (ciMode === 'play' || ciMode === 'watch') this.setMode(ciMode);
    if (ciAction === 'restart') this.restart();
    if (ciAction === 'use') this.playerUse();
    if (ciMove && ciMove in DIRECTIONS) this.playerMove(ciMove as DirectionName);
  }

  private onKeydown(event: KeyboardEvent): void {
    // Arrow keys belong to the rocks menu and speed slider while they have focus.
    if ((event.target as Element).matches('select, input')) return;
    if (RESTART_KEYS.has(event.code)) {
      this.restart();
    } else if (event.code in KEY_DIRECTIONS) {
      this.playerMove(KEY_DIRECTIONS[event.code]);
    } else if (USE_KEYS.has(event.code) && event.target === this.stage) {
      this.playerUse();
    } else {
      return;
    }
    event.preventDefault();
  }

  private playerMove(name: DirectionName): void {
    if (this.mode !== 'play' || this.isOver) return;
    this.world.move(DIRECTIONS[name]);
    this.afterTurn();
  }

  private playerUse(): void {
    if (this.mode !== 'play' || this.isOver) return;
    this.world.use();
    this.afterTurn();
  }

  private afterTurn(): void {
    this.updateStats();
    if (!this.world.isCavedIn()) return;
    this.isOver = true;
    this.overAtMs = performance.now();
    const restartHint = this.mode === 'play' ? ' Press R or Restart to dig again.' : '';
    this.statusLabel.textContent = `Cave in after ${this.world.moves} moves.${restartHint}`;
  }

  private updateStats(): void {
    this.sticksLabel.textContent = String(this.world.sticksHeld);
    this.movesLabel.textContent = String(this.world.moves);
  }

  // ── loop ─────────────────────────────────────────────────────────────────

  private frame(nowMs: number): void {
    // hx-boost swaps the page out from under us; stop with it.
    if (!this.root.isConnected) return;
    const elapsedMs = Math.min(nowMs - this.lastFrameMs, 250);
    this.lastFrameMs = nowMs;
    if (this.mode === 'watch') this.tickWatch(nowMs, elapsedMs);
    this.draw();
    requestAnimationFrame((now) => this.frame(now));
  }

  private tickWatch(nowMs: number, elapsedMs: number): void {
    if (this.isOver) {
      if (nowMs - this.overAtMs > WATCH_RESTART_MS) this.restart();
      return;
    }
    const stepMs = 1000 / Number(this.speedInput.value);
    this.sinceStepMs += elapsedMs;
    while (this.sinceStepMs >= stepMs && !this.isOver) {
      this.sinceStepMs -= stepMs;
      this.pathFinder.act(this.world);
      this.afterTurn();
    }
  }

  // ── drawing ──────────────────────────────────────────────────────────────

  private draw(): void {
    const sizePx = this.fitCanvas();
    const board: Board = { context: this.context, origin: { x: 0, y: 0 }, cellPx: sizePx / GRID_SIZE };
    this.context.fillStyle = '#000';
    this.context.fillRect(0, 0, sizePx, sizePx);
    this.world.tiles.forEach((tile, index) => drawTile(board, index, tile));
    drawFacingDot(board, this.world.player, this.world.facing);
    if (this.mode === 'watch') drawRoute(board, [this.world.player, ...this.pathFinder.plan], this.pathFinder.waypoint);
    if (this.isOver) this.drawCaveIn(sizePx);
  }

  /** Sizes the backing store to the stage and returns the side length in CSS px. */
  private fitCanvas(): number {
    const sizePx = this.canvas.clientWidth;
    const pixelRatio = window.devicePixelRatio || 1;
    const backingPx = Math.round(sizePx * pixelRatio);
    if (this.canvas.width !== backingPx) {
      this.canvas.width = backingPx;
      this.canvas.height = backingPx;
    }
    this.context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    return sizePx;
  }

  private drawCaveIn(sizePx: number): void {
    const context = this.context;
    context.fillStyle = 'rgb(0 0 0 / .6)';
    context.fillRect(0, 0, sizePx, sizePx);
    context.fillStyle = '#fff';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = `600 ${Math.round(sizePx / 11)}px ui-monospace, monospace`;
    context.fillText('Cave In!', sizePx / 2, sizePx / 2 - sizePx / 16);
    context.font = `${Math.round(sizePx / 22)}px ui-monospace, monospace`;
    context.fillText(`Moves: ${this.world.moves}`, sizePx / 2, sizePx / 2 + sizePx / 16);
  }
}
