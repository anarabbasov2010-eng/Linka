import test from "node:test";
import assert from "node:assert/strict";
import { splitSearchHighlights } from "./search-highlight.js";

test("search highlighting splits literal case-insensitive matches without changing source text", () => {
  assert.deepEqual(splitSearchHighlights("Linka links link", "link"), [
    { text: "Link", highlighted: true },
    { text: "a ", highlighted: false },
    { text: "link", highlighted: true },
    { text: "s ", highlighted: false },
    { text: "link", highlighted: true }
  ]);
});

test("search highlighting treats regex symbols as text and handles no match", () => {
  assert.deepEqual(splitSearchHighlights("price is $5.00 (today)", "$5.00"), [
    { text: "price is ", highlighted: false },
    { text: "$5.00", highlighted: true },
    { text: " (today)", highlighted: false }
  ]);
  assert.deepEqual(splitSearchHighlights("nothing matched", "another"), [
    { text: "nothing matched", highlighted: false }
  ]);
});

test("search highlighting safely handles empty and oversized queries", () => {
  assert.deepEqual(splitSearchHighlights("keep <script>", ""), [
    { text: "keep <script>", highlighted: false }
  ]);
  assert.deepEqual(splitSearchHighlights("keep <script>", "x".repeat(161)), [
    { text: "keep <script>", highlighted: false }
  ]);
});

test("search highlighting caps match count in long text", () => {
  const parts = splitSearchHighlights("x ".repeat(300), "x");
  assert.equal(parts.filter(part => part.highlighted).length, 100);
  assert.equal(parts.map(part => part.text).join(""), "x ".repeat(300));
});

test("search highlighting keeps HTML-looking input as plain text segments", () => {
  assert.deepEqual(splitSearchHighlights("<img> and <img>", "<img>"), [
    { text: "<img>", highlighted: true },
    { text: " and ", highlighted: false },
    { text: "<img>", highlighted: true }
  ]);
});
