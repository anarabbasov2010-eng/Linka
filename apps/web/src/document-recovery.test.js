import test from "node:test";
import assert from "node:assert/strict";
import {
  EMERGENCY_DOCUMENT_DRAFT_KEY,
  MAX_EMERGENCY_DOCUMENT_DRAFT_CHARS,
  readEmergencyDocumentDraft,
  writeEmergencyDocumentDraft,
  clearEmergencyDocumentDraft,
  clearEmergencyDocumentDraftIfMatches
} from "./document-recovery.js";

function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: key => data.has(key) ? data.get(key) : null,
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: key => data.delete(key)
  };
}

test("emergency draft round-trips document identity, title and exact text", () => {
  const storage = memoryStorage();
  const result = writeEmergencyDocumentDraft(storage, {
    id: "doc-1", title: "Recovered note", text: "  line one\nline two  ", updatedAt: 100
  }, 200);
  assert.equal(result.saved, true);
  assert.deepEqual(readEmergencyDocumentDraft(storage), {
    id: "doc-1", title: "Recovered note", text: "  line one\nline two  ", updatedAt: 100, savedAt: 200
  });
});

test("emergency draft will not overwrite a different pending document", () => {
  const storage = memoryStorage();
  writeEmergencyDocumentDraft(storage, { id: "doc-a", title: "A", text: "unsaved A", updatedAt: 1 }, 2);
  const result = writeEmergencyDocumentDraft(storage, { id: "doc-b", title: "B", text: "unsaved B", updatedAt: 3 }, 4);
  assert.equal(result.reason, "pending-other-draft");
  assert.equal(readEmergencyDocumentDraft(storage)?.id, "doc-a");
  assert.equal(readEmergencyDocumentDraft(storage)?.text, "unsaved A");
});

test("emergency draft has a strict size bound and removes stale same-document text", () => {
  const storage = memoryStorage();
  writeEmergencyDocumentDraft(storage, { id: "doc-1", title: "Draft", text: "small", updatedAt: 1 }, 2);
  const result = writeEmergencyDocumentDraft(storage, {
    id: "doc-1", title: "Draft", text: "x".repeat(MAX_EMERGENCY_DOCUMENT_DRAFT_CHARS + 1), updatedAt: 3
  }, 4);
  assert.equal(result.reason, "too-large");
  assert.equal(readEmergencyDocumentDraft(storage), null);
  assert.equal(storage.getItem(EMERGENCY_DOCUMENT_DRAFT_KEY), null);
});

test("clearing a recovery draft requires a matching document id when specified", () => {
  const storage = memoryStorage();
  writeEmergencyDocumentDraft(storage, { id: "doc-1", title: "Draft", text: "keep", updatedAt: 1 }, 2);
  assert.equal(clearEmergencyDocumentDraft(storage, "doc-2"), false);
  assert.equal(readEmergencyDocumentDraft(storage)?.text, "keep");
  assert.equal(clearEmergencyDocumentDraft(storage, "doc-1"), true);
  assert.equal(readEmergencyDocumentDraft(storage), null);
});

test("emergency draft clears only after the matching text has actually been saved", () => {
  const storage = memoryStorage();
  writeEmergencyDocumentDraft(storage, { id: "doc-1", title: "Draft", text: "unsaved text", updatedAt: 1 }, 2);
  assert.equal(clearEmergencyDocumentDraftIfMatches(storage, { id: "doc-1", title: "Draft", text: "saved old text" }), false);
  assert.equal(readEmergencyDocumentDraft(storage)?.text, "unsaved text");
  assert.equal(clearEmergencyDocumentDraftIfMatches(storage, { id: "doc-2", title: "Draft", text: "unsaved text" }), false);
  assert.equal(readEmergencyDocumentDraft(storage)?.id, "doc-1");
  assert.equal(clearEmergencyDocumentDraftIfMatches(storage, { id: "doc-1", title: "Draft", text: "unsaved text" }), true);
  assert.equal(readEmergencyDocumentDraft(storage), null);
});

test("malformed existing recovery payload is preserved rather than overwritten", () => {
  const storage = memoryStorage({ [EMERGENCY_DOCUMENT_DRAFT_KEY]: "{broken" });
  assert.equal(readEmergencyDocumentDraft(storage), null);
  const result = writeEmergencyDocumentDraft(storage, { id: "doc-1", title: "New", text: "new text", updatedAt: 1 }, 2);
  assert.equal(result.reason, "invalid-existing");
  assert.equal(storage.getItem(EMERGENCY_DOCUMENT_DRAFT_KEY), "{broken");
});
