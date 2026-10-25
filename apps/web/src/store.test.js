import test from "node:test";
import assert from "node:assert/strict";
import { loadCaptures, saveCaptures, makeCapture, visibleCaptures, sortCaptures, normalizeDuplicateKey, findDuplicateCapture, STORAGE_KEY, RECOVERY_KEY, getCaptureRecovery, startFreshCaptureLibrary } from "./store.js";

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

test("invalid stored JSON is preserved and blocks writes until the user chooses recovery", () => {
  const storage = memoryStorage();
  storage.setItem(STORAGE_KEY, "{broken source");
  assert.deepEqual(loadCaptures(storage), []);
  assert.equal(storage.getItem(STORAGE_KEY), "{broken source");
  assert.equal(getCaptureRecovery(storage).raw, "{broken source");
  assert.equal(JSON.parse(storage.getItem(RECOVERY_KEY)).raw, "{broken source");
  assert.equal(saveCaptures([makeCapture("new data")], storage), false);
  assert.equal(storage.getItem(STORAGE_KEY), "{broken source");
  assert.equal(startFreshCaptureLibrary(storage), true);
  assert.deepEqual(loadCaptures(storage), []);
  assert.equal(getCaptureRecovery(storage).acknowledged, true);
  assert.equal(saveCaptures([makeCapture("new data")], storage), true);
  assert.equal(loadCaptures(storage)[0].text, "new data");
});

test("malformed recovery metadata does not prevent recovery of the original capture JSON", () => {
  const storage = memoryStorage();
  storage.setItem(RECOVERY_KEY, "{bad recovery metadata");
  storage.setItem(STORAGE_KEY, "{original capture data");
  assert.deepEqual(loadCaptures(storage), []);
  assert.equal(getCaptureRecovery(storage).raw, "{original capture data");
  assert.equal(JSON.parse(storage.getItem(RECOVERY_KEY)).raw, "{original capture data");
  assert.equal(saveCaptures([makeCapture("replacement")], storage), false);
  assert.equal(startFreshCaptureLibrary(storage), true);
  assert.equal(saveCaptures([makeCapture("replacement")], storage), true);
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


test("local storage does not silently truncate libraries above the former 1000-item cap", () => {
  const storage = memoryStorage();
  const items = Array.from({ length: 5000 }, (_, index) =>
    makeCapture("capture " + index, { id: "capture-" + index, createdAt: index + 1 })
  );
  assert.equal(saveCaptures(items, storage), true);
  assert.equal(loadCaptures(storage).length, 5000);
});

test("capture tags, collections and read-later status persist across storage", () => {
  const storage = memoryStorage();
  const item = makeCapture("Notes about responsive CSS", {
    id: "tagged-note",
    tags: ["#Design", "css", "design", "  frontend  "],
    collection: "Work / UI",
    readLater: true
  });
  assert.deepEqual(item.tags, ["Design", "css", "frontend"]);
  assert.equal(item.collection, "Work / UI");
  assert.equal(item.readLater, true);
  assert.equal(saveCaptures([item], storage), true);
  const loaded = loadCaptures(storage)[0];
  assert.deepEqual(loaded.tags, ["Design", "css", "frontend"]);
  assert.equal(loaded.collection, "Work / UI");
  assert.equal(loaded.readLater, true);
});

test("search supports tags, collections and read-later operators", () => {
  const items = [
    makeCapture("CSS notes", { id: "design", tags: ["Design", "Frontend"], collection: "Research", readLater: true }),
    makeCapture("Plan a hike", { id: "travel", tags: ["Travel"], collection: "Personal", readLater: false })
  ];
  assert.deepEqual(visibleCaptures(items, "all", "tag:design").map(item => item.id), ["design"]);
  assert.deepEqual(visibleCaptures(items, "all", "in:research").map(item => item.id), ["design"]);
  assert.deepEqual(visibleCaptures(items, "all", "is:later").map(item => item.id), ["design"]);
  assert.deepEqual(visibleCaptures(items, "read-later").map(item => item.id), ["design"]);
  assert.deepEqual(visibleCaptures(items, "all", "tag:travel in:personal").map(item => item.id), ["travel"]);
});

test("archive and trash filters keep records recoverable and separate", () => {
  const items = [
    makeCapture("Active note", { id: "active" }),
    makeCapture("Archived note", { id: "archived", archivedAt: 10 }),
    makeCapture("Trashed note", { id: "trashed", trashedAt: 20 })
  ];
  assert.deepEqual(visibleCaptures(items, "all").map(item => item.id), ["active"]);
  assert.deepEqual(visibleCaptures(items, "archive").map(item => item.id), ["archived"]);
  assert.deepEqual(visibleCaptures(items, "trash").map(item => item.id), ["trashed"]);
  assert.deepEqual(visibleCaptures(items, "all", "is:archived").map(item => item.id), ["archived"]);
  assert.deepEqual(visibleCaptures(items, "all", "is:trash").map(item => item.id), ["trashed"]);
  const saved = memoryStorage();
  assert.equal(saveCaptures(items, saved), true);
  assert.deepEqual(loadCaptures(saved).map(item => [item.id, item.archivedAt, item.trashedAt]), [
    ["active", 0, 0], ["archived", 10, 0], ["trashed", 0, 20]
  ]);
});


test("duplicate detection normalizes tracking parameters and whitespace without treating trashed records as duplicates", () => {
  const items = [
    makeCapture("https://example.com/article?utm_source=newsletter&id=7#section", { id: "url" }),
    makeCapture("  A note   with    repeated whitespace ", { id: "note" }),
    makeCapture("https://example.com/article?utm_source=old&id=8", { id: "different" }),
    makeCapture("https://example.com/article?id=7", { id: "trashed", trashedAt: Date.now() })
  ];
  assert.equal(normalizeDuplicateKey("https://EXAMPLE.com/article/?id=7&utm_medium=email"), normalizeDuplicateKey("https://example.com/article?id=7"));
  assert.equal(findDuplicateCapture(items, "https://example.com/article?id=7")?.id, "url");
  assert.equal(findDuplicateCapture(items, "a note with repeated whitespace")?.id, "note");
  assert.equal(findDuplicateCapture(items, "https://example.com/article?id=8")?.id, "different");
  assert.equal(findDuplicateCapture(items, "https://new.example.com") , null);
});

test("Today filter includes only captures created during the current local day", () => {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const today = makeCapture("today", { id: "today", createdAt: start.getTime() + 1000 });
  const yesterday = makeCapture("yesterday", { id: "yesterday", createdAt: start.getTime() - 1000 });
  const archived = makeCapture("archived today", { id: "archived", createdAt: start.getTime() + 2000, archivedAt: Date.now() });
  assert.deepEqual(visibleCaptures([today, yesterday, archived], "today").map(item => item.id), ["today"]);
});


test("library sorting supports activity, creation date, title and domain orders without mutating the source array", () => {
  const items = [
    makeCapture("https://z.example.com/z", { id: "z", createdAt: 20, updatedAt: 50, previewTitle: "Zebra" }),
    makeCapture("Alpha note", { id: "a", createdAt: 10, updatedAt: 60, previewTitle: "Alpha" }),
    makeCapture("https://a.example.com/a", { id: "a-url", createdAt: 30, updatedAt: 40, previewTitle: "A Page" })
  ];
  const originalIds = items.map(item => item.id);
  assert.deepEqual(sortCaptures(items, "updated").map(item => item.id), ["a", "z", "a-url"]);
  assert.deepEqual(sortCaptures(items, "newest").map(item => item.id), ["a-url", "z", "a"]);
  assert.deepEqual(sortCaptures(items, "oldest").map(item => item.id), ["a", "z", "a-url"]);
  assert.deepEqual(sortCaptures(items, "title").map(item => item.id), ["a", "a-url", "z"]);
  assert.deepEqual(sortCaptures(items, "domain").map(item => item.id), ["a-url", "z", "a"]);
  assert.deepEqual(items.map(item => item.id), originalIds);
  assert.deepEqual(sortCaptures(items, "unknown").map(item => item.id), sortCaptures(items, "updated").map(item => item.id));
});
