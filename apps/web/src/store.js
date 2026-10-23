export const STORAGE_KEY = "linka.captures.v1";

export function normalizeCapture(item) {
  if (!item || typeof item !== "object") return null;
  const text = typeof item.text === "string" ? item.text.trim() : "";
  if (!text) return null;
  const createdAt = Number(item.createdAt || item.savedAt || Date.now());
  return {
    id: String(item.id || `capture-${createdAt}-${Math.random().toString(36).slice(2, 8)}`),
    text: text.slice(0, 100000),
    createdAt: Number.isFinite(createdAt) && createdAt > 0 ? createdAt : Date.now(),
    updatedAt: Number(item.updatedAt || createdAt || Date.now()),
    pinned: Boolean(item.pinned),
  };
}

export function loadCaptures(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data.map(normalizeCapture).filter(Boolean) : [];
  } catch { return []; }
}
export function saveCaptures(items, storage = globalThis.localStorage) {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(items.map(normalizeCapture).filter(Boolean).slice(0, 1000)));
    return true;
  } catch { return false; }
}
export function visibleCaptures(items, filter = "all", query = "") {
  const q = query.trim().toLocaleLowerCase();
  return items.filter(item => {
    const isLink = /^https?:\/\//i.test(item.text);
    if (filter === "pinned" && !item.pinned) return false;
    if (filter === "links" && !isLink) return false;
    if (filter === "notes" && isLink) return false;
    return !q || item.text.toLocaleLowerCase().includes(q);
  }).sort((a,b) => Number(b.pinned)-Number(a.pinned) || b.updatedAt-a.updatedAt);
}
export function makeCapture(text, existing = {}) {
  const now=Date.now();
  return normalizeCapture({
    id:existing.id || `capture-${now}-${Math.random().toString(36).slice(2,8)}`,
    text, createdAt:existing.createdAt || now, updatedAt:now, pinned:existing.pinned || false
  });
}