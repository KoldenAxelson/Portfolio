// state.ts — the one Garden instance every scene shares, plus the save
// plumbing. Scenes rebuild from it on scene.start(), so no world state lives
// in a Phaser object.

import { Garden } from './core/garden';
import { clearSave, loadSave, storageAvailable, storeSave } from './core/save';
import type { SaveFile } from './core/types';

export const W = 960;
export const H = 720;

export const world = {
  garden: Garden.fresh(),
  persistent: false,
};

export function bootWorld(): void {
  world.persistent = storageAvailable();
  const save = loadSave();
  world.garden = save ? Garden.fromSave(save) : Garden.fresh();
}

export function replaceWorld(save: SaveFile): void {
  world.garden = Garden.fromSave(save);
  saveNow();
}

export function resetWorld(): void {
  clearSave();
  world.garden = Garden.fresh();
  saveNow();
}

export function saveNow(): void {
  world.garden.consumeDirty();
  storeSave(world.garden.toSave());
}

/** Called from the scene loop: writes only when something changed. */
export function saveIfDirty(): void {
  if (world.garden.consumeDirty()) storeSave(world.garden.toSave());
}
