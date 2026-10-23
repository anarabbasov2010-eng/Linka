import test from "node:test";
import assert from "node:assert/strict";
import { getOtpCooldown, mergeCloudCaptures, readLinkaProfile, saveLinkaProfile } from "./cloud-sync.js";

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

function memoryStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); }
  };
}

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
