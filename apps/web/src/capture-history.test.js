import test from "node:test";
import assert from "node:assert/strict";
import {
  MAX_CAPTURE_HISTORY,
  cloneCaptureSnapshot,
  pushCaptureSnapshot,
  reconcileDeletedIds
} from "./capture-history.js";

test("capture snapshots clone nested tag arrays without mutating the source", () => {
  const input = [{ id: "a", text: "hello", tags: ["one"] }];
  const copy = cloneCaptureSnapshot(input);
  copy[0].tags.push("two");
  assert.deepEqual(input[0].tags, ["one"]);
  assert.deepEqual(copy[0].tags, ["one", "two"]);
  assert.equal(MAX_CAPTURE_HISTORY, 30);
});

test("capture undo history stays bounded and keeps newest snapshots", () => {
  const stack = [];
  for (let index = 0; index < 5; index += 1) {
    pushCaptureSnapshot(stack, [{ id: String(index), text: String(index), tags: [] }], 3);
  }
  assert.equal(stack.length, 3);
  assert.deepEqual(stack.map(snapshot => snapshot[0].id), ["2", "3", "4"]);
});

test("undo/redo tombstones track removed and restored records but preserve unrelated markers", () => {
  const current = [{ id: "keep", text: "Keep" }, { id: "remove", text: "Remove" }];
  const target = [{ id: "keep", text: "Keep" }, { id: "restore", text: "Restore" }];
  const result = reconcileDeletedIds(current, target, ["restore", "older-deletion"]);
  assert.deepEqual(new Set(result), new Set(["older-deletion", "remove"]));
  assert.equal(result.includes("restore"), false);
});

test("history tombstone reconciliation tolerates malformed arrays and identifiers", () => {
  assert.deepEqual(reconcileDeletedIds(null, [{ id: "restored" }], ["restored", "legacy"]), ["legacy"]);
  assert.deepEqual(reconcileDeletedIds([{ text: "no id" }], [], []), []);
});
