/* The Cave In card on /misc (partials/misc/live/cave-in.html): the page's own
 * rules and Path Finder AI playing by themselves. Rocks drop in where they
 * land, broken rocks burst, a picked-up stick sends out a ring, and the AI's
 * route marches ahead of it. When the cave caves in, the card holds the score
 * a moment and joins the next game near its end. It runs only while the card
 * is awake (scripts/site/widgets/card-wake.ts); the partial's SVG is the still. */

import { mountAll, watchCard } from '../misc-cards/card-kit';
import { GRID_SIZE } from './grid';
import type { Tile } from './grid';
import { PathFinder } from './pathfinder';
import { centerOf, drawFacingDot, drawRoute, drawTile } from './render';
import type { Board } from './render';
import { World } from './world';

const STEP_MS = 100;
// A whole AI game runs about a thousand moves, two minutes at card speed, and
// the empty early board is the dull part. So each game is played out unseen
// first, and the card joins it LEAD_IN_MOVES before the end. The rest replays
// with fresh dice, so it isn't the same ending, but it is a nearly full cave.
const LEAD_IN_MOVES = 80;
const CHECKPOINT_MOVES = 10;
const HOLD_MS = 2200;
const DROP_MS = 380;
const BURST_MS = 420;
const RING_MS = 650;
const DROP_HEIGHT_CELLS = 2.5;
const ROUTE_MARCH_PX_PER_MS = 1 / 45;
const BACKGROUND = '#070708';
const TEXT = 'rgb(255 255 255 / .92)';
const TEXT_DIM = 'rgb(255 255 255 / .5)';

type EffectKind = 'drop' | 'burst' | 'pop' | 'ring';

interface Effect {
  readonly kind: EffectKind;
  readonly index: number;
  readonly startMs: number;
}

const EFFECT_MS: Record<EffectKind, number> = { drop: DROP_MS, burst: BURST_MS, pop: DROP_MS, ring: RING_MS };

/** Which effect a tile changing from `before` to `after` gets, if any. */
function effectFor(before: Tile, after: Tile): EffectKind | null {
  if (before === after) return null;
  if (after === 'rock') return 'drop';
  if (before === 'rock') return 'burst';
  if (after === 'stick') return 'pop';
  if (before === 'stick') return 'ring';
  return null;
}

const easeOutCubic = (t: number): number => 1 - (1 - t) ** 3;
const easeOutBack = (t: number): number => 1 + 2.7 * (t - 1) ** 3 + 1.7 * (t - 1) ** 2;

function mount(root: HTMLElement): void {
  const canvas = root.querySelector<HTMLCanvasElement>('canvas');
  const context = canvas?.getContext('2d');
  if (!canvas || !context || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const fontFamily = getComputedStyle(root).fontFamily;

  let world: World;
  let pathFinder: PathFinder;
  let effects: Effect[] = [];

  const warmUp = (): void => {
    const game = new World('random');
    const ai = new PathFinder();
    const checkpoints = [game.clone()];
    while (!game.isCavedIn()) {
      ai.act(game);
      const last = checkpoints[checkpoints.length - 1];
      if (game.moves - last.moves >= CHECKPOINT_MOVES) checkpoints.push(game.clone());
    }
    const joinAtMoves = game.moves - LEAD_IN_MOVES;
    world = checkpoints.filter((checkpoint) => checkpoint.moves <= joinAtMoves).pop() ?? checkpoints[0];
    pathFinder = new PathFinder();
  };
  warmUp();
  let nextStepMs = 0;
  let cavedInAtMs: number | null = null;
  let widthPx = 0;
  let heightPx = 0;

  const restart = (): void => {
    warmUp();
    effects = [];
    cavedInAtMs = null;
  };

  const step = (nowMs: number): void => {
    const before = world.tiles.slice();
    pathFinder.act(world);
    world.tiles.forEach((tile, index) => {
      const kind = effectFor(before[index], tile);
      if (kind) effects.push({ kind, index, startMs: nowMs });
    });
    if (world.isCavedIn()) cavedInAtMs = nowMs;
  };

  const layout = (): void => {
    const pixelRatio = window.devicePixelRatio || 1;
    widthPx = root.clientWidth;
    heightPx = root.clientHeight;
    canvas.width = Math.round(widthPx * pixelRatio);
    canvas.height = Math.round(heightPx * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  };

  const progressOf = (effect: Effect, nowMs: number): number =>
    Math.min(1, (nowMs - effect.startMs) / EFFECT_MS[effect.kind]);

  const drawBoard = (board: Board, nowMs: number): void => {
    const animating = new Map(effects.map((effect) => [effect.index, effect]));
    world.tiles.forEach((tile, index) => {
      const effect = animating.get(index);
      const progress = effect ? progressOf(effect, nowMs) : 1;
      // The tile under a falling rock or a popping stick is still open ground.
      if (effect?.kind === 'drop' || effect?.kind === 'pop') drawTile(board, index, 'empty');
      if (effect?.kind === 'drop') {
        context.globalAlpha = Math.min(1, progress * 2);
        drawTile(board, index, tile, 1, -(1 - easeOutCubic(progress)) * board.cellPx * DROP_HEIGHT_CELLS);
        context.globalAlpha = 1;
      } else if (effect?.kind === 'pop') {
        drawTile(board, index, tile, Math.max(0, easeOutBack(progress)));
      } else {
        drawTile(board, index, tile);
      }
    });
    for (const effect of effects) {
      if (effect.kind === 'burst') drawBurst(board, effect, progressOf(effect, nowMs));
      if (effect.kind === 'ring') drawRing(board, effect, progressOf(effect, nowMs));
    }
  };

  const drawBurst = (board: Board, effect: Effect, progress: number): void => {
    context.globalAlpha = 1 - progress;
    drawTile(board, effect.index, 'rock', 1 + progress * 0.6);
    context.globalAlpha = 1;
  };

  const drawRing = (board: Board, effect: Effect, progress: number): void => {
    const center = centerOf(board, { x: effect.index % GRID_SIZE, y: Math.floor(effect.index / GRID_SIZE) });
    context.strokeStyle = 'rgb(252 211 77)';
    context.globalAlpha = 1 - progress;
    context.lineWidth = Math.max(1, board.cellPx / 10);
    context.beginPath();
    context.arc(center.x, center.y, board.cellPx * (0.3 + easeOutCubic(progress) * 1.4), 0, Math.PI * 2);
    context.stroke();
    context.globalAlpha = 1;
  };

  const drawPlayerGlow = (board: Board): void => {
    const center = centerOf(board, world.player);
    const glow = context.createRadialGradient(center.x, center.y, 0, center.x, center.y, board.cellPx * 1.6);
    glow.addColorStop(0, 'rgb(255 40 40 / .35)');
    glow.addColorStop(1, 'rgb(255 40 40 / 0)');
    context.fillStyle = glow;
    context.fillRect(center.x - board.cellPx * 2, center.y - board.cellPx * 2, board.cellPx * 4, board.cellPx * 4);
  };

  const drawCaveIn = (board: Board, boardPx: number, nowMs: number): void => {
    if (cavedInAtMs === null) return;
    const fade = Math.min(1, (nowMs - cavedInAtMs) / 300);
    context.fillStyle = `rgb(0 0 0 / ${0.65 * fade})`;
    context.fillRect(board.origin.x, board.origin.y, boardPx, boardPx);
    context.globalAlpha = fade;
    context.fillStyle = TEXT;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = `700 ${Math.round(boardPx / 8)}px ${fontFamily}`;
    context.fillText('CAVE IN!', board.origin.x + boardPx / 2, board.origin.y + boardPx / 2);
    context.globalAlpha = 1;
  };

  const drawPanel = (left: number, top: number, boardPx: number): void => {
    const labelPx = Math.max(7, boardPx * 0.055);
    const numberPx = boardPx * 0.2;
    context.textAlign = 'left';
    context.textBaseline = 'alphabetic';
    context.fillStyle = TEXT_DIM;
    context.font = `600 ${labelPx}px ${fontFamily}`;
    context.fillText('PATH FINDER AI', left, top + labelPx);
    const stats: ReadonlyArray<[string, number]> = [['STICKS', world.sticksHeld], ['MOVES', world.moves]];
    stats.forEach(([label, value], i) => {
      const y = top + boardPx * (0.42 + i * 0.4);
      context.fillStyle = TEXT_DIM;
      context.font = `600 ${labelPx}px ${fontFamily}`;
      context.fillText(label, left, y - numberPx * 0.95);
      context.fillStyle = TEXT;
      context.font = `700 ${numberPx}px ${fontFamily}`;
      context.fillText(String(value), left, y);
    });
  };

  const frame = (nowMs: number): boolean => {
    if (cavedInAtMs !== null && nowMs - cavedInAtMs > HOLD_MS) restart();
    // A card waking after a long sleep takes one step, not a backlog of them.
    if (cavedInAtMs === null && nowMs >= nextStepMs) {
      step(nowMs);
      nextStepMs = Math.max(nextStepMs + STEP_MS, nowMs);
    }
    effects = effects.filter((effect) => nowMs - effect.startMs < EFFECT_MS[effect.kind]);

    const padPx = heightPx * 0.09;
    const boardPx = heightPx - padPx * 2;
    const board: Board = { context, origin: { x: padPx * 1.4, y: padPx }, cellPx: boardPx / GRID_SIZE };
    context.fillStyle = BACKGROUND;
    context.fillRect(0, 0, widthPx, heightPx);
    context.fillStyle = '#000';
    context.fillRect(board.origin.x, board.origin.y, boardPx, boardPx);
    drawPlayerGlow(board);
    // Falling rocks start above their tile; keep them inside the board.
    context.save();
    context.beginPath();
    context.rect(board.origin.x, board.origin.y, boardPx, boardPx);
    context.clip();
    drawBoard(board, nowMs);
    context.restore();
    drawFacingDot(board, world.player, world.facing);
    drawRoute(board, [world.player, ...pathFinder.plan], pathFinder.waypoint, -nowMs * ROUTE_MARCH_PX_PER_MS);
    drawCaveIn(board, boardPx, nowMs);
    drawPanel(board.origin.x + boardPx + padPx * 1.6, padPx, boardPx);
    root.classList.add('is-live');
    return true;
  };

  layout();
  watchCard(root, frame, layout);
}

mountAll('[data-live-cave-in]', mount);

