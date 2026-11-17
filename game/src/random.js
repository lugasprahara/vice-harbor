// A small seeded random number generator (sfc32): the same seed gives the same
// city, the same traffic and the same missions, which is what makes the
// screenshot scenes repeatable from one run to the next.

export function createRandom(seed) {
  let a = seed >>> 0;
  let b = (seed ^ 0x9e3779b9) >>> 0;
  let c = (seed ^ 0x85ebca6b) >>> 0;
  let d = (seed ^ 0xc2b2ae35) >>> 0;
  return function random() {
    a >>>= 0;
    b >>>= 0;
    c >>>= 0;
    d >>>= 0;
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

/** A number between min (inclusive) and max (exclusive). */
export function randomRange(random, min, max) {
  return min + random() * (max - min);
}

/** A whole number between min and max, both inclusive. */
export function randomInt(random, min, max) {
  return min + Math.floor(random() * (max - min + 1));
}

/** One element of an array, picked at random. */
export function randomPick(random, items) {
  return items[Math.floor(random() * items.length)];
}
