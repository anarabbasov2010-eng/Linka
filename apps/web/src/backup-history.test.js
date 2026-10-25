import test from "node:test";
import assert from "node:assert/strict";
import {
  MAX_BACKUP_SNAPSHOTS,
  MAX_AUTOMATIC_SNAPSHOT_BYTES,
  trimBackupSnapshots,
  isBackupHistoryAvailable,
  saveBackupSnapshot
} from "./backup-history.js";

test("backup history retention keeps only the newest valid snapshots without mutating input", () => {
  const input = [
    { id: "old", createdAt: 10 },
    { id: "newest", createdAt: 40 },
    { id: "bad", createdAt: "invalid" },
    { id: "middle", createdAt: 20 },
    null,
    { id: "other", createdAt: 30 }
  ];
  const before = input.slice();
  assert.deepEqual(trimBackupSnapshots(input, 2).map(item => item.id), ["newest", "other"]);
  assert.deepEqual(input, before);
  assert.equal(MAX_BACKUP_SNAPSHOTS, 5);
  assert.equal(MAX_AUTOMATIC_SNAPSHOT_BYTES, 12 * 1024 * 1024);
});

test("backup history refuses malformed snapshots before touching IndexedDB", async () => {
  await assert.rejects(() => saveBackupSnapshot({ id: "bad", createdAt: 1, backup: { format: "other" } }), /Invalid Linka backup snapshot/);
});


test("backup history capability is false when IndexedDB is not present", async () => {
  assert.equal(await isBackupHistoryAvailable(), false);
});
