import test from "node:test";
import assert from "node:assert/strict";
import { linkaFilename, normalizeLinkaDocument, parseLinkaDocument, serializeLinkaDocument } from "./linka-format.js";

test("round-trips Linka documents without changing the text", () => {
  const original = { id: "abc", title: "Черновик", text: "Первая строка\nВторая строка", createdAt: 10, updatedAt: 20 };
  const restored = parseLinkaDocument(serializeLinkaDocument(original));
  assert.equal(restored.format, "linka-document");
  assert.equal(restored.title, original.title);
  assert.equal(restored.text, original.text);
  assert.equal(restored.id, original.id);
  assert.equal(restored.updatedAt, original.updatedAt);
});

test("opens plain text as a new Linka document", () => {
  const restored = parseLinkaDocument("hello\nworld", "note.txt");
  assert.equal(restored.title, "note.txt");
  assert.equal(restored.text, "hello\nworld");
});

test("rejects an inbox backup as a standalone document", () => {
  assert.throws(() => parseLinkaDocument(JSON.stringify({ captures: [] })), /не является текстовым/);
});

test("rejects an inbox backup exported as a JSON array", () => {
  assert.throws(() => parseLinkaDocument(JSON.stringify([{ id: "x", text: "capture" }])), /не является текстовым/);
});

test("normalizes unsafe or empty titles and filenames", () => {
  const document = normalizeLinkaDocument({ title: "   ", text: "ok" });
  assert.equal(document.title, "Новый документ");
  assert.equal(linkaFilename('a/b\\c?.linka'), "a-b-c-.linka");
  assert.equal(linkaFilename("Черновик"), "Черновик.linka");
});

test("rejects overly large documents", () => {
  assert.throws(() => parseLinkaDocument("x".repeat(5_100_001)), /слишком большой/);
});
