// shop.ts — The Shop v1, the scene half (design §9). Sell what you don't need
// on the left, buy what you do on the right at twice the price. No pet is
// borrowed; the garden does every trade.

import type { Flavor, StatKey, Tier } from '../core/types';
import { STAT_KEYS } from '../core/types';
import { FLAVOR_LABEL, STAT_COLOR, STAT_LABEL } from '../core/rules';
import { buyPrice, eggPrice, sellPrice } from '../modules/shop';
import { H, W, saveNow, world } from '../state';
import { ensureEggTexture } from '../art/pets';
import { ensureCoinTexture, ensureGemTexture } from '../art/icons';
import { CREAM, GOLD, INK, MUTED, PANEL, darken, mix } from '../art/palette';
import { chimePop } from '../art/chime';
import { SHOP_FADE, bump, transitionTo } from '../fx';
import { Toaster, backToMeadowButton, button, pager, paginate, panelBox, text, tintedButton } from '../ui';

const WOOD = 0x9a6b3f;
const AWNING = 0xe86f6f;
const ROWS_PER_PAGE = 8;
const SELL = { x: 24, y: 96, w: 456, h: 600 };
const BUY = { x: 500, y: 96, w: 436, h: 600 };
const TIERS: Tier[] = [1, 2, 3];

export class ShopScene extends Phaser.Scene {
  private toast!: Toaster;
  private coinsText!: Phaser.GameObjects.Text;
  private sellItems: Phaser.GameObjects.GameObject[] = [];
  private buyItems: Phaser.GameObjects.GameObject[] = [];
  private page = 0;

  constructor() {
    super('shop');
  }

  create(): void {
    ensureCoinTexture(this);
    this.page = 0;
    this.sellItems = [];
    this.buyItems = [];
    this.cameras.main.fadeIn(360, ...SHOP_FADE);
    this.drawStall();
    this.toast = new Toaster(this, W / 2, H - 30);
    this.buildSell();
    this.buildBuy();
  }

  private drawStall(): void {
    const g = this.add.graphics().setDepth(-100);
    g.fillStyle(mix(CREAM, 0xffffff, 0.3), 1);
    g.fillRect(0, 0, W, H);
    for (let i = 0; i < 24; i++) {
      g.fillStyle(i % 2 ? AWNING : 0xfff3ea, 1);
      g.fillRect(i * 40, 0, 40, 44);
    }
    g.fillStyle(darken(AWNING, 0.2), 1);
    for (let i = 0; i < 24; i++) g.fillTriangle(i * 40, 44, i * 40 + 40, 44, i * 40 + 20, 58);
    g.fillStyle(WOOD, 1);
    g.lineStyle(3, INK, 1);
    g.fillRoundedRect(12, 70, W - 24, 16, 6);
    g.strokeRoundedRect(12, 70, W - 24, 16, 6);

    text(this, 24, 22, 'The Shop', 20, INK, 700).setDepth(1);
    this.add.image(W - 300, 34, 'coin').setScale(0.9).setDepth(1);
    this.coinsText = text(this, W - 284, 34, String(world.garden.coins), 16, INK, 700).setOrigin(0, 0.5).setDepth(1);
    backToMeadowButton(this, W - 100, 34, () => transitionTo(this, 'garden', SHOP_FADE, undefined, 300)).setDepth(1);
  }

  // ── sell ────────────────────────────────────────────────────────────────

  private buildSell(): void {
    for (const o of this.sellItems) o.destroy();
    this.sellItems = [];
    const { x, y, w, h } = SELL;
    const keep = <T extends Phaser.GameObjects.GameObject>(obj: T): T => {
      this.sellItems.push(obj);
      return obj;
    };
    keep(panelBox(this, x, y, w, h));
    keep(text(this, x + 20, y + 16, 'Sell', 16, INK, 700));
    keep(text(this, x + w - 20, y + 20, TIERS.map((t) => `tier ${t} · ${sellPrice(t)}`).join('   '), 11, MUTED, 500).setOrigin(1, 0.5));

    const stacks = world.garden.stacks().sort((a, b) => STAT_KEYS.indexOf(a.stat) - STAT_KEYS.indexOf(b.stat) || b.tier - a.tier || a.flavor.localeCompare(b.flavor));
    const page = paginate(stacks, this.page, ROWS_PER_PAGE);
    this.page = page.page;
    if (stacks.length === 0) keep(text(this, x + w / 2, y + h / 2, 'Nothing to sell yet.', 14, MUTED, 600).setOrigin(0.5));
    page.items.forEach((stack, i) => {
      const ry = y + 62 + i * 62;
      const color = STAT_COLOR[stack.stat];
      const row = keep(this.add.graphics());
      row.fillStyle(mix(PANEL, color, 0.08), 1);
      row.fillRoundedRect(x + 12, ry - 24, w - 24, 52, 10);
      keep(this.add.image(x + 38, ry, ensureGemTexture(this, stack.stat, stack.tier, stack.flavor)));
      keep(text(this, x + 60, ry - 10, `${STAT_LABEL[stack.stat]} · tier ${stack.tier} · ${FLAVOR_LABEL[stack.flavor]}`, 13, INK, 700).setOrigin(0, 0.5));
      keep(text(this, x + 60, ry + 10, `×${stack.count} in the pouch · ${sellPrice(stack.tier)} each`, 11, MUTED, 500).setOrigin(0, 0.5));
      const style = { h: 28, size: 12, ...tintedButton(color) };
      keep(button(this, x + w - 140, ry, 'Sell 1', () => this.sell(stack.stat, stack.tier, stack.flavor, 1), { w: 72, ...style }));
      keep(button(this, x + w - 58, ry, 'Sell all', () => this.sell(stack.stat, stack.tier, stack.flavor, stack.count), { w: 80, ...style }));
    });
    for (const o of pager(this, x + w / 2, y + h - 24, page, (dir) => this.turnPage(dir))) keep(o);
  }

  private turnPage(dir: number): void {
    this.page += dir;
    this.buildSell();
  }

  private sell(stat: StatKey, tier: Tier, flavor: Flavor, count: number): void {
    const earned = world.garden.sell(stat, tier, flavor, count);
    if (!earned) return;
    this.afterTrade(`Sold for ${earned} coins.`, true);
  }

  // ── buy ─────────────────────────────────────────────────────────────────

  private buildBuy(): void {
    for (const o of this.buyItems) o.destroy();
    this.buyItems = [];
    const { x, y, w, h } = BUY;
    const keep = <T extends Phaser.GameObjects.GameObject>(obj: T): T => {
      this.buyItems.push(obj);
      return obj;
    };
    keep(panelBox(this, x, y, w, h));
    keep(text(this, x + 20, y + 16, 'Buy', 16, INK, 700));
    keep(text(this, x + w - 20, y + 20, 'shop stock is neutral', 11, MUTED, 500).setOrigin(1, 0.5));
    const coins = world.garden.coins;

    STAT_KEYS.forEach((stat, i) => {
      const ry = y + 76 + i * 64;
      const color = STAT_COLOR[stat];
      const swatch = keep(this.add.graphics());
      swatch.fillStyle(color, 1);
      swatch.fillRoundedRect(x + 20, ry - 14, 10, 28, 4);
      keep(text(this, x + 40, ry, STAT_LABEL[stat], 14, INK, 700).setOrigin(0, 0.5));
      TIERS.forEach((tier, j) => {
        const bx = x + 150 + j * 94;
        keep(this.add.image(bx - 30, ry, ensureGemTexture(this, stat, tier, 'neutral')).setScale(0.8));
        const buy = keep(button(this, bx + 14, ry, String(buyPrice(tier)), () => this.buy(stat, tier), { w: 58, h: 28, size: 12, ...tintedButton(color) }));
        buy.setEnabled(coins >= buyPrice(tier));
      });
    });

    const ey = y + 76 + STAT_KEYS.length * 64 + 24;
    const eggBox = keep(this.add.graphics());
    eggBox.fillStyle(mix(PANEL, GOLD, 0.12), 1);
    eggBox.fillRoundedRect(x + 12, ey - 36, w - 24, 84, 12);
    keep(this.add.image(x + 52, ey + 4, ensureEggTexture(this, 'power', 0, false)).setScale(0.62));
    keep(text(this, x + 86, ey - 14, 'Base egg', 14, INK, 700).setOrigin(0, 0.5));
    keep(text(this, x + 86, ey + 6, 'All E grades — the floor, never a shortcut', 11, MUTED, 500).setOrigin(0, 0.5));
    keep(text(this, x + 86, ey + 24, 'past breeding. Always lets you repopulate.', 11, MUTED, 500).setOrigin(0, 0.5));
    const buyEgg = keep(button(this, x + w - 70, ey + 4, String(eggPrice()), () => this.buyEgg(), { w: 84, h: 32, size: 13, fill: mix(PANEL, GOLD, 0.25), line: darken(GOLD, 0.2) }));
    buyEgg.setEnabled(coins >= eggPrice());
  }

  private buy(stat: StatKey, tier: Tier): void {
    if (!world.garden.buy(stat, tier)) return this.toast.show('Not enough coins.');
    this.afterTrade(`Bought a ${STAT_LABEL[stat]} power-up (tier ${tier}).`, false);
  }

  private buyEgg(): void {
    if (!world.garden.buyEgg()) return this.toast.show('Not enough coins.');
    this.afterTrade('A base egg is in your tray.', true);
  }

  private afterTrade(message: string, happyChime: boolean): void {
    chimePop(happyChime);
    this.coinsText.setText(String(world.garden.coins));
    bump(this, this.coinsText, 1.2);
    this.toast.show(message);
    this.buildSell();
    this.buildBuy();
    saveNow();
  }
}
