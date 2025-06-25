const store = new Map<string, string>();
const hashes = new Map<string, Record<string, string | number>>();

export const RedisMockStore = {
  async get(key: string): Promise<string> {
    return store.get(key) ?? null;
  },

  async hGetAll(key: string): Promise<Record<string, string | number>> {
    return hashes.get(key) ?? {};
  },

  async scan(match: string): Promise<Map<string, string>> {
    const regex = new RegExp('^' + match.replace('*', '.*') + '$');
    const result = new Map<string, string>();

    for (const [key, value] of store.entries()) {
      if (regex.test(key)) {
        result.set(key, value);
      }
    }

    return result;
  },

  async set(key: string, value: string) {
    store.set(key, value);
  },

  async hSet(key: string, value: Record<string, string | number>) {
    hashes.set(key, value);
  },

  async clear() {
    store.clear();
    hashes.clear();
  },
};
