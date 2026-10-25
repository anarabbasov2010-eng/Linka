import test from "node:test";
import assert from "node:assert/strict";
import { addDeletedIds, completeGoogleOAuthCallback, excludeDeletedCaptures, getOtpCooldown, mergeCloudCaptures, readDeletedIds, removeDeletedIds, setDeletedIds, readLinkaProfile, saveLinkaProfile, syncCloudCaptures, DELETED_IDS_KEY } from "./cloud-sync.js";

test("cloud sync reports an actionable message when the server rejects an oversized sync payload", async () => {
  const hadStorage = Object.prototype.hasOwnProperty.call(globalThis, "localStorage");
  const previousStorage = globalThis.localStorage;
  const previousFetch = globalThis.fetch;
  const storage = memoryStorage();
  storage.setItem("linka.cloud.config.v1", JSON.stringify({
    url: "https://example.supabase.co",
    key: "public-test-key"
  }));
  storage.setItem("linka.cloud.session.v1", JSON.stringify({
    userId: "user-test",
    email: "test@example.com",
    accessToken: "test-access-token",
    refreshToken: "test-refresh-token",
    expiresAt: Date.now() + 60 * 60 * 1000
  }));
  globalThis.localStorage = storage;
  let requests = 0;
  globalThis.fetch = async (_url, options = {}) => {
    requests += 1;
    if (options.method !== "PATCH" && options.method !== "POST") {
      return new Response(JSON.stringify([{
        data: { captures: [], deletedIds: [] },
        updated_at: "2026-10-25T08:00:00+00:00"
      }]), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
    return new Response(JSON.stringify({ message: "Payload too large" }), {
      status: 413,
      headers: { "Content-Type": "application/json" }
    });
  };
  try {
    await assert.rejects(
      syncCloudCaptures([{ id: "capture-1", text: "A saved thought", createdAt: 1, updatedAt: 1 }], new Set()),
      /payload is too large.*export a backup.*retrying/i
    );
    assert.equal(requests, 2, "the sync should read the revision, attempt one conditional write, and report the server rejection");
  } finally {
    globalThis.fetch = previousFetch;
    if (hadStorage) globalThis.localStorage = previousStorage;
    else delete globalThis.localStorage;
  }
});

test("cloud sync retries a stale write and merges the concurrent device's newer records", async () => {
  const hadStorage = Object.prototype.hasOwnProperty.call(globalThis, "localStorage");
  const previousStorage = globalThis.localStorage;
  const previousFetch = globalThis.fetch;
  const storage = memoryStorage();
  storage.setItem("linka.cloud.config.v1", JSON.stringify({
    url: "https://example.supabase.co",
    key: "public-test-key"
  }));
  storage.setItem("linka.cloud.session.v1", JSON.stringify({
    userId: "user-test",
    email: "test@example.com",
    accessToken: "test-access-token",
    refreshToken: "test-refresh-token",
    expiresAt: Date.now() + 60 * 60 * 1000
  }));
  globalThis.localStorage = storage;

  const firstRevision = "2026-10-25T08:00:00+00:00";
  const secondRevision = "2026-10-25T08:00:01+00:00";
  const remoteBase = { id: "remote-base", text: "Remote base", createdAt: 1, updatedAt: 1 };
  const concurrent = { id: "concurrent", text: "Added on another device", createdAt: 2, updatedAt: 2 };
  let reads = 0;
  let patches = 0;
  let finalPatchBody = null;
  globalThis.fetch = async (url, options = {}) => {
    if (options.method === "PATCH") {
      patches += 1;
      if (patches === 1) {
        return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
      }
      finalPatchBody = JSON.parse(options.body);
      assert.match(String(url), /updated_at=eq\./);
      return new Response(JSON.stringify([{ user_id: "user-test", updated_at: secondRevision }]), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
    if (options.method === "GET" || !options.method) {
      reads += 1;
      const captures = reads === 1 ? [remoteBase] : [remoteBase, concurrent];
      return new Response(JSON.stringify([{
        data: { captures, deletedIds: [] },
        updated_at: reads === 1 ? firstRevision : secondRevision
      }]), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    throw new Error("Unexpected cloud request method: " + options.method);
  };

  try {
    const local = [{ id: "local", text: "Local thought", createdAt: 3, updatedAt: 3 }];
    const result = await syncCloudCaptures(local, new Set(), null);
    assert.equal(reads, 2);
    assert.equal(patches, 2);
    assert.deepEqual(new Set(result.captures.map(item => item.id)), new Set(["local", "remote-base", "concurrent"]));
    assert.deepEqual(new Set(finalPatchBody.data.captures.map(item => item.id)), new Set(["local", "remote-base", "concurrent"]));
    assert.equal(finalPatchBody.data.deletedIds.length, 0);
  } finally {
    globalThis.fetch = previousFetch;
    if (hadStorage) globalThis.localStorage = previousStorage;
    else delete globalThis.localStorage;
  }
});

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
