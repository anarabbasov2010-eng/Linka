import test from "node:test";
import assert from "node:assert/strict";
import { inspectTrashStorage, saveTrash, TRASH_KEY, TRASH_RECOVERY_KEY, MAX_TRASH_ITEMS } from "./trash-store.js";

function memoryStorage() {
  const data = new Map();
  return {
    getItem: key => data.has(key) ? data.get(key) : null,
    setItem: (key, value) => data.set(key, String(value))
  };
}

test("Trash storage round-trips recoverable items", () => {
  const storage = memoryStorage();
  const items = [{ id: "one", text: "Keep this", deletedAt: 123 }];
  assert.equal(inspectTrashStorage(storage).status, "empty");
  assert.equal(saveTrash(items, storage), true);
  assert.deepEqual(inspectTrashStorage(storage).items, items);
  assert.ok(storage.getItem(TRASH_KEY));
});

test("corrupt Trash is preserved and future writes are blocked", () => {
  const storage = memoryStorage();
  storage.setItem(TRASH_KEY, "{broken");
  const inspected = inspectTrashStorage(storage);
  assert.equal(inspected.status, "corrupt");
  assert.equal(inspected.raw, "{broken");
  assert.equal(JSON.parse(storage.getItem(TRASH_RECOVERY_KEY)).raw, "{broken");
  assert.equal(saveTrash([{ id: "new", text: "Do not overwrite recovery" }], storage), false);
  assert.equal(storage.getItem(TRASH_KEY), "{broken");
});

test("Trash refuses more than its limit rather than truncating older items", () => {
  const storage = memoryStorage();
  const items = Array.from({ length: MAX_TRASH_ITEMS + 1 }, (_, index) => ({ id: String(index), text: "item " + index }));
  assert.equal(saveTrash(items, storage), false);
  assert.equal(storage.getItem(TRASH_KEY), null);
});
