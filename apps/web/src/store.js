export const STORAGE_KEY = "linka.captures.v1";
export const RECOVERY_KEY = "linka.captures.recovery.v1";
const VALID_STATUSES = new Set(["unread", "reading", "done", "deferred", "important"]);

export function normalizeCapture(item) {
  if (!item || typeof item !== "object") return null;
  const text = typeof item.text === "string" ? item.text.trim() : "";
  if (!text) return null;
  const createdAt = Number(item.createdAt || item.savedAt || Date.now());
  const updatedAt = Number(item.updatedAt || createdAt || Date.now());
  const tags = Array.isArray(item.tags)
    ? [...new Set(item.tags.map(tag => String(tag || "").trim().toLowerCase().replace(/\s+/g, "-").slice(0, 40)).filter(Boolean))].slice(0, 50)
    : [];
  const status = VALID_STATUSES.has(item.status) ? item.status : "unread";
  return {
    id: String(item.id || `capture-${createdAt}-${Math.random().toString(36).slice(2, 8)}`),
    // Never truncate existing user content during a load/save round trip.
    text,
    createdAt: Number.isFinite(createdAt) && createdAt > 0 ? createdAt : Date.now(),
    updatedAt: Number.isFinite(updatedAt) && updatedAt > 0 ? updatedAt : Date.now(),
    pinned: Boolean(item.pinned),
    archived: Boolean(item.archived),
    status,
    tags,
    previewTitle: String(item.previewTitle || "").slice(0, 180),
    previewDescription: String(item.previewDescription || "").slice(0, 320),
    previewImageUrl: String(item.previewImageUrl || "").slice(0, 2048),
  };
}

function storeRecoverySnapshot(storage, raw, reason) {
  try {
    if (storage?.getItem(RECOVERY_KEY)) return;
    storage?.setItem(RECOVERY_KEY, JSON.stringify({
      format: "linka-capture-recovery",
      version: 1,
      capturedAt: Date.now(),
      reason: String(reason || "Stored library could not be parsed").slice(0, 240),
      raw
    }));
  } catch {}
}

/** Inspect local storage without confusing a damaged store with an empty one. */
export function inspectCaptureStorage(storage = globalThis.localStorage) {
  if (!storage || typeof storage.getItem !== "function") {
    return { status: "unavailable", captures: [], raw: null, error: "Local storage is unavailable." };
  }
  let raw;
  try { raw = storage.getItem(STORAGE_KEY); }
  catch (error) { return { status: "unavailable", captures: [], raw: null, error: String(error?.message || error) }; }
  if (raw == null) return { status: "empty", captures: [], raw: null, error: null };
  let parsed;
  try {
    parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new TypeError("The library root is not a JSON array.");
  } catch (error) {
    storeRecoverySnapshot(storage, raw, error?.message);
    return { status: "corrupt", captures: [], raw, error: String(error?.message || error) };
  }
  return { status: parsed.length ? "ok" : "empty", captures: parsed.map(normalizeCapture).filter(Boolean), raw, error: null };
}

export function getCaptureStorageStatus(storage = globalThis.localStorage) {
  const inspected = inspectCaptureStorage(storage);
  let hasRecovery = false;
  try { hasRecovery = Boolean(storage?.getItem(RECOVERY_KEY)); } catch {}
  return { status: inspected.status, error: inspected.error, hasRecovery };
}
export function getCaptureRecoveryData(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(RECOVERY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && parsed.format === "linka-capture-recovery" && typeof parsed.raw === "string" ? parsed : null;
  } catch { return null; }
}
export function loadCaptures(storage = globalThis.localStorage) { return inspectCaptureStorage(storage).captures; }

/** Ordinary writes refuse to replace corrupt data; explicit backup import may override it. */
export function saveCaptures(items, storage = globalThis.localStorage, { allowReplaceCorrupt = false } = {}) {
  if (!Array.isArray(items) || !storage || typeof storage.setItem !== "function") return false;
  const inspected = inspectCaptureStorage(storage);
  if (inspected.status === "unavailable" || (inspected.status === "corrupt" && !allowReplaceCorrupt)) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(items.map(normalizeCapture).filter(Boolean)));
    return true;
  } catch { return false; }
}

export function parseSearchQuery(query = "") {
  const tokens = String(query).match(/"[^"]*"|\S+/g) || [];
  const parsed = { text: [], type: "", pinned: false, site: "", before: null, after: null, tag: "", status: "", archived: false };
  for (const raw of tokens) {
    const token = raw.replace(/^"|"$/g, "");
    const lower = token.toLocaleLowerCase();
    if (lower === "is:pinned") { parsed.pinned = true; continue; }
    if (lower === "is:archived" || lower === "in:archive") { parsed.archived = true; continue; }
    if (lower === "is:unread") { parsed.status = "unread"; continue; }
    if (lower === "is:important") { parsed.status = "important"; continue; }
    if (lower === "type:link" || lower === "type:note") { parsed.type = lower.slice(5); continue; }
    if (lower.startsWith("tag:") && lower.slice(4).trim()) { parsed.tag = lower.slice(4).trim(); continue; }
    if (lower.startsWith("status:") && VALID_STATUSES.has(lower.slice(7))) { parsed.status = lower.slice(7); continue; }
    if (lower.startsWith("site:") && lower.slice(5).trim()) {
      parsed.site = lower.slice(5).trim().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
      continue;
    }
    const dateMatch = lower.match(/^(before|after):(\d{4}-\d{2}-\d{2})$/);
    if (dateMatch) {
      const timestamp = Date.parse(dateMatch[2] + "T00:00:00");
      if (Number.isFinite(timestamp)) { parsed[dateMatch[1]] = timestamp; continue; }
    }
    parsed.text.push(token);
  }
  return { ...parsed, text: parsed.text.join(" ").trim().toLocaleLowerCase() };
}

export function visibleCaptures(items, filter = "all", query = "") {
  const parsed = parseSearchQuery(query);
  return items.filter(item => {
    const isLink = /^https?:\/\//i.test(item.text);
    if (parsed.archived) { if (!item.archived) return false; }
    else if (filter === "archived") { if (!item.archived) return false; }
    else if (item.archived) return false;
    if (filter === "pinned" && !item.pinned) return false;
    if (filter === "links" && !isLink) return false;
    if (filter === "notes" && isLink) return false;
    if (parsed.pinned && !item.pinned) return false;
    if (parsed.status && (item.status || "unread") !== parsed.status) return false;
    if (parsed.tag && !(item.tags || []).some(tag => String(tag).toLocaleLowerCase() === parsed.tag)) return false;
    if (parsed.type === "link" && !isLink) return false;
    if (parsed.type === "note" && isLink) return false;
    let host = "";
    if (isLink) { try { host = new URL(item.text).hostname.replace(/^www\./i, "").toLocaleLowerCase(); } catch {} }
    if (parsed.site && !(host === parsed.site || host.endsWith("." + parsed.site))) return false;
    const savedAt = Number(item.createdAt || item.updatedAt || 0);
    if (parsed.before !== null && !(savedAt < parsed.before)) return false;
    if (parsed.after !== null && !(savedAt >= parsed.after)) return false;
    const searchable = [item.text, item.previewTitle, item.previewDescription, host, ...(item.tags || [])].join(" ").toLocaleLowerCase();
    return !parsed.text || searchable.includes(parsed.text);
  }).sort((a,b) => Number(b.pinned)-Number(a.pinned) || b.updatedAt-a.updatedAt);
}
export function makeCapture(text, existing = {}) {
  const now = Date.now();
  return normalizeCapture({ ...existing, id: existing.id || `capture-${now}-${Math.random().toString(36).slice(2,8)}`, text,
    createdAt: existing.createdAt || now, updatedAt: now, pinned: existing.pinned || false, archived: existing.archived || false,
    status: existing.status || "unread", tags: existing.tags || [], previewTitle: existing.previewTitle || "",
    previewDescription: existing.previewDescription || "", previewImageUrl: existing.previewImageUrl || "" });
}
