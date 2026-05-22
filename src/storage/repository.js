const STORAGE_KEY = "focus-anchor-data";

export function createMemoryRepository(initialData = null) {
  let current = cloneData(initialData);
  return {
    async load() {
      return cloneData(current);
    },
    async save(data) {
      current = cloneData(data);
      return cloneData(current);
    }
  };
}

export function createChromeRepository(chromeStorage = globalThis.chrome?.storage?.local) {
  return {
    async load() {
      const result = await chromeStorage.get(STORAGE_KEY);
      return result[STORAGE_KEY] ?? null;
    },
    async save(data) {
      await chromeStorage.set({ [STORAGE_KEY]: data });
      return data;
    }
  };
}

function cloneData(data) {
  return data === null ? null : structuredClone(data);
}
