export const TRASH_KEY = "linka.trash.v1";
export const TRASH_RECOVERY_KEY = "linka.trash.recovery.v1";
export const MAX_TRASH_ITEMS = 1000;

/**
 * Read Trash without confusing an unavailable/corrupt store with an empty one.
 * On corrupt JSON, preserve the exact source before any future write is allowed.
 */
export function inspectTrashStorage(storage = globalThis.localStorage) {
  if (!storage || typeof storage.getItem !== "function") {
    return { status: "unavailable", items: [], raw: null, error: "Local storage is unavailable." };
  }
  let raw;
  try { raw = storage.getItem(TRASH_KEY); }
  catch (error) {
    return { status: "unavailable", items: [], raw: null, error: String(error?.message || error) };
  }
  if (raw == null) return { status: "empty", items: [], raw: null, error: null };
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.some(item => !item || typeof item.id !== "string" || typeof item.text !== "string")) {
      throw new TypeError("Trash data is not a valid item array.");
    }
    return { status: parsed.length ? "ok" : "empty", items: parsed, raw, error: null };
  } catch (error) {
    try {
      if (!storage.getItem(TRASH_RECOVERY_KEY)) {
        storage.setItem(TRASH_RECOVERY_KEY, JSON.stringify({
          format: "linka-trash-recovery",
          version: 1,
          capturedAt: Date.now(),
          reason: String(error?.message || error).slice(0, 240),
          raw
        }));
      }
    } catch {}
    return { status: "corrupt", items: [], raw, error: String(error?.message || error) };
  }
}

/** Refuse to overwrite corrupt data or silently exceed the bounded Trash size. */
export function saveTrash(items, storage = globalThis.localStorage) {
  if (!Array.isArray(items) || items.length > MAX_TRASH_ITEMS || !storage || typeof storage.setItem !== "function") return false;
  const current = inspectTrashStorage(storage);
  if (current.status === "corrupt" || current.status === "unavailable") return false;
  try {
    storage.setItem(TRASH_KEY, JSON.stringify(items));
    const written = storage.getItem(TRASH_KEY);
    return written === JSON.stringify(items);
  } catch {
    return false;
  }
}
