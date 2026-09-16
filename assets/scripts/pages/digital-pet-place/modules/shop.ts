// shop.ts — Module 3, The Shop v1 (design §9). Interface only; borrows no pet.
// Coins exist to make this trade possible: sell a power-up for coins, buy one
// for twice that. Two in, one out — a lossy laundering service that turns a
// stat you don't need into one you do.
//
// Decisions taken for the POC (both tunable in core/rules.ts):
// - Prices scale by tier (open question #1), so commons can't be ground into
//   rares at a fixed exchange.
// - Shop stock is always Neutral-flavored. Hero and Dark come only from the
//   modules, which keeps alignment a thing you earn, not buy.

import type { Tier } from '../core/types';
import { SHOP_BUY_MULTIPLIER, SHOP_EGG_PRICE, SHOP_SELL } from '../core/rules';

export function sellPrice(tier: Tier): number {
  return SHOP_SELL[tier];
}

export function buyPrice(tier: Tier): number {
  return SHOP_SELL[tier] * SHOP_BUY_MULTIPLIER;
}

export function eggPrice(): number {
  return SHOP_EGG_PRICE;
}
