export function stringToSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

export function mulberry32(seed: number): () => number {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export function createRng(seed: string | number): () => number {
  const numericSeed = typeof seed === 'string' ? stringToSeed(seed) : seed;
  return mulberry32(numericSeed);
}

export function rollD20(rng: () => number): number {
  return Math.floor(rng() * 20) + 1;
}

export function roll2d10(rng: () => number): number {
  const d1 = Math.floor(rng() * 10) + 1;
  const d2 = Math.floor(rng() * 10) + 1;
  return d1 + d2;
}
