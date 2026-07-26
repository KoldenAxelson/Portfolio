// Which quote is on screen, and what comes next.

const RESHUFFLE_TRIES = 8;

export interface Deck {
  current: () => number;
  advance: () => number;
}

export function createDeck(count: number): Deck {
  let order = shuffle(range(count));
  let position = 0;

  return {
    current: () => order[position],
    advance: () => {
      position += 1;
      if (position >= order.length) {
        // Deck spent. Re-roll if the fresh order would open on the quote already
        // on screen, which reads as the click having done nothing.
        const last = order[order.length - 1];
        let tries = 0;
        do {
          order = shuffle(order);
          tries += 1;
        } while (order.length > 1 && order[0] === last && tries < RESHUFFLE_TRIES);
        position = 0;
      }
      return order[position];
    },
  };
}

const range = (count: number): number[] => Array.from({ length: count }, (_, i) => i);

function shuffle(items: number[]): number[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
