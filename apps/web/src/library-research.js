const STOP_WORDS = new Set((
  "a an and are as at be been but by can did do for from had has have how i if in into is it its me my of on or our so than that the their them then there these they this to was we were what when where which who why will with you your " +
  "и а но в во на за от до для к ко по из у о об обо как что это эти тот та те он она они мы вы я мне мой моя мои не ни да ли же бы было будут есть был была быть или если при над под между " +
  "və və ya ilə üçün bu bir mən sən o da də olan olanlar necə nə niyə hansı harada zaman ki onların onların biz sizdir bu the ve veya için bir ben sen o da de olan nasil ne neden hangi nerede zaman ki onlar biz siz"
).split(/\s+/u));

function tokenize(value) {
  return (String(value ?? "").normalize("NFKC").toLocaleLowerCase().match(/[\p{L}\p{N}]{2,}/gu) || [])
    .filter(token => !STOP_WORDS.has(token));
}

function normalizedField(value, maxLength = 50000) {
  return String(value ?? "").normalize("NFKC").toLocaleLowerCase().slice(0, maxLength);
}

function makeExcerpt(text, terms, maxLength = 240) {
  const source = String(text ?? "").replace(/\s+/gu, " ").trim();
  if (source.length <= maxLength) return source;
  const lower = source.toLocaleLowerCase();
  const positions = terms.map(term => lower.indexOf(term)).filter(index => index >= 0);
  const first = positions.length ? Math.min(...positions) : 0;
  const start = Math.max(0, Math.min(first - Math.floor(maxLength / 3), source.length - maxLength));
  return (start > 0 ? "…" : "") + source.slice(start, start + maxLength).trim() + (start + maxLength < source.length ? "…" : "");
}

/**
 * Rank saved captures locally and return transparent result cards with excerpts.
 * This is lexical retrieval, not an AI-generated answer or a semantic embedding.
 */
export function rankLibraryResearch(question, captures, maxResults = 8) {
  const query = String(question ?? "").trim();
  const terms = [...new Set(tokenize(query))].slice(0, 12);
  if (!terms.length || !Array.isArray(captures)) return [];
  const limit = Math.max(1, Math.min(20, Math.floor(Number(maxResults) || 8)));
  const phrase = normalizedField(query, 240);
  const results = [];

  for (const item of captures.slice(0, 20000)) {
    if (!item || typeof item.id !== "string" || !item.id || typeof item.text !== "string" || item.trashedAt) continue;
    const title = String(item.previewTitle || item.text.split(/\r?\n/u)[0] || "Saved capture").trim().slice(0, 180);
    const description = String(item.previewDescription || "").slice(0, 1000);
    const text = item.text.slice(0, 50000);
    const titleLower = normalizedField(title, 1000);
    const descriptionLower = normalizedField(description, 1500);
    const bodyLower = normalizedField(text, 50000);
    const tagStrings = Array.isArray(item.tags) ? item.tags.map(tag => String(tag)) : [];
    const tagsLower = normalizedField(tagStrings.join(" "), 1000);
    const collection = String(item.collection || "");
    const collectionLower = normalizedField(collection, 300);
    let score = 0;
    let matched = 0;

    for (const term of terms) {
      let termScore = 0;
      if (titleLower.includes(term)) termScore += 3.4;
      if (descriptionLower.includes(term)) termScore += 2.1;
      if (tagsLower.includes(term)) termScore += 2.8;
      if (collectionLower.includes(term)) termScore += 1.7;
      if (bodyLower.includes(term)) termScore += 1;
      if (termScore > 0) {
        matched += 1;
        score += termScore;
      }
    }

    if (phrase.length >= 5 && bodyLower.includes(phrase)) score += 3.5;
    if (phrase.length >= 5 && titleLower.includes(phrase)) score += 4;
    if (!matched || score <= 0) continue;
    score *= 0.75 + (matched / terms.length) * 0.75;
    if (item.archivedAt) score *= 0.9;

    const excerptTerms = terms.filter(term => bodyLower.includes(term));
    const excerptSource = excerptTerms.length ? text : (description || title);
    const snippet = makeExcerpt(excerptSource, excerptTerms, 240);
    results.push({
      id: item.id,
      score: Math.round(score * 100) / 100,
      title,
      snippet,
      source: String(item.text).slice(0, 2000),
      collection,
      tags: tagStrings.slice(0, 24),
      createdAt: Number(item.createdAt || item.updatedAt || 0),
      archivedAt: Number(item.archivedAt || 0),
      isLink: /^https?:\/\//iu.test(String(item.text).trim())
    });
  }

  return results.sort((a, b) => b.score - a.score || b.createdAt - a.createdAt || a.title.localeCompare(b.title))
    .slice(0, limit);
}
