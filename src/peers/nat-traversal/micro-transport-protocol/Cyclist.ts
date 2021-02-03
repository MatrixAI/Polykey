class Cyclist<T> {
  mask: number
  size: number
  values: Map<number, T | undefined> = new Map
  // values: (T | undefined)[] = []

  private twoify(n: number) {
    if (n && !(n & (n - 1))) return n
    var p = 1
    while (p < n) p <<= 1
    return p
  }

  constructor(size: number) {
    size = this.twoify(size)
    this.mask = size - 1
    this.size = size
    // this.values = new Array(size)
  }

  put(index: number, val: T): number {
    const pos = index & this.mask
    this.values.set(pos, val)
    return pos
  }

  get(index: number): T | undefined {
    return this.values.get(index & this.mask) ?? undefined
  }

  del(index: number): T | undefined {
    const pos = index & this.mask
    const val = this.values.get(pos)
    this.values.set(pos, undefined)
    return val
  }
}

export default Cyclist
