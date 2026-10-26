import test from "node:test";
import assert from "node:assert/strict";
import { rankLibraryResearch } from "./library-research.js";

test("local research ranks title, tag and body matches and returns source excerpts", () => {
  const captures = [
    { id: "a", text: "A long note on cycling safety and protected bike lanes.", previewTitle: "City cycling guide", tags: ["transport"], collection: "Research", createdAt: 1 },
    { id: "b", text: "JavaScript arrays and objects", previewTitle: "Programming", tags: ["code"], createdAt: 20 },
    { id: "c", text: "Cycling safety checklist", previewTitle: "Cycling", tags: ["cycling", "safety"], createdAt: 3 }
  ];
  const results = rankLibraryResearch("cycling safety", captures);
  assert.equal(results[0].id, "c");
  assert.ok(results.some(item => item.id === "a"));
  assert.ok(results[0].snippet.toLocaleLowerCase().includes("cycling"));
  assert.equal(results[0].isLink, false);
  assert.ok(results[0].score > 0);
});

test("local research excludes trash, ignores empty/stopword-only queries and supports a result limit", () => {
  const captures = [
    { id: "live", text: "A note about project planning" },
    { id: "trash", text: "A note about project planning", trashedAt: 123 }
  ];
  assert.deepEqual(rankLibraryResearch("and the for", captures), []);
  assert.deepEqual(rankLibraryResearch("project planning", null), []);
  assert.deepEqual(rankLibraryResearch("project planning", captures).map(item => item.id), ["live"]);
  const many = Array.from({length: 12}, (_, index) => ({ id: String(index), text: "Notes about architecture and project planning" }));
  assert.equal(rankLibraryResearch("project planning", many, 3).length, 3);
});

test("local research handles URL captures and bounds result source text", () => {
  const results = rankLibraryResearch("design system", [{
    id: "link",
    text: "https://example.com/design-system?x=1",
    previewTitle: "Design system documentation",
    previewDescription: "Components, tokens and layout rules"
  }]);
  assert.equal(results.length, 1);
  assert.equal(results[0].isLink, true);
  assert.equal(results[0].title, "Design system documentation");
  assert.ok(results[0].source.startsWith("https://example.com"));
});
