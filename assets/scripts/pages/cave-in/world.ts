/* Cave In's rules, ported from the Python original (github.com/KoldenAxelson/cave-in).
 * Every stick you pick up drops a rock somewhere and a new stick somewhere else;
 * a stick spent on a rock clears it. The cave has caved in once the stick can't
 * be reached, even breaking every rock you have sticks for. */

import { ALL_DIRECTIONS, DIRECTIONS, GRID_SIZE, indexOf, isInBounds, pointOf, stepFrom } from './grid';
import type { Direction, Point, Tile } from './grid';
import { findPath } from './paths';

/** "random" is the original's normal mode; "safe" is its easy mode, which never
 *  drops a rock that cuts the open cave in two. */
export type RockPlacement = 'random' | 'safe';

export class World {
  readonly tiles: Tile[] = new Array<Tile>(GRID_SIZE * GRID_SIZE).fill('empty');
  player: Point = { x: GRID_SIZE >> 1, y: GRID_SIZE >> 1 };
  facing: Direction = DIRECTIONS.down;
  sticksHeld = 0;
  moves = 0;

  constructor(private readonly rockPlacement: RockPlacement) {
    // The original placed the first stick before the player, which could land
    // the stick under the player and lose it; placing the player first can't.
    this.tiles[indexOf(this.player)] = 'player';
    this.dropRockAndStick();
  }

  /** An independent copy: play on it never touches this world. */
  clone(): World {
    const copy = new World(this.rockPlacement);
    copy.tiles.splice(0, copy.tiles.length, ...this.tiles);
    copy.player = this.player;
    copy.facing = this.facing;
    copy.sticksHeld = this.sticksHeld;
    copy.moves = this.moves;
    return copy;
  }

  tileAt(point: Point): Tile {
    return this.tiles[indexOf(point)];
  }

  findStick(): Point | null {
    const index = this.tiles.indexOf('stick');
    return index === -1 ? null : pointOf(index);
  }

  facingPoint(): Point {
    return stepFrom(this.player, this.facing);
  }

  /** Turns toward `direction`, then steps if that tile is open. */
  move(direction: Direction): boolean {
    this.facing = direction;
    const target = stepFrom(this.player, direction);
    if (!isInBounds(target) || this.tileAt(target) !== 'empty') return false;

    this.tiles[indexOf(this.player)] = 'empty';
    this.tiles[indexOf(target)] = 'player';
    this.player = target;
    this.moves++;
    return true;
  }

  /** Picks up the stick or breaks the rock in front of the player. */
  use(): boolean {
    const target = this.facingPoint();
    if (!isInBounds(target)) return false;
    const tile = this.tileAt(target);

    if (tile === 'stick') {
      this.sticksHeld++;
      this.tiles[indexOf(target)] = 'empty';
      this.dropRockAndStick();
      return true;
    }
    if (tile === 'rock' && this.sticksHeld > 0) {
      this.sticksHeld--;
      this.tiles[indexOf(target)] = 'empty';
      return true;
    }
    return false;
  }

  isCavedIn(): boolean {
    const stick = this.findStick();
    return stick === null || findPath(this.tiles, this.player, stick, this.sticksHeld) === null;
  }

  private dropRockAndStick(): void {
    this.dropRock();
    const empties = this.emptyIndexes();
    if (empties.length > 0) this.tiles[pickRandom(empties)] = 'stick';
  }

  private dropRock(): void {
    const empties = this.emptyIndexes();
    if (empties.length === 0) return;
    if (this.rockPlacement === 'random') {
      this.tiles[pickRandom(empties)] = 'rock';
      return;
    }
    const safeIndex = shuffle(empties).find((index) => this.keepsCaveConnected(index));
    if (safeIndex !== undefined) this.tiles[safeIndex] = 'rock';
  }

  /** Would a rock at `rockIndex` still leave every open tile reachable from the player? */
  private keepsCaveConnected(rockIndex: number): boolean {
    const isOpen = (index: number): boolean => index !== rockIndex && this.tiles[index] !== 'rock';
    const openCount = this.tiles.filter((_, index) => isOpen(index)).length;

    const seen = new Set([indexOf(this.player)]);
    const stack = [this.player];
    while (stack.length > 0) {
      const point = stack.pop() as Point;
      for (const direction of ALL_DIRECTIONS) {
        const next = stepFrom(point, direction);
        const nextIndex = indexOf(next);
        if (!isInBounds(next) || seen.has(nextIndex) || !isOpen(nextIndex)) continue;
        seen.add(nextIndex);
        stack.push(next);
      }
    }
    return seen.size === openCount;
  }

  private emptyIndexes(): number[] {
    return this.tiles.flatMap((tile, index) => (tile === 'empty' ? [index] : []));
  }
}

function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function shuffle<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}
