import test from "node:test";
import assert from "node:assert/strict";
import { getDocumentStats, extractMarkdownOutline } from "./document-insights.js";

test("document statistics count Unicode words and both character modes", () => {
  assert.deepEqual(getDocumentStats("Привет world\nمرحبا!"), {
    words: 3,
    characters: 19,
    charactersWithoutWhitespace: 17,
    readingMinutes: 1
  });
  assert.deepEqual(getDocumentStats(""), {
    words: 0,
    characters: 0,
    charactersWithoutWhitespace: 0,
    readingMinutes: 0
  });
});

test("Markdown outline records heading depth, source line and source offset", () => {
  const source = "Intro\n\n# Start\nText\n### [Linked](https://example.com) section\n## End";
  assert.deepEqual(extractMarkdownOutline(source), [
    { level: 1, title: "Start", line: 2, offset: 7 },
    { level: 3, title: "Linked section", line: 4, offset: 17 },
    { level: 2, title: "End", line: 5, offset: 57 }
  ]);
});

test("outline ignores non-headings and enforces a bounded heading count", () => {
  assert.deepEqual(extractMarkdownOutline("text\n## Valid\n###### Deep\nplain", 1), [
    { level: 2, title: "Valid", line: 1, offset: 5 }
  ]);
  assert.deepEqual(extractMarkdownOutline("nothing here"), []);
});
