/**
 * Cache persistant des activites via IndexedDB (stale-while-revalidate).
 *
 * Objectif perf : au chargement/refresh, rendre instantanement depuis le
 * cache local pendant qu'une requete reseau revalide en arriere-plan.
 * IndexedDB (vs localStorage) gere les gros volumes (plusieurs Mo) sans
 * bloquer le thread principal.
 *
 * Cle de cache : par utilisateur + mode (light/raw).
 */

const DB_NAME = "runsee-cache";
const STORE = "activities";
const DB_VERSION = 1;
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24h : au-dela on ignore le cache

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB indisponible"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function cacheKey(userId, mode) {
  return `activities:${userId || "anon"}:${mode || "light"}`;
}

/**
 * Lit le cache. Retourne { activities, cachedAt } ou null.
 */
export async function readActivitiesCache(userId, mode) {
  try {
    const db = await openDb();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(cacheKey(userId, mode));
      req.onsuccess = () => {
        const val = req.result;
        if (!val || !Array.isArray(val.activities)) {
          resolve(null);
          return;
        }
        if (Date.now() - (val.cachedAt || 0) > MAX_AGE_MS) {
          resolve(null);
          return;
        }
        resolve(val);
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Ecrit le cache (best-effort, non bloquant).
 */
export async function writeActivitiesCache(userId, mode, activities) {
  try {
    const db = await openDb();
    await new Promise((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put({ activities, cachedAt: Date.now() }, cacheKey(userId, mode));
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // silencieux : le cache est un bonus, jamais bloquant
  }
}

export async function clearActivitiesCache() {
  try {
    const db = await openDb();
    await new Promise((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // ignore
  }
}
