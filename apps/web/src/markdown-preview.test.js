import test from "node:test";
import assert from "node:assert/strict";
import { renderMarkdownToHtml } from "./markdown-preview.js";

test("renders headings, emphasis, lists, quotes and horizontal rules", () => {
  const html = renderMarkdownToHtml("# Title\n\nA **bold** and *italic* word.\n\n- One\n- Two\n\n> Quote\n\n---");
  assert.match(html, /<h1>Title<\/h1>/);
  assert.match(html, /<strong>bold<\/strong>/);
  assert.match(html, /<em>italic<\/em>/);
  assert.match(html, /<ul><li>One<\/li><li>Two<\/li><\/ul>/);
  assert.match(html, /<blockquote><p>Quote<\/p><\/blockquote>/);
  assert.match(html, /<hr>/);
});

test("escapes raw HTML instead of executing it", () => {
  const html = renderMarkdownToHtml('<img src=x onerror="alert(1)">\n\n<script>alert(2)</script>');
  assert.match(html, /&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;/);
  assert.match(html, /&lt;script&gt;alert\(2\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<img\b|<script\b/i);
  assert.doesNotMatch(html, /<[^>]*\bonerror=/i);
});

test("only safe HTTP(S) links become anchors", () => {
  const html = renderMarkdownToHtml('[docs](https://example.com/path?a=1&b=2) [bad](javascript:alert(1)) [credentials](https://user:secret@example.com/)');
  assert.match(html, /<a href="https:\/\/example\.com\/path\?a=1&amp;b=2" target="_blank" rel="noopener noreferrer">docs<\/a>/);
  assert.doesNotMatch(html, /href="javascript:/i);
  assert.doesNotMatch(html, /href="https:\/\/user:secret/i);
  assert.match(html, /\[bad\]\(javascript:alert\(1\)\)/);
});

test("fenced code is escaped and checkbox list items stay disabled", () => {
  const html = renderMarkdownToHtml('```html\n<img src=x>\n```\n\n- [x] Done\n- [ ] Later');
  assert.match(html, /<pre><code class="language-html">&lt;img src=x&gt;<\/code><\/pre>/);
  assert.match(html, /<input type="checkbox" disabled checked>/);
  assert.match(html, /<input type="checkbox" disabled>/);
});

test("empty documents render an empty preview without fabricated content", () => {
  assert.equal(renderMarkdownToHtml(""), "");
  assert.equal(renderMarkdownToHtml(null), "");
});
