import test from "node:test";
import assert from "node:assert/strict";
import {
  LINKA_BACKUP_FORMAT,
  LINKA_BACKUP_VERSION,
  createLinkaBackup,
  parseLinkaBackup,
  normalizeBackupPreferences,
  normalizeSavedSearches,
  normalizeRecentSearches
} from "./backup-format.js";

test("portable backup round-trips captures, documents, deletion markers and safe preferences", () => {
  const backup = createLinkaBackup({
    exportedAt: "2026-10-25T00:00:00.000Z",
    captures: [{ id: "capture-1", text: "hello" }],
    documents: [{ id: "doc-1", title: "Notes", text: "body" }],
    deletedIds: ["deleted-1", "deleted-1", "", 4],
    preferences: {
      "linka.theme": "light",
      "linka.accent": "violet",
      "linka.language.v1": "az",
      "linka.cloud.session.v1": "must-not-be-exported",
      unknownSetting: "must-not-be-exported"
    },
    savedSearches: [{ name: "Design", query: "tag:design", updatedAt: 7 }],
    recentSearches: ["tag:design", " in:research "]
  });
  assert.equal(backup.format, LINKA_BACKUP_FORMAT);
  assert.equal(backup.version, LINKA_BACKUP_VERSION);
  assert.deepEqual(backup.captures, [{ id: "capture-1", text: "hello" }]);
  assert.deepEqual(backup.documents, [{ id: "doc-1", title: "Notes", text: "body" }]);
  assert.deepEqual(backup.deletedIds, ["deleted-1"]);
  assert.deepEqual(backup.preferences, {
    "linka.theme": "light",
    "linka.accent": "violet",
    "linka.language.v1": "az"
  });
  assert.deepEqual(parseLinkaBackup(backup), backup);
});

test("backup preference import rejects invalid values and private session keys", () => {
  assert.deepEqual(normalizeBackupPreferences({
    "linka.theme": "hacked-value",
    "linka.effects": "atmosphere",
    "linka.reduceMotion": "false",
    "linka.cloud.session.v1": "secret"
  }), {
    "linka.effects": "atmosphere",
    "linka.reduceMotion": "false"
  });
});

test("saved and recent searches are bounded, deduplicated and validated", () => {
  assert.deepEqual(normalizeSavedSearches([
    { name: "  Research  ", query: " in:research ", updatedAt: 4 },
    { name: "Duplicate", query: " in:research ", updatedAt: 5 },
    { name: "", query: "x" },
    null
  ]), [{ name: "Research", query: "in:research", updatedAt: 4 }]);
  assert.deepEqual(normalizeRecentSearches([" tag:design ", "tag:design", "x", 4, "in:research"]), ["tag:design", "in:research"]);
});

test("parser accepts legacy captures-only JSON as a non-bundle and rejects unknown backup versions", () => {
  assert.equal(parseLinkaBackup([{ id: "old", text: "legacy" }]), null);
  assert.throws(() => parseLinkaBackup({ format: LINKA_BACKUP_FORMAT, version: 999, captures: [], documents: [], deletedIds: [] }), /unsupported version/i);
  assert.throws(() => parseLinkaBackup({ format: LINKA_BACKUP_FORMAT, version: 1, captures: [] }), /incomplete or damaged/i);
});
