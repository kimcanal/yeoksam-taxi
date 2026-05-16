import type { AssetMeta } from "@/components/map-simulator/core";

type CachedAssetRecord = {
  path: string;
  payload: unknown;
  lastModified: string | null;
  featureCount: number;
  cachedAt: number;
};

type CachedAssetResult<Data> = {
  data: Data;
  meta: AssetMeta;
  cacheStatus: "network" | "cache" | "stale-cache";
};

const DB_NAME = "map-simulator-assets";
const STORE_NAME = "static-assets";
const DB_VERSION = 1;
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") {
    return Promise.resolve(null);
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "path" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readCachedRecord(path: string) {
  const database = await openDatabase();
  if (!database) {
    return null;
  }

  return new Promise<CachedAssetRecord | null>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(path);
    request.onsuccess = () => resolve((request.result as CachedAssetRecord) ?? null);
    request.onerror = () => reject(request.error);
  });
}

async function writeCachedRecord(record: CachedAssetRecord) {
  const database = await openDatabase();
  if (!database) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(record);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function metaFromRecord(record: CachedAssetRecord): AssetMeta {
  return {
    path: record.path,
    lastModified: record.lastModified,
    featureCount: record.featureCount,
  };
}

export async function fetchCachedJsonAsset<Data>(
  path: string,
  countResolver: (data: Data) => number,
  ttlMs = DEFAULT_TTL_MS,
): Promise<CachedAssetResult<Data>> {
  const cached = await readCachedRecord(path);
  const isCacheFresh = cached ? Date.now() - cached.cachedAt < ttlMs : false;

  if (cached && isCacheFresh) {
    return {
      data: cached.payload as Data,
      meta: metaFromRecord(cached),
      cacheStatus: "cache",
    };
  }

  try {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Failed to load ${path}: ${response.status}`);
    }

    const data = (await response.json()) as Data;
    const record: CachedAssetRecord = {
      path,
      payload: data,
      lastModified: response.headers.get("last-modified"),
      featureCount: countResolver(data),
      cachedAt: Date.now(),
    };
    await writeCachedRecord(record);

    return {
      data,
      meta: metaFromRecord(record),
      cacheStatus: "network",
    };
  } catch (error) {
    if (cached) {
      return {
        data: cached.payload as Data,
        meta: metaFromRecord(cached),
        cacheStatus: "stale-cache",
      };
    }
    throw error;
  }
}
