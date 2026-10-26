import test from "node:test";
import assert from "node:assert/strict";
import { appendClipboardText, MAX_CAPTURE_TEXT_CHARS } from "./clipboard-capture.js";

test("clipboard text fills an empty capture draft without trimming the source", () => {
  assert.deepEqual(appendClipboardText("", "  keep this text  "), {
    ok: true, reason: "", text: "  keep this text  ", addedChars: 18, truncated: false
  });
});

test("clipboard text appends after existing work without overwriting it", () => {
  assert.deepEqual(appendClipboardText("Existing thought", "Clipboard link"), {
    ok: true, reason: "", text: "Existing thought\nClipboard link", addedChars: 14, truncated: false
  });
});

test("clipboard text respects a final newline and adds no unnecessary blank line", () => {
  assert.equal(appendClipboardText("Existing\n", "Next", 40).text, "Existing\nNext");
  assert.equal(appendClipboardText("", "\nNext", 40).text, "\nNext");
});

test("clipboard append truncates only the incoming value at the configured limit", () => {
  const result = appendClipboardText("abc", "123456", 7);
  assert.deepEqual(result, {
    ok: true, reason: "", text: "abc\n123", addedChars: 3, truncated: true
  });
  assert.equal(result.text.length, 7);
});

test("empty clipboard and a full capture draft are no-ops", () => {
  assert.equal(appendClipboardText("saved", "  ").reason, "empty");
  const full = "x".repeat(MAX_CAPTURE_TEXT_CHARS);
  assert.deepEqual(appendClipboardText(full, "more"), {
    ok: false, reason: "limit", text: full, addedChars: 0, truncated: false
  });
});
