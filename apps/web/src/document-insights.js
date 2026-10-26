/**
 * Small, dependency-free document insights for the local Linka editor.
 * Line numbers and offsets are zero-based so outline entries can select source.
 */
export function getDocumentStats(value) {
  const text = String(value ?? "");
  const words = text.match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu) || [];
  return {
    words: words.length,
    characters: text.length,
    charactersWithoutWhitespace: text.replace(/\s/gu, "").length,
    readingMinutes: words.length ? Math.max(1, Math.ceil(words.length / 200)) : 0
  };
}

export function extractMarkdownOutline(value, maxHeadings = 300) {
  const text = String(value ?? "");
  const lines = text.split("\n");
  const limit = Math.max(0, Math.min(1000, Math.floor(Number(maxHeadings) || 0)));
  const outline = [];
  let offset = 0;
  for (let line = 0; line < lines.length && outline.length < limit; line += 1) {
    const match = lines[line].match(/^ {0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (match) {
      const title = match[2]
        .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
        .replace(/\*\*|__|~~|`/g, "")
        .trim();
      if (title) outline.push({ level: match[1].length, title, line, offset });
    }
    offset += lines[line].length + 1;
  }
  return outline;
}
