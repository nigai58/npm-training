export class Random {
  constructor(seed = Date.now()) {
    this.seed = seed;
  }

  next() {
    this.seed = (this.seed * 1664525 + 1013904223) & 0xffffffff;
    return (this.seed >>> 0) / 0xffffffff;
  }

  int(min, max) { return Math.floor(this.next() * (max - min + 1)) + min; }
  float(min, max) { return this.next() * (max - min) + min; }
  pick(arr) { return arr[this.int(0, arr.length - 1)]; }
  bool(chance = 0.5) { return this.next() < chance; }
}
