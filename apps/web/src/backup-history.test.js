import test from "node:test";
import assert from "node:assert/strict";
import {
  MAX_BACKUP_SNAPSHOTS,
  MAX_AUTOMATIC_SNAPSHOT_BYTES,
  trimBackupSnapshots,
  findLatestUsableBackupSnapshot,
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

test("latest recoverable backup skips empty snapshots and prefers newest data", () => {
  const snapshots = [
    { id: "empty-newest", createdAt: 50, captureCount: 0, documentCount: 0 },
    { id: "older-captures", createdAt: 40, captureCount: 12, documentCount: 0 },
    { id: "newer-documents", createdAt: 45, captureCount: 0, documentCount: 2 },
    { id: "invalid-date", createdAt: "invalid", captureCount: 100, documentCount: 0 },
    { createdAt: 60, captureCount: 100, documentCount: 0 }
  ];
  assert.equal(findLatestUsableBackupSnapshot(snapshots)?.id, "newer-documents");
  assert.equal(findLatestUsableBackupSnapshot([{ id: "empty", createdAt: 10, captureCount: 0, documentCount: 0 }]), null);
  assert.equal(findLatestUsableBackupSnapshot(null), null);
});

test("backup history refuses malformed snapshots before touching IndexedDB", async () => {
  await assert.rejects(() => saveBackupSnapshot({ id: "bad", createdAt: 1, backup: { format: "other" } }), /Invalid Linka backup snapshot/);
});


test("backup history capability is false when IndexedDB is not present", async () => {
  assert.equal(await isBackupHistoryAvailable(), false);
});
