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
    previewTitle: String(item.previewTitle || "").slice(0, 180),
    previewDescription: String(item.previewDescription || "").slice(0, 320),
    previewImageUrl: String(item.previewImageUrl || "").slice(0, 2048),
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
export function parseSearchQuery(query = "") {
  const tokens = String(query).match(/"[^"]*"|\S+/g) || [];
  const parsed = { text: [], type: "", pinned: false, site: "", before: null, after: null };
  for (const raw of tokens) {
    const token = raw.replace(/^"|"$/g, "");
    const lower = token.toLocaleLowerCase();
    if (lower === "is:pinned") { parsed.pinned = true; continue; }
    if (lower === "type:link" || lower === "type:note") { parsed.type = lower.slice(5); continue; }
    if (lower.startsWith("site:") && lower.slice(5).trim()) {
      parsed.site = lower.slice(5).trim().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
      continue;
    }
    const dateMatch = lower.match(/^(before|after):(\d{4}-\d{2}-\d{2})$/);
    if (dateMatch) {
      const timestamp = Date.parse(dateMatch[2] + "T00:00:00");
      if (Number.isFinite(timestamp)) {
        parsed[dateMatch[1]] = timestamp;
        continue;
      }
    }
    parsed.text.push(token);
  }
  return { ...parsed, text: parsed.text.join(" ").trim().toLocaleLowerCase() };
}

export function visibleCaptures(items, filter = "all", query = "") {
  const parsed = parseSearchQuery(query);
  return items.filter(item => {
    const isLink = /^https?:\/\//i.test(item.text);
    if (filter === "pinned" && !item.pinned) return false;
    if (filter === "links" && !isLink) return false;
    if (filter === "notes" && isLink) return false;
    if (parsed.pinned && !item.pinned) return false;
    if (parsed.type === "link" && !isLink) return false;
    if (parsed.type === "note" && isLink) return false;
    let host = "";
    if (isLink) { try { host = new URL(item.text).hostname.replace(/^www\./i, "").toLocaleLowerCase(); } catch {} }
    if (parsed.site && !(host === parsed.site || host.endsWith("." + parsed.site))) return false;
    const savedAt = Number(item.createdAt || item.updatedAt || 0);
    if (parsed.before !== null && !(savedAt < parsed.before)) return false;
    if (parsed.after !== null && !(savedAt >= parsed.after)) return false;
    const searchable = [item.text, item.previewTitle, item.previewDescription, host].join(" ").toLocaleLowerCase();
    return !parsed.text || searchable.includes(parsed.text);
  }).sort((a,b) => Number(b.pinned)-Number(a.pinned) || b.updatedAt-a.updatedAt);
}
export function makeCapture(text, existing = {}) {
  const now=Date.now();
  return normalizeCapture({
    id:existing.id || `capture-${now}-${Math.random().toString(36).slice(2,8)}`,
    text, createdAt:existing.createdAt || now, updatedAt:now, pinned:existing.pinned || false,
    previewTitle: existing.previewTitle || "", previewDescription: existing.previewDescription || "", previewImageUrl: existing.previewImageUrl || ""
  });
}