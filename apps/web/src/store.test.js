import test from "node:test";
import assert from "node:assert/strict";
import { loadCaptures, saveCaptures, makeCapture, visibleCaptures, STORAGE_KEY } from "./store.js";

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

test("invalid stored JSON safely returns an empty inbox", () => {
  const storage = memoryStorage();
  storage.setItem(STORAGE_KEY, "{");
  assert.deepEqual(loadCaptures(storage), []);
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
