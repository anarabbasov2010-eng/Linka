const CONFIG_KEY = "linka.cloud.config.v1";
const SESSION_KEY = "linka.cloud.session.v1";
export const DELETED_IDS_KEY = "linka.deletedIds.v1";
const MAX_CAPTURES = 500;
const MAX_DELETED_IDS = 5000;

function readObject(key, storage = globalThis.localStorage) {
  try {
    const value = storage?.getItem(key);
    const parsed = value ? JSON.parse(value) : null;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch { return null; }
}
function writeObject(key, value, storage = globalThis.localStorage) {
  try { storage?.setItem(key, JSON.stringify(value)); return true; }
  catch { return false; }
}
export function getCloudConfig(storage = globalThis.localStorage) {
  const value = readObject(CONFIG_KEY, storage);
  const defaults = globalThis.LINKA_CONFIG || {};
  return { url: String(value?.url || defaults.projectUrl || "").trim().replace(/\/+$/, ""), key: String(value?.key || defaults.publishableKey || "").trim() };
}
export function saveCloudConfig(url, key, storage = globalThis.localStorage) {
  const normalizedUrl = String(url || "").trim().replace(/\/+$/, "");
  const normalizedKey = String(key || "").trim();
  if (!/^https:\/\//i.test(normalizedUrl)) throw new Error("Use the HTTPS URL for your shared Linka sync project.");
  if (!normalizedKey) throw new Error("Enter the Supabase publishable/anon key.");
  if (!writeObject(CONFIG_KEY, { url: normalizedUrl, key: normalizedKey }, storage)) {
    throw new Error("Cloud settings could not be saved in this browser.");
  }
  return { url: normalizedUrl, key: normalizedKey };
}
export function getCloudSession(storage = globalThis.localStorage) {
  return readObject(SESSION_KEY, storage);
}
function storeSession(session, config, storage = globalThis.localStorage) {
  if (!session?.refresh_token || !session?.access_token || !(session.user?.id || session.userId)) {
    throw new Error("The sync service did not return a complete session.");
  }
  const saved = {
    userId: String(session.user?.id || session.userId),
    email: String(session.user?.email || session.email || ""),
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: Date.now() + Math.max(30, Number(session.expires_in || 3600) - 60) * 1000
  };
  if (!writeObject(SESSION_KEY, saved, storage)) throw new Error("The sync session could not be saved in this browser.");
  return saved;
}
export function disconnectCloud(storage = globalThis.localStorage) {
  try { storage?.removeItem(SESSION_KEY); return true; } catch { return false; }
}
async function readResponse(response) {
  const raw = await response.text();
  let data = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch {}
  if (!response.ok) {
    const detail = data.msg || data.message || data.error_description || data.error || "";
    if (response.status === 401 || response.status === 403) throw new Error("Sign-in failed. Check the email, password and public key.");
    if (response.status === 404 || (response.status === 400 && /linka_sync/i.test(raw))) {
      throw new Error("The Linka sync table is missing. Set up the shared sync database first.");
    }
    throw new Error(String(detail || `Cloud request failed (${response.status}).`).slice(0, 220));
  }
  return data;
}
async function authRequest(config, path, body) {
  const response = await fetch(`${config.url}/auth/v1/${path}`, {
    method: "POST",
    headers: { apikey: config.key, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body)
  });
  return readResponse(response);
}
function requireConfig(url, key) {
  const config = { url: String(url || "").trim().replace(/\/+$/, ""), key: String(key || "").trim() };
  if (!/^https:\/\//i.test(config.url)) throw new Error("Use an HTTPS URL for your shared Linka sync project.");
  if (!config.key) throw new Error("Enter the Supabase publishable/anon key.");
  return config;
}
export async function createCloudAccount({ url, key, email, password }) {
  const config = requireConfig(url, key);
  if (!String(email || "").includes("@")) throw new Error("Enter a valid email address.");
  if (String(password || "").length < 8) throw new Error("Use a password with at least 8 characters.");
  saveCloudConfig(config.url, config.key);
  const result = await authRequest(config, "signup", { email: String(email).trim(), password: String(password) });
  if (!result.access_token || !result.refresh_token) {
    return { verificationRequired: true, message: "Account created. Check your email to confirm it, then sign in.", config };
  }
  const session = storeSession({ ...result, email }, config);
  return { verificationRequired: false, session, config };
}
export async function signInCloud({ url, key, email, password }) {
  const config = requireConfig(url, key);
  if (!String(email || "").includes("@") || !password) throw new Error("Enter your email and password.");
  saveCloudConfig(config.url, config.key);
  const result = await authRequest(config, "token?grant_type=password", { email: String(email).trim(), password: String(password) });
  const session = storeSession({ ...result, email }, config);
  return { session, config };
}
async function currentSession(config, session) {
  if (session?.accessToken && session?.refreshToken && Number(session.expiresAt || 0) > Date.now() + 30_000) return session;
  if (!session?.refreshToken) throw new Error("Sign in to Linka Cloud Sync again.");
  const renewed = await authRequest(config, "token?grant_type=refresh_token", { refresh_token: session.refreshToken });
  return storeSession({
    ...renewed,
    userId: renewed.user?.id || session.userId,
    email: renewed.user?.email || session.email
  }, config);
}
export function readDeletedIds(storage = globalThis.localStorage) {
  try {
    const parsed = JSON.parse(storage?.getItem(DELETED_IDS_KEY) || "[]");
    return new Set(Array.isArray(parsed) ? parsed.filter(x => typeof x === "string" && x) : []);
  } catch { return new Set(); }
}
export function addDeletedId(id, storage = globalThis.localStorage) {
  const deleted = readDeletedIds(storage);
  deleted.add(String(id));
  try { storage?.setItem(DELETED_IDS_KEY, JSON.stringify(Array.from(deleted).slice(-MAX_DELETED_IDS))); } catch {}
}
export function mergeCloudCaptures(localCaptures, remoteCaptures, deletedIds, maxItems = MAX_CAPTURES) {
  const mergedById = new Map();
  for (const item of [...(remoteCaptures || []), ...(localCaptures || [])]) {
    if (!item || typeof item.id !== "string" || !item.id || typeof item.text !== "string" || !item.text.trim()) continue;
    if (deletedIds.has(item.id)) continue;
    const existing = mergedById.get(item.id);
    if (!existing || Number(item.updatedAt || item.createdAt || 0) > Number(existing.updatedAt || existing.createdAt || 0)) {
      mergedById.set(item.id, item);
    }
  }
  return [...mergedById.values()]
    .sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || Number(b.updatedAt || b.createdAt || 0) - Number(a.updatedAt || a.createdAt || 0))
    .slice(0, maxItems);
}
export async function syncCloudCaptures(localCaptures, localDeletedIds = readDeletedIds()) {
  const config = getCloudConfig();
  if (!config.url || !config.key) throw new Error("Set the shared sync project URL and public key in Linka settings.");
  const initial = getCloudSession();
  if (!initial) throw new Error("Sign in to the same Linka account on each device to sync.");
  const session = await currentSession(config, initial);
  const headers = {
    apikey: config.key,
    Authorization: `Bearer ${session.accessToken}`,
    Accept: "application/json"
  };
  const query = new URLSearchParams({ user_id: `eq.${session.userId}`, select: "data" });
  const getResponse = await fetch(`${config.url}/rest/v1/linka_sync?${query}`, { headers });
  const remoteRows = await readResponse(getResponse);
  const remoteData = Array.isArray(remoteRows) ? remoteRows[0]?.data : null;
  const deleted = new Set(localDeletedIds || []);
  if (Array.isArray(remoteData?.deletedIds)) {
    remoteData.deletedIds.filter(id => typeof id === "string" && id).forEach(id => deleted.add(id));
  }
  const merged = mergeCloudCaptures(localCaptures, Array.isArray(remoteData?.captures) ? remoteData.captures : [], deleted);
  const body = {
    user_id: session.userId,
    data: { captures: merged, deletedIds: Array.from(deleted).slice(-MAX_DELETED_IDS) },
    updated_at: new Date().toISOString()
  };
  const upsert = await fetch(`${config.url}/rest/v1/linka_sync?on_conflict=user_id`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(body)
  });
  await readResponse(upsert);
  try { localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(body.data.deletedIds)); } catch {}
  return { captures: merged, deletedIds: deleted, session, message: `Synced ${merged.length} items` };
}
