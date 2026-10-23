import test from "node:test";
import assert from "node:assert/strict";
import { mergeCloudCaptures } from "./cloud-sync.js";

test("cloud merge picks the newest copy, keeps pins, and orders newest first", () => {
  const remote = [
    { id: "same", text: "old", createdAt: 1, updatedAt: 10, pinned: false },
    { id: "remote", text: "remote", createdAt: 2, updatedAt: 40, pinned: false },
  ];
  const local = [
    { id: "same", text: "new", createdAt: 1, updatedAt: 20, pinned: true },
    { id: "local", text: "local", createdAt: 3, updatedAt: 30, pinned: false },
  ];
  const merged = mergeCloudCaptures(local, remote, new Set());
  assert.equal(merged.find(item => item.id === "same").text, "new");
  assert.equal(merged.find(item => item.id === "same").pinned, true);
  assert.deepEqual(merged.map(item => item.id), ["same", "remote", "local"]);
});

test("cloud merge respects deletion tombstones so removed data cannot reappear", () => {
  const remote = [{ id: "deleted", text: "old note", createdAt: 1, updatedAt: 999 }];
  const local = [{ id: "kept", text: "keep me", createdAt: 2, updatedAt: 2 }];
  const merged = mergeCloudCaptures(local, remote, new Set(["deleted"]));
  assert.deepEqual(merged.map(item => item.id), ["kept"]);
});

test("cloud merge ignores malformed records and enforces the shared item limit", () => {
  const items = Array.from({ length: 510 }, (_, index) => ({
    id: String(index), text: "note", createdAt: index + 1, updatedAt: index + 1
  }));
  const merged = mergeCloudCaptures(items.concat([null, { id: "bad", text: "" }]), [], new Set());
  assert.equal(merged.length, 500);
  assert.equal(merged[0].id, "509");
});
