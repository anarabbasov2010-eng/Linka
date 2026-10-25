export const LINKA_BACKUP_FORMAT = "linka-backup";
export const LINKA_BACKUP_VERSION = 1;

const PREFERENCE_VALUES = {
  "linka.theme": new Set(["forest", "dark", "light", "system", "oled"]),
  "linka.accent": new Set(["forest", "violet", "blue", "mint", "rose"]),
  "linka.density": new Set(["compact", "standard", "spacious"]),
  "linka.effects": new Set(["quiet", "balanced", "atmosphere"]),
  "linka.language.v1": new Set(["en", "ru", "az", "tr"]),
  "linka.reduceMotion": new Set(["true", "false"]),
  "linka.sortOrder.v1": new Set(["updated", "newest", "oldest", "title", "domain"])
};

export function normalizeBackupPreferences(value) {
  const input = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const preferences = {};
  for (const [key, allowed] of Object.entries(PREFERENCE_VALUES)) {
    if (typeof input[key] === "string" && allowed.has(input[key])) preferences[key] = input[key];
  }
  return preferences;
}

export function normalizeSavedSearches(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const result = [];
  for (const item of value) {
    if (!item || typeof item.name !== "string" || typeof item.query !== "string") continue;
    const name = item.name.trim().slice(0, 48);
    const query = item.query.trim().slice(0, 256);
    if (!name || !query || seen.has(query)) continue;
    seen.add(query);
    result.push({ name, query, updatedAt: Math.max(0, Number(item.updatedAt) || 0) });
    if (result.length === 15) break;
  }
  return result;
}

export function normalizeRecentSearches(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const result = [];
  for (const raw of value) {
    if (typeof raw !== "string") continue;
    const query = raw.trim().slice(0, 256);
    if (query.length < 2 || seen.has(query)) continue;
    seen.add(query);
    result.push(query);
    if (result.length === 10) break;
  }
  return result;
}

export function createLinkaBackup({
  captures = [],
  documents = [],
  deletedIds = [],
  preferences = {},
  savedSearches = [],
  recentSearches = [],
  exportedAt = new Date().toISOString()
} = {}) {
  if (!Array.isArray(captures) || !Array.isArray(documents) || !Array.isArray(deletedIds)) {
    throw new TypeError("A Linka backup requires captures, documents and deletedIds arrays.");
  }
  return {
    format: LINKA_BACKUP_FORMAT,
    version: LINKA_BACKUP_VERSION,
    exportedAt: String(exportedAt),
    captures,
    documents,
    deletedIds: [...new Set(deletedIds.filter(id => typeof id === "string" && id).map(id => id.slice(0, 200)))],
    preferences: normalizeBackupPreferences(preferences),
    savedSearches: normalizeSavedSearches(savedSearches),
    recentSearches: normalizeRecentSearches(recentSearches)
  };
}

/** Returns null for a legacy captures-only JSON file. */
export function parseLinkaBackup(value) {
  if (!value || typeof value !== "object" || Array.isArray(value) || value.format !== LINKA_BACKUP_FORMAT) return null;
  if (value.version !== LINKA_BACKUP_VERSION) {
    throw new Error("This Linka backup uses an unsupported version. Update Linka before importing it.");
  }
  if (!Array.isArray(value.captures) || !Array.isArray(value.documents) || !Array.isArray(value.deletedIds)) {
    throw new Error("The Linka backup is incomplete or damaged.");
  }
  return createLinkaBackup(value);
}
