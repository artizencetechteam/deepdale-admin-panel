type CacheEntry<TValue> = {
  expiresAt: number;
  value: TValue;
};

export class TtlCache<TValue> {
  private readonly store = new Map<string, CacheEntry<TValue>>();

  constructor(private readonly ttlMs: number) {}

  get(key: string): TValue | undefined {
    const entry = this.store.get(key);

    if (!entry) {
      return undefined;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }

    return entry.value;
  }

  set(key: string, value: TValue): void {
    this.store.set(key, { expiresAt: Date.now() + this.ttlMs, value });
  }

  invalidate(key: string): void {
    this.store.delete(key);
  }

  invalidatePrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  clear(): void {
    this.store.clear();
  }
}
