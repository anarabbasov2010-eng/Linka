export const LINKA_DOCUMENT_FORMAT = "linka-document";
export const LINKA_DOCUMENT_VERSION = 1;
export const MAX_LINKA_DOCUMENT_CHARS = 5_000_000;

function safeText(value, limit) {
  return String(value ?? "").replace(/\u0000/g, "").slice(0, limit);
}

export function normalizeLinkaDocument(value, defaults = {}) {
  const now = Date.now();
  return {
    format: LINKA_DOCUMENT_FORMAT,
    version: LINKA_DOCUMENT_VERSION,
    id: safeText(value?.id || defaults.id || ("doc-" + now.toString(36)), 120),
    title: safeText(value?.title || defaults.title || "Новый документ", 180).trim() || "Новый документ",
    text: safeText(value?.text, MAX_LINKA_DOCUMENT_CHARS),
    createdAt: Number.isFinite(Number(value?.createdAt)) ? Number(value.createdAt) : now,
    updatedAt: Number.isFinite(Number(value?.updatedAt)) ? Number(value.updatedAt) : now
  };
}

export function serializeLinkaDocument(value) {
  const document = normalizeLinkaDocument(value);
  return JSON.stringify(document, null, 2) + "\n";
}

export function parseLinkaDocument(raw, fallbackTitle = "Открытый документ") {
  const source = String(raw ?? "");
  if (source.length > MAX_LINKA_DOCUMENT_CHARS + 100_000) {
    throw new Error("Документ слишком большой для открытия в Linka.");
  }
  try {
    const parsed = JSON.parse(source);
    if (Array.isArray(parsed)) {
      throw new Error("Файл не является текстовым документом Linka (.linka).");
    }
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      if (parsed.format === LINKA_DOCUMENT_FORMAT && typeof parsed.text === "string") {
        return normalizeLinkaDocument(parsed, { title: fallbackTitle });
      }
      if (Object.hasOwn(parsed, "format") || Object.hasOwn(parsed, "captures")) {
        throw new Error("Файл не является текстовым документом Linka (.linka).");
      }
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("не является текстовым")) throw error;
  }
  return normalizeLinkaDocument({ title: fallbackTitle, text: source });
}

export function linkaFilename(title) {
  const normalized = String(title || "Документ")
    .normalize("NFKC")
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-")
    .replace(/[. ]+$/g, "")
    .trim()
    .slice(0, 100);
  const name = normalized || "Документ";
  return name.toLowerCase().endsWith(".linka") ? name : name + ".linka";
}
