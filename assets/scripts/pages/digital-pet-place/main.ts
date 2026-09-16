// main.ts — Digital Pet Place entry. Phaser is a vendored global loaded by the
// standalone page (layouts/games/single.html); this bundle is compiled by
// Hugo's esbuild like every other page script on the site.

import { GardenScene } from './scenes/garden';
import { NightScene } from './scenes/night';
import { MineScene } from './scenes/mine';
import { ShopScene } from './scenes/shop';
import { H, W, bootWorld, saveNow, world } from './state';

function start(): void {
  bootWorld();
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: W,
    height: H,
    backgroundColor: '#0b1020',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    input: { activePointers: 2 },
    scene: [GardenScene, NightScene, MineScene, ShopScene],
  });
  game.events.once(Phaser.Core.Events.READY, () => document.getElementById('splash')?.remove());

  // Phaser pauses on `hidden`; losing window focus (clicking out of the
  // iframe) is not hidden, but the garden clock must only run while the game
  // is the thing being looked at (design §2).
  window.addEventListener('blur', () => {
    saveNow();
    game.loop.sleep();
  });
  window.addEventListener('focus', () => {
    if (!game.loop.running) game.loop.wake(true);
  });

  // Console handle — the live end of the same openness as the plain-JSON save.
  (window as unknown as { dpp: unknown }).dpp = { game, world };
}

// Wait (briefly) for Inter so canvas text is right from the first frame.
const fonts = document.fonts;
const fontsReady = fonts?.load ? Promise.all([fonts.load('500 16px Inter'), fonts.load('700 16px Inter')]) : Promise.resolve();
const timeout = new Promise((resolve) => window.setTimeout(resolve, 800));
Promise.race([fontsReady, timeout])
  .catch(() => undefined)
  .then(start);
