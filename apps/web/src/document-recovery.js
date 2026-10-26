export const EMERGENCY_DOCUMENT_DRAFT_KEY = "linka.document.emergencyDraft.v1";
export const MAX_EMERGENCY_DOCUMENT_DRAFT_CHARS = 200_000;

function normalizeEmergencyDraft(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const id = typeof value.id === "string" ? value.id.trim() : "";
  if (!id || typeof value.text !== "string" || value.text.length > MAX_EMERGENCY_DOCUMENT_DRAFT_CHARS) return null;
  const updatedAt = Number(value.updatedAt || 0);
  if (!Number.isFinite(updatedAt) || updatedAt <= 0) return null;
  return {
    id,
    title: String(value.title || "").trim().slice(0, 180),
    text: value.text,
    updatedAt,
    savedAt: Number.isFinite(Number(value.savedAt)) && Number(value.savedAt) > 0
      ? Number(value.savedAt)
      : updatedAt
  };
}

export function readEmergencyDocumentDraft(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(EMERGENCY_DOCUMENT_DRAFT_KEY);
    if (!raw) return null;
    return normalizeEmergencyDraft(JSON.parse(raw));
  } catch {
    return null;
  }
}

/**
 * Keep one bounded crash-recovery draft locally. Never overwrite an unreadable
 * recovery payload or a draft belonging to a different document.
 */
export function writeEmergencyDocumentDraft(storage, document, now = Date.now()) {
  if (!storage || typeof storage.getItem !== "function" || typeof storage.setItem !== "function") {
    return { saved: false, reason: "unavailable" };
  }
  const id = typeof document?.id === "string" ? document.id.trim() : "";
  const text = typeof document?.text === "string" ? document.text : null;
  if (!id || text === null) return { saved: false, reason: "invalid" };

  let existing = null;
  try {
    const raw = storage.getItem(EMERGENCY_DOCUMENT_DRAFT_KEY);
    if (raw) {
      try { existing = normalizeEmergencyDraft(JSON.parse(raw)); }
      catch { return { saved: false, reason: "invalid-existing" }; }
      if (!existing) return { saved: false, reason: "invalid-existing" };
      if (existing.id !== id) return { saved: false, reason: "pending-other-draft" };
    }
  } catch {
    return { saved: false, reason: "unavailable" };
  }

  if (text.length > MAX_EMERGENCY_DOCUMENT_DRAFT_CHARS) {
    if (existing?.id === id) {
      try { storage.removeItem?.(EMERGENCY_DOCUMENT_DRAFT_KEY); } catch {}
    }
    return { saved: false, reason: "too-large" };
  }

  const draft = normalizeEmergencyDraft({
    id,
    title: String(document?.title || "").trim().slice(0, 180),
    text,
    updatedAt: Number(document?.updatedAt || now),
    savedAt: now
  });
  if (!draft) return { saved: false, reason: "invalid" };
  try {
    storage.setItem(EMERGENCY_DOCUMENT_DRAFT_KEY, JSON.stringify(draft));
    return { saved: true, draft };
  } catch {
    return { saved: false, reason: "storage-error" };
  }
}

export function clearEmergencyDocumentDraftIfMatches(storage = globalThis.localStorage, document) {
  const pending = readEmergencyDocumentDraft(storage);
  if (!pending || !document || typeof document.id !== "string" || typeof document.text !== "string") return false;
  const title = String(document.title || "").trim().slice(0, 180);
  if (pending.id !== document.id || pending.title !== title || pending.text !== document.text) return false;
  return clearEmergencyDocumentDraft(storage, document.id);
}

export function clearEmergencyDocumentDraft(storage = globalThis.localStorage, expectedDocumentId = "") {
  try {
    const raw = storage?.getItem(EMERGENCY_DOCUMENT_DRAFT_KEY);
    if (!raw) return false;
    if (expectedDocumentId) {
      let parsed;
      try { parsed = JSON.parse(raw); } catch { return false; }
      if (String(parsed?.id || "") !== String(expectedDocumentId)) return false;
    }
    storage.removeItem(EMERGENCY_DOCUMENT_DRAFT_KEY);
    return true;
  } catch {
    return false;
  }
}
