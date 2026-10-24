import test from "node:test";
import assert from "node:assert/strict";
import { loadCaptures, saveCaptures, makeCapture, visibleCaptures, STORAGE_KEY, inspectCaptureStorage, getCaptureRecoveryData, canonicalizeCaptureUrl, splitCaptureBatch } from "./store.js";

function memoryStorage() {
  const data = new Map();
  return {
    getItem: key => data.has(key) ? data.get(key) : null,
    setItem: (key, value) => data.set(key, String(value)),
  };
}

test("saving and loading captures keeps normalized text", () => {
  const storage = memoryStorage();
  const item = makeCapture("  https://example.com  ");
  assert.equal(saveCaptures([item], storage), true);
  assert.equal(loadCaptures(storage)[0].text, "https://example.com");
  assert.ok(storage.getItem(STORAGE_KEY));
});

test("invalid stored JSON is preserved for recovery and blocks accidental overwrites", () => {
  const storage = memoryStorage();
  storage.setItem(STORAGE_KEY, "{");
  assert.deepEqual(loadCaptures(storage), []);
  assert.equal(inspectCaptureStorage(storage).status, "corrupt");
  assert.equal(getCaptureRecoveryData(storage).raw, "{");
  assert.equal(storage.getItem(STORAGE_KEY), "{");
  assert.equal(saveCaptures([makeCapture("new")], storage), false);
  assert.equal(storage.getItem(STORAGE_KEY), "{");
  assert.equal(saveCaptures([makeCapture("restored")], storage, { allowReplaceCorrupt: true }), true);
  assert.equal(loadCaptures(storage)[0].text, "restored");
});

test("filters links, notes, pinned items and search query", () => {
  const items = [
    makeCapture("https://example.com"),
    makeCapture("Read about the new road plan"),
    makeCapture("Pinned thought"),
  ];
  items[2].pinned = true;
  assert.equal(visibleCaptures(items, "links").length, 1);
  assert.equal(visibleCaptures(items, "notes", "road").length, 1);
  assert.equal(visibleCaptures(items, "pinned").length, 1);
});

test("sorting supports oldest, title, domain, and longest-text views", () => {
  const items = [
    { id: "z", text: "A much longer note than the others", createdAt: 30, updatedAt: 30, previewTitle: "Zebra" },
    { id: "b", text: "https://z-example.com/page", createdAt: 10, updatedAt: 10, previewTitle: "Beta" },
    { id: "a", text: "https://a-example.com/page", createdAt: 20, updatedAt: 20, previewTitle: "Apple" }
  ];
  assert.deepEqual(visibleCaptures(items, "all", "", "oldest").map(item => item.id), ["b", "a", "z"]);
  assert.deepEqual(visibleCaptures(items, "all", "", "title").map(item => item.id), ["a", "b", "z"]);
  assert.deepEqual(visibleCaptures(items, "all", "", "domain").map(item => item.id), ["z", "a", "b"]);
  assert.equal(visibleCaptures(items, "all", "", "longest")[0].id, "z");
});

test("search finds cached page titles, descriptions and host names", () => {
  const items = [
    { id: "site", text: "https://example.com/articles", createdAt: 1, updatedAt: 1, previewTitle: "City cycling guide", previewDescription: "Safe routes around town" },
    { id: "note", text: "Remember to buy milk", createdAt: 2, updatedAt: 2 }
  ];
  assert.deepEqual(visibleCaptures(items, "all", "cycling").map(item => item.id), ["site"]);
  assert.deepEqual(visibleCaptures(items, "all", "example.com").map(item => item.id), ["site"]);
  assert.deepEqual(visibleCaptures(items, "all", "safe routes").map(item => item.id), ["site"]);
});


test("search supports type, pinned, site and date operators", () => {
  const items = [
    { id: "a", text: "https://docs.example.com/guide", createdAt: Date.parse("2026-01-02T10:00:00"), updatedAt: 3, pinned: true, previewTitle: "Guide" },
    { id: "b", text: "https://other.test/page", createdAt: Date.parse("2026-02-15T10:00:00"), updatedAt: 2, pinned: false },
    { id: "c", text: "Read the guide", createdAt: Date.parse("2026-03-20T10:00:00"), updatedAt: 1, pinned: true },
  ];
  assert.deepEqual(visibleCaptures(items, "all", "type:link").map(item => item.id), ["a", "b"]);
  assert.deepEqual(visibleCaptures(items, "all", "type:note is:pinned").map(item => item.id), ["c"]);
  assert.deepEqual(visibleCaptures(items, "all", "site:example.com").map(item => item.id), ["a"]);
  assert.deepEqual(visibleCaptures(items, "all", "before:2026-02-01").map(item => item.id), ["a"]);
  assert.deepEqual(visibleCaptures(items, "all", "after:2026-02-01").map(item => item.id), ["c", "b"]);
  assert.deepEqual(visibleCaptures(items, "all", 'type:link "Guide"').map(item => item.id), ["a"]);
});


test("local storage round-trips 500, 1000, 5000, and 10000 captures without truncation", () => {
  for (const count of [500, 1000, 5000, 10000]) {
    const storage = memoryStorage();
    const items = Array.from({ length: count }, (_, index) => makeCapture("note " + index));
    assert.equal(saveCaptures(items, storage), true);
    assert.equal(loadCaptures(storage).length, count);
  }
});

test("normalization does not silently truncate long capture text", () => {
  const storage = memoryStorage();
  const longText = "x".repeat(120_000);
  assert.equal(saveCaptures([makeCapture(longText)], storage), true);
  assert.equal(loadCaptures(storage)[0].text.length, 120_000);
});

test("search supports tags, status, archive scope, and today's activity", () => {
  const items = [
    { id: "tagged", text: "Design notes", createdAt: 2, updatedAt: 2, tags: ["design-system"], status: "important" },
    { id: "archived", text: "Old research", createdAt: 1, updatedAt: 1, archived: true, tags: ["research"] }
  ];
  assert.deepEqual(visibleCaptures(items, "all", "tag:design-system is:important").map(item => item.id), ["tagged"]);
  assert.deepEqual(visibleCaptures(items, "all", "in:archive tag:research").map(item => item.id), ["archived"]);
  const now = new Date();
  const today = { id: "today", text: "Changed today", createdAt: 1, updatedAt: Date.now() };
  const yesterdayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 12);
  const yesterday = { id: "yesterday", text: "Changed yesterday", createdAt: 1, updatedAt: yesterdayDate.getTime() };
  assert.deepEqual(visibleCaptures([today, yesterday], "today").map(item => item.id), ["today"]);
  assert.deepEqual(visibleCaptures([today, yesterday], "all", "is:today").map(item => item.id), ["today"]);
});


test("duplicate URL comparison ignores tracking parameters without rewriting stored URLs", () => {
  assert.equal(
    canonicalizeCaptureUrl("https://example.com/article?utm_source=newsletter&id=42#top"),
    canonicalizeCaptureUrl("https://example.com/article?id=42")
  );
  assert.equal(canonicalizeCaptureUrl("not a URL"), "");
});

test("multi-link paste is split only when every non-empty line is an HTTP URL", () => {
  assert.deepEqual(splitCaptureBatch("https://example.com/a\n\nhttps://example.com/b"), [
    "https://example.com/a", "https://example.com/b"
  ]);
  assert.equal(splitCaptureBatch("A thought\nhttps://example.com"), null);
  assert.equal(splitCaptureBatch("https://example.com"), null);
});
