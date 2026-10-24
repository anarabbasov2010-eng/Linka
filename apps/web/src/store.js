export const STORAGE_KEY = "linka.captures.v1";
export const RECOVERY_KEY = "linka.captures.recovery.v1";

function normalizeTags(value) {
  const source = Array.isArray(value) ? value : (typeof value === "string" ? value.split(/[,;\n]+/) : []);
  const tags = new Map();
  for (const raw of source) {
    const tag = String(raw || "").trim().replace(/^#+/, "").replace(/\s+/g, " ").slice(0, 40);
    if (tag && !tags.has(tag.toLocaleLowerCase())) tags.set(tag.toLocaleLowerCase(), tag);
  }
  return [...tags.values()].slice(0, 24);
}

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
    readLater: Boolean(item.readLater),
    archivedAt: Math.max(0, Number(item.archivedAt) || 0),
    trashedAt: Math.max(0, Number(item.trashedAt) || 0),
    tags: normalizeTags(item.tags),
    collection: String(item.collection || "").trim().slice(0, 80),
    previewTitle: String(item.previewTitle || "").slice(0, 180),
    previewDescription: String(item.previewDescription || "").slice(0, 320),
    previewImageUrl: String(item.previewImageUrl || "").slice(0, 2048),
  };
}

function rememberCaptureRecovery(raw, storage) {
  if (typeof raw !== "string") return;
  try {
    const currentRaw = storage?.getItem(RECOVERY_KEY);
    let current = null;
    try { current = currentRaw ? JSON.parse(currentRaw) : null; } catch {}
    if (current && typeof current.raw === "string" && current.raw === raw) return;
    storage?.setItem(RECOVERY_KEY, JSON.stringify({
      raw,
      reason: "capture-store-parse-error",
      createdAt: Date.now(),
      acknowledged: false
    }));
  } catch {
    // Keep the original storage key untouched. The caller still blocks writes
    // after detecting the malformed source, even if a second copy cannot fit.
  }
}

/**
 * Returns the preserved source when the capture store cannot be read.
 * An acknowledged recovery record is retained for manual export/diagnostics.
 */
export function getCaptureRecovery(storage = globalThis.localStorage) {
  try {
    const savedRaw = storage?.getItem(RECOVERY_KEY);
    if (savedRaw) {
      try {
        const saved = JSON.parse(savedRaw);
        if (saved && typeof saved.raw === "string") return saved;
      } catch {}
    }
  } catch {}

  try {
    const raw = storage?.getItem(STORAGE_KEY);
    if (raw == null || raw === "") return null;
    try {
      if (Array.isArray(JSON.parse(raw))) return null;
    } catch {}
    rememberCaptureRecovery(raw, storage);
    try {
      const preserved = storage?.getItem(RECOVERY_KEY);
      if (preserved) {
        const value = JSON.parse(preserved);
        if (value && typeof value.raw === "string") return value;
      }
    } catch {}
    return { raw, reason: "capture-store-parse-error", createdAt: Date.now(), acknowledged: false, preservedSeparately: false };
  } catch {
    return null;
  }
}

/**
 * Starts an empty library only after the malformed source has been preserved.
 * The recovery payload remains available for export after the user continues.
 */
export function startFreshCaptureLibrary(storage = globalThis.localStorage) {
  const recovery = getCaptureRecovery(storage);
  if (!recovery || recovery.acknowledged) return false;
  try {
    let savedRaw = storage?.getItem(RECOVERY_KEY);
    let saved = savedRaw ? JSON.parse(savedRaw) : null;
    if (!saved || typeof saved.raw !== "string" || saved.raw !== recovery.raw) {
      rememberCaptureRecovery(recovery.raw, storage);
      savedRaw = storage?.getItem(RECOVERY_KEY);
      saved = savedRaw ? JSON.parse(savedRaw) : null;
    }
    if (!saved || typeof saved.raw !== "string" || saved.raw !== recovery.raw) return false;
    storage.setItem(STORAGE_KEY, "[]");
    storage.setItem(RECOVERY_KEY, JSON.stringify({ ...saved, acknowledged: true, acknowledgedAt: Date.now() }));
    return true;
  } catch {
    return false;
  }
}

export function loadCaptures(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    if (raw == null || raw === "") return [];
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) throw new Error("Capture storage is not an array");
    return data.map(normalizeCapture).filter(Boolean);
  } catch {
    try {
      const raw = storage?.getItem(STORAGE_KEY);
      if (typeof raw === "string") rememberCaptureRecovery(raw, storage);
    } catch {}
    return [];
  }
}
export function saveCaptures(items, storage = globalThis.localStorage) {
  try {
    if (!storage || typeof storage.setItem !== "function") return false;
    const recovery = getCaptureRecovery(storage);
    if (recovery && !recovery.acknowledged) return false;
    // Never silently truncate a user's library. Quota errors are reported to
    // the caller while the previous value remains intact.
    storage.setItem(STORAGE_KEY, JSON.stringify(items.map(normalizeCapture).filter(Boolean)));
    return true;
  } catch { return false; }
}
export function parseSearchQuery(query = "") {
  const tokens = String(query).match(/"[^"]*"|\S+/g) || [];
  const parsed = { text: [], type: "", pinned: false, readLater: false, archived: false, trashed: false, tag: "", collection: "", site: "", before: null, after: null };
  for (const raw of tokens) {
    const token = raw.replace(/^"|"$/g, "");
    const lower = token.toLocaleLowerCase();
    if (lower === "is:pinned") { parsed.pinned = true; continue; }
    if (lower === "is:later" || lower === "is:readlater") { parsed.readLater = true; continue; }
    if (lower === "is:archived") { parsed.archived = true; continue; }
    if (lower === "is:trash" || lower === "is:trashed") { parsed.trashed = true; continue; }
    if (lower.startsWith("tag:") && lower.slice(4).trim()) { parsed.tag = lower.slice(4).trim().replace(/^#+/, ""); continue; }
    if (lower.startsWith("in:") && lower.slice(3).trim()) { parsed.collection = lower.slice(3).trim(); continue; }
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
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
  const startOfTomorrow = new Date(startOfToday); startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
  return items.filter(item => {
    const isLink = /^https?:\/\//i.test(item.text);
    const showTrash = filter === "trash" || parsed.trashed;
    const showArchive = filter === "archive" || parsed.archived;
    if (showTrash ? !item.trashedAt : Boolean(item.trashedAt)) return false;
    if (!showTrash && (showArchive ? !item.archivedAt : Boolean(item.archivedAt))) return false;
    if (filter === "pinned" && !item.pinned) return false;
    if (filter === "links" && !isLink) return false;
    if (filter === "notes" && isLink) return false;
    if (filter === "read-later" && !item.readLater) return false;
    if (parsed.pinned && !item.pinned) return false;
    if (parsed.readLater && !item.readLater) return false;
    if (parsed.tag && !(item.tags || []).some(tag => String(tag).toLocaleLowerCase().includes(parsed.tag))) return false;
    if (parsed.collection && !String(item.collection || "").toLocaleLowerCase().includes(parsed.collection)) return false;
    if (parsed.type === "link" && !isLink) return false;
    if (parsed.type === "note" && isLink) return false;
    let host = "";
    if (isLink) { try { host = new URL(item.text).hostname.replace(/^www\./i, "").toLocaleLowerCase(); } catch {} }
    if (parsed.site && !(host === parsed.site || host.endsWith("." + parsed.site))) return false;
    const savedAt = Number(item.createdAt || item.updatedAt || 0);
    if (filter === "today" && !(savedAt >= startOfToday.getTime() && savedAt < startOfTomorrow.getTime())) return false;
    if (parsed.before !== null && !(savedAt < parsed.before)) return false;
    if (parsed.after !== null && !(savedAt >= parsed.after)) return false;
    const searchable = [item.text, item.previewTitle, item.previewDescription, host, ...(item.tags || []), item.collection || ""].join(" ").toLocaleLowerCase();
    return !parsed.text || searchable.includes(parsed.text);
  }).sort((a,b) => Number(b.pinned)-Number(a.pinned) || b.updatedAt-a.updatedAt);
}
export function normalizeDuplicateKey(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      url.hash = "";
      const removable = /^(utm_.+|fbclid|gclid|dclid|msclkid|mc_cid|mc_eid|ref_src|igshid)$/i;
      for (const key of [...url.searchParams.keys()]) if (removable.test(key)) url.searchParams.delete(key);
      url.searchParams.sort();
      if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, "");
      return url.toString().replace(/\/$/, url.pathname === "/" && !url.search ? "/" : "");
    } catch {}
  }
  return raw.normalize("NFKC").replace(/\s+/g, " ").trim().toLocaleLowerCase();
}

export function findDuplicateCapture(items, value, excludeId = "") {
  const key = normalizeDuplicateKey(value);
  if (!key) return null;
  return (items || []).find(item =>
    item && item.id !== excludeId && !item.trashedAt &&
    normalizeDuplicateKey(item.text) === key
  ) || null;
}

export function makeCapture(text, existing = {}) {
  const now=Date.now();
  return normalizeCapture({
    id:existing.id || `capture-${now}-${Math.random().toString(36).slice(2,8)}`,
    text, createdAt:existing.createdAt || now, updatedAt:now, pinned:existing.pinned || false,
    readLater: Boolean(existing.readLater), archivedAt: Number(existing.archivedAt) || 0, trashedAt: Number(existing.trashedAt) || 0,
    tags: existing.tags || [], collection: existing.collection || "",
    previewTitle: existing.previewTitle || "", previewDescription: existing.previewDescription || "", previewImageUrl: existing.previewImageUrl || ""
  });
}