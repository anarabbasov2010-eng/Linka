const MAX_HIGHLIGHT_MATCHES = 100;
const MAX_HIGHLIGHT_QUERY_LENGTH = 160;

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Split text into literal segments so the UI can highlight matches using text
 * nodes and <mark>, never injecting user content as HTML.
 */
export function splitSearchHighlights(value, query) {
  const text = String(value ?? "");
  const term = String(query ?? "").trim();
  if (!text || !term || term.length > MAX_HIGHLIGHT_QUERY_LENGTH) {
    return [{ text, highlighted: false }];
  }

  let pattern;
  try { pattern = new RegExp(escapeRegExp(term), "giu"); }
  catch { return [{ text, highlighted: false }]; }

  const parts = [];
  let cursor = 0;
  let count = 0;
  for (const match of text.matchAll(pattern)) {
    const start = Number(match.index);
    const matchedText = match[0];
    if (!matchedText || start < cursor) continue;
    if (start > cursor) parts.push({ text: text.slice(cursor, start), highlighted: false });
    parts.push({ text: matchedText, highlighted: true });
    cursor = start + matchedText.length;
    count += 1;
    if (count >= MAX_HIGHLIGHT_MATCHES) break;
  }

  if (count === 0) return [{ text, highlighted: false }];
  if (cursor < text.length) parts.push({ text: text.slice(cursor), highlighted: false });
  return parts;
}
