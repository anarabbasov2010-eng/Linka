import test from "node:test";
import assert from "node:assert/strict";
import { addDeletedIds, completeGoogleOAuthCallback, excludeDeletedCaptures, getOtpCooldown, mergeCloudCaptures, readDeletedIds, removeDeletedIds, setDeletedIds, readLinkaProfile, saveLinkaProfile, DELETED_IDS_KEY } from "./cloud-sync.js";

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

test("sync result excludes records deleted while a request was in flight", () => {
  const merged = [
    { id: "keep", text: "keep me" },
    { id: "deleted-local", text: "stale local copy" },
    { id: "deleted-remote", text: "stale remote copy" }
  ];
  const safe = excludeDeletedCaptures(merged, new Set(["deleted-local", "deleted-remote"]));
  assert.deepEqual(safe.map(item => item.id), ["keep"]);
  assert.equal(merged.length, 3, "filtering must not mutate the original merge result");
});

test("deleted-record filtering safely handles malformed input and array tombstones", () => {
  assert.deepEqual(excludeDeletedCaptures(null, ["gone"]), []);
  assert.deepEqual(
    excludeDeletedCaptures([null, {}, { id: "", text: "bad" }, { id: "gone" }, { id: "kept" }], ["gone"]),
    [{ id: "kept" }]
  );
});

test("cloud merge prefers the local copy when update timestamps are equal", () => {
  const local = [{ id: "same", text: "latest local edit", createdAt: 1, updatedAt: 100 }];
  const remote = [{ id: "same", text: "older remote edit", createdAt: 1, updatedAt: 100 }];
  assert.equal(mergeCloudCaptures(local, remote, new Set())[0].text, "latest local edit");
});

test("cloud merge ignores malformed records and never silently truncates the library", () => {
  for (const count of [500, 1000, 5000, 10000]) {
    const items = Array.from({ length: count }, (_, index) => ({
      id: String(index), text: "note", createdAt: index + 1, updatedAt: index + 1
    }));
    const merged = mergeCloudCaptures(items.concat([null, { id: "bad", text: "" }]), [], new Set());
    assert.equal(merged.length, count);
    assert.equal(merged[0].id, String(count - 1));
    assert.equal(mergeCloudCaptures(items, [], new Set(), 500).length, Math.min(count, 500));
  }
});

function memoryStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); }
  };
}

test("backup restore replaces the deletion-marker set atomically without duplicate or malformed IDs", () => {
  const storage = memoryStorage();
  assert.equal(setDeletedIds(["old", "old", "", 4, "remote"], storage), true);
  assert.deepEqual([...readDeletedIds(storage)].sort(), ["old", "remote"]);
  const failing = {
    getItem(key) { return key === DELETED_IDS_KEY ? JSON.stringify(["preserve-me"]) : null; },
    setItem() { throw new Error("quota exceeded"); }
  };
  assert.equal(setDeletedIds(["new"], failing), false);
  assert.deepEqual([...readDeletedIds(failing)], ["preserve-me"]);
});

test("bulk deletion markers are written atomically and can be removed for undo/import", () => {
  const storage = memoryStorage();
  assert.equal(addDeletedIds(["a", "b"], storage), true);
  assert.deepEqual([...readDeletedIds(storage)].sort(), ["a", "b"]);
  assert.equal(removeDeletedIds(["a"], storage), true);
  assert.deepEqual([...readDeletedIds(storage)], ["b"]);
  const failing = {
    getItem(key) { return key === DELETED_IDS_KEY ? JSON.stringify(["kept"]) : null; },
    setItem() { throw new Error("quota exceeded"); }
  };
  assert.equal(addDeletedIds(["c"], failing), false);
  assert.equal(removeDeletedIds(["kept"], failing), false);
  assert.deepEqual([...readDeletedIds(failing)], ["kept"]);
});

test("profile onboarding saves a cleaned display name and optional age", () => {
  const storage = memoryStorage();
  const saved = saveLinkaProfile({ displayName: "  Linka   User  ", age: "16" }, storage);
  assert.equal(saved.displayName, "Linka User");
  assert.equal(saved.age, 16);
  assert.equal(readLinkaProfile(storage).displayName, "Linka User");
  assert.equal(readLinkaProfile(storage).age, 16);
});

test("profile onboarding accepts a nickname without age and rejects empty or invalid values", () => {
  const storage = memoryStorage();
  const saved = saveLinkaProfile({ displayName: "A nickname", age: "" }, storage);
  assert.equal(saved.age, null);
  assert.equal(readLinkaProfile(storage).age, null);
  assert.throws(() => saveLinkaProfile({ displayName: "   " }, storage), /name/i);
  assert.throws(() => saveLinkaProfile({ displayName: "Name", age: 12 }, storage), /Age/i);
  assert.throws(() => saveLinkaProfile({ displayName: "Name", age: 121 }, storage), /Age/i);
});

test("email OTP resend helper honors a per-email two-minute cooldown", () => {
  const storage = memoryStorage();
  const email = "Linka.User@example.com";
  storage.setItem("linka.otp.cooldown.linka.user@example.com", String(Date.now() + 120_000));
  const remaining = getOtpCooldown(email, storage);
  assert.ok(remaining > 0 && remaining <= 120_000);
  storage.setItem("linka.otp.cooldown.linka.user@example.com", String(Date.now() - 1));
  assert.equal(getOtpCooldown(email, storage), 0);
});

test("Google OAuth callback ignores normal routes and reports provider errors", async () => {
  assert.equal(await completeGoogleOAuthCallback({ location: { hash: "", pathname: "/", search: "" } }), null);
  await assert.rejects(
    completeGoogleOAuthCallback({ location: { hash: "#error=access_denied&error_description=Sign-in%20was%20cancelled" } }),
    /Sign-in was cancelled/i
  );
});
