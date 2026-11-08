/* The cave's coordinate system: a GRID_SIZE × GRID_SIZE board of tiles, stored
 * row by row in a flat array. */

export const GRID_SIZE = 10;

export type Tile = 'empty' | 'rock' | 'stick' | 'player';

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Direction {
  readonly dx: number;
  readonly dy: number;
}

export const DIRECTIONS = {
  up: { dx: 0, dy: -1 },
  right: { dx: 1, dy: 0 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
} as const satisfies Record<string, Direction>;

export type DirectionName = keyof typeof DIRECTIONS;

export const ALL_DIRECTIONS: readonly Direction[] = Object.values(DIRECTIONS);

export function isInBounds(point: Point): boolean {
  return point.x >= 0 && point.x < GRID_SIZE && point.y >= 0 && point.y < GRID_SIZE;
}

export function indexOf(point: Point): number {
  return point.y * GRID_SIZE + point.x;
}

export function pointOf(index: number): Point {
  return { x: index % GRID_SIZE, y: Math.floor(index / GRID_SIZE) };
}

export function stepFrom(point: Point, direction: Direction): Point {
  return { x: point.x + direction.dx, y: point.y + direction.dy };
}

export function isSamePoint(a: Point, b: Point): boolean {
  return a.x === b.x && a.y === b.y;
}

export function isSameDirection(a: Direction, b: Direction): boolean {
  return a.dx === b.dx && a.dy === b.dy;
}

export function manhattan(a: Point, b: Point): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/** The direction of one step from `from` toward a neighbouring `to`. */
export function directionTo(from: Point, to: Point): Direction {
  return { dx: Math.sign(to.x - from.x), dy: from.x === to.x ? Math.sign(to.y - from.y) : 0 };
}
