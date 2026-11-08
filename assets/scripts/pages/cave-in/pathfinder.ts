/* The original's Path Finder AI. It heads for the stick on open ground when it
 * can. When rocks are in the way it picks a waypoint within VIEW_RADIUS that
 * gets it closer without wading into rocky ground, then takes the path there
 * that best trades steps against sticks spent (a stick is worth STICK_VALUE
 * steps). */

import { GRID_SIZE, directionTo, indexOf, isInBounds, isSameDirection, isSamePoint, manhattan } from './grid';
import type { Point } from './grid';
import { countRocks, findPath } from './paths';
import type { World } from './world';

const VIEW_RADIUS = 4;
const STICK_VALUE = GRID_SIZE / 2;
const DENSITY_REACH = 2;

export class PathFinder {
  /** The tiles still to walk, not counting the one the player stands on. */
  plan: Point[] = [];
  waypoint: Point | null = null;

  /** One tick: a turn, a step, or using the tile ahead. */
  act(world: World): void {
    if (this.plan.length === 0) this.replan(world);
    const next = this.plan[0];
    if (!next) return;

    const direction = directionTo(world.player, next);
    if (world.tileAt(next) === 'empty') {
      if (world.move(direction)) this.plan.shift();
      return;
    }
    if (!isSameDirection(world.facing, direction)) {
      world.move(direction);
      return;
    }
    const pickedUpStick = world.tileAt(next) === 'stick';
    // A pickup reshapes the cave (new rock, new stick), and a failed use means
    // the plan is stale either way, so both start over.
    if (!world.use() || pickedUpStick) this.plan = [];
  }

  replan(world: World): void {
    this.plan = [];
    this.waypoint = null;
    const stick = world.findStick();
    if (!stick) return;

    const openPath = findPath(world.tiles, world.player, stick, 0);
    if (openPath) {
      this.plan = openPath.slice(1);
      return;
    }

    const waypoint = this.findWaypoint(world, stick);
    const isUsefulWaypoint = waypoint !== null && !isSamePoint(waypoint, world.player);
    const viaWaypoint = isUsefulWaypoint ? this.cheapestPath(world, waypoint) : null;
    const path = viaWaypoint ?? this.cheapestPath(world, stick);
    if (!path) return;
    this.waypoint = viaWaypoint ? waypoint : null;
    this.plan = path.slice(1);
  }

  private cheapestPath(world: World, target: Point): Point[] | null {
    let best: Point[] | null = null;
    let bestCost = Infinity;
    for (let rocks = 0; rocks <= world.sticksHeld; rocks++) {
      const path = findPath(world.tiles, world.player, target, rocks);
      if (!path) continue;
      const cost = path.length + STICK_VALUE * countRocks(world.tiles, path);
      if (cost < bestCost) {
        best = path;
        bestCost = cost;
      }
    }
    return best;
  }

  /** Fans out along the line to the stick, widening with distance, as the
   *  original's GridScanner did (including its truncation toward zero). */
  private findWaypoint(world: World, stick: Point): Point | null {
    const player = world.player;
    const length = Math.hypot(stick.x - player.x, stick.y - player.y);
    if (length === 0) return null;
    const along = { x: (stick.x - player.x) / length, y: (stick.y - player.y) / length };
    const across = { x: -along.y, y: along.x };

    let best: Point | null = null;
    let bestScore = Infinity;
    for (let distance = 0; distance <= VIEW_RADIUS; distance++) {
      const spineX = player.x + Math.trunc(along.x * distance);
      const spineY = player.y + Math.trunc(along.y * distance);
      for (let offset = Math.floor(-distance / 2); offset <= Math.floor(distance / 2); offset++) {
        const candidate = { x: spineX + Math.trunc(across.x * offset), y: spineY + Math.trunc(across.y * offset) };
        if (!isInBounds(candidate) || manhattan(player, candidate) > VIEW_RADIUS) continue;
        const score = scoreWaypoint(world, candidate, stick);
        if (score >= bestScore) continue;
        best = candidate;
        bestScore = score;
      }
    }
    return best;
  }
}

/** Distance left to the stick, worse in rocky ground. The original also
 *  weighed heading, but always with no heading, so that factor is a constant. */
function scoreWaypoint(world: World, candidate: Point, stick: Point): number {
  return manhattan(candidate, stick) * (1 + rockDensity(world, candidate) * 0.5);
}

function rockDensity(world: World, center: Point): number {
  let rocks = 0;
  let cells = 0;
  for (let dy = -DENSITY_REACH; dy <= DENSITY_REACH; dy++) {
    for (let dx = -DENSITY_REACH; dx <= DENSITY_REACH; dx++) {
      const point = { x: center.x + dx, y: center.y + dy };
      if (!isInBounds(point)) continue;
      cells++;
      if (world.tiles[indexOf(point)] === 'rock') rocks++;
    }
  }
  return cells === 0 ? 0 : rocks / cells;
}
