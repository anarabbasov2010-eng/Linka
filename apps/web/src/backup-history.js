export const BACKUP_HISTORY_DB = "linka-backup-history-v1";
export const BACKUP_HISTORY_STORE = "snapshots";
export const MAX_BACKUP_SNAPSHOTS = 5;
export const MAX_AUTOMATIC_SNAPSHOT_BYTES = 12 * 1024 * 1024;

export function trimBackupSnapshots(snapshots, maxCount = MAX_BACKUP_SNAPSHOTS) {
  const limit = Math.max(0, Math.min(50, Math.floor(Number(maxCount) || 0)));
  return [...(Array.isArray(snapshots) ? snapshots : [])]
    .filter(item => item && typeof item.id === "string" && Number.isFinite(Number(item.createdAt)))
    .sort((a, b) => Number(b.createdAt) - Number(a.createdAt))
    .slice(0, limit);
}

function openBackupHistoryDatabase() {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise(resolve => {
    const request = indexedDB.open(BACKUP_HISTORY_DB, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(BACKUP_HISTORY_STORE)) {
        const store = db.createObjectStore(BACKUP_HISTORY_STORE, { keyPath: "id" });
        store.createIndex("createdAt", "createdAt");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
}

let databasePromise;
function database() {
  if (!databasePromise) databasePromise = openBackupHistoryDatabase();
  return databasePromise;
}

export async function saveBackupSnapshot(snapshot, maxCount = MAX_BACKUP_SNAPSHOTS) {
  if (!snapshot || typeof snapshot.id !== "string" || !snapshot.id ||
      !Number.isFinite(Number(snapshot.createdAt)) || !snapshot.backup ||
      snapshot.backup.format !== "linka-backup" || !Array.isArray(snapshot.backup.captures)) {
    throw new TypeError("Invalid Linka backup snapshot.");
  }
  const db = await database();
  if (!db) return { saved: false, reason: "indexeddb-unavailable" };
  const limit = Math.max(1, Math.min(50, Math.floor(Number(maxCount) || MAX_BACKUP_SNAPSHOTS)));
  return new Promise((resolve, reject) => {
    const tx = db.transaction(BACKUP_HISTORY_STORE, "readwrite");
    const store = tx.objectStore(BACKUP_HISTORY_STORE);
    store.put(snapshot);
    const request = store.getAll();
    request.onsuccess = () => {
      const keep = new Set(trimBackupSnapshots(request.result || [], limit).map(item => item.id));
      for (const item of request.result || []) {
        if (!keep.has(item.id)) store.delete(item.id);
      }
    };
    request.onerror = () => {
      try { tx.abort(); } catch {}
    };
    tx.oncomplete = () => resolve({ saved: true, count: limit });
    tx.onerror = () => reject(tx.error || new Error("Could not save a local backup snapshot."));
    tx.onabort = () => reject(tx.error || new Error("Local backup snapshot was rolled back."));
  });
}

export async function listBackupSnapshots() {
  const db = await database();
  if (!db) return [];
  const records = await new Promise((resolve, reject) => {
    const request = db.transaction(BACKUP_HISTORY_STORE, "readonly").objectStore(BACKUP_HISTORY_STORE).getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error || new Error("Could not read backup history."));
  });
  return trimBackupSnapshots(records);
}

export async function getBackupSnapshot(id) {
  const db = await database();
  if (!db) return null;
  return new Promise((resolve, reject) => {
    const request = db.transaction(BACKUP_HISTORY_STORE, "readonly").objectStore(BACKUP_HISTORY_STORE).get(String(id));
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error || new Error("Could not open this backup snapshot."));
  });
}

export async function deleteBackupSnapshot(id) {
  const db = await database();
  if (!db) return false;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(BACKUP_HISTORY_STORE, "readwrite");
    tx.objectStore(BACKUP_HISTORY_STORE).delete(String(id));
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error || new Error("Could not remove backup snapshot."));
    tx.onabort = () => reject(tx.error || new Error("Backup snapshot removal was rolled back."));
  });
}
