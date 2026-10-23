import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const PROJECT_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const admin = createClient(PROJECT_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const authClient = createClient(PROJECT_URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const TTL_MS = 120_000;
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store, max-age=0"
};

function reply(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}
function randomToken(bytes = 32) {
  const raw = crypto.getRandomValues(new Uint8Array(bytes));
  let binary = "";
  for (const value of raw) binary += String.fromCharCode(value);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}
function requestIp(req: Request) {
  return req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") || "unknown";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reply(405, { error: "method_not_allowed" });
  if (!PROJECT_URL || !SERVICE_KEY || !ANON_KEY) return reply(503, { error: "pairing_not_configured" });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return reply(400, { error: "invalid_json" }); }
  const action = String(body.action || "");
  const now = new Date();
  await admin.from("linka_login_pairings").delete().lt("expires_at", now.toISOString());

  if (action === "begin") {
    const clientHash = await sha256(requestIp(req));
    const { data: active } = await admin.from("linka_login_pairings")
      .select("id").eq("client_hash", clientHash).eq("state", "pending")
      .gt("expires_at", now.toISOString()).limit(1);
    if (active?.length) return reply(429, { error: "pairing_rate_limited", message: "Wait until the current QR code expires before creating another." });

    const id = crypto.randomUUID();
    const secret = randomToken();
    const expiresAt = new Date(now.getTime() + TTL_MS).toISOString();
    const { error } = await admin.from("linka_login_pairings").insert({
      id, secret_hash: await sha256(secret), client_hash: clientHash,
      state: "pending", expires_at: expiresAt
    });
    if (error) return reply(500, { error: "pairing_create_failed" });
    return reply(200, { id, secret, expiresAt });
  }

  const id = String(body.id || "");
  const secret = String(body.secret || "");
  if (!/^[0-9a-f-]{36}$/i.test(id) || secret.length < 32 || secret.length > 128) {
    return reply(400, { error: "invalid_pairing_challenge" });
  }
  const { data: challenge, error: readError } = await admin.from("linka_login_pairings")
    .select("id,secret_hash,state,expires_at,user_id,refresh_token,email")
    .eq("id", id).maybeSingle();
  if (readError || !challenge) return reply(404, { error: "pairing_not_found" });
  if (new Date(challenge.expires_at).getTime() <= Date.now()) {
    await admin.from("linka_login_pairings").delete().eq("id", id);
    return reply(410, { error: "pairing_expired" });
  }
  if (!safeEqual(challenge.secret_hash, await sha256(secret))) return reply(403, { error: "pairing_secret_invalid" });

  if (action === "approve") {
    const authorization = req.headers.get("authorization") || "";
    const accessToken = authorization.replace(/^Bearer\s+/i, "");
    if (!accessToken) return reply(401, { error: "sign_in_required" });
    const { data: userData, error: userError } = await authClient.auth.getUser(accessToken);
    const user = userData?.user;
    if (userError || !user?.id || !user.email) return reply(401, { error: "session_invalid" });
    if (challenge.state !== "pending") return reply(409, { error: "pairing_already_used" });
    const refreshToken = String(body.refreshToken || "");
    if (refreshToken.length < 12 || refreshToken.length > 512) return reply(400, { error: "session_invalid" });
    const { data: updated, error } = await admin.from("linka_login_pairings")
      .update({ state: "approved", user_id: user.id, email: user.email, refresh_token: refreshToken })
      .eq("id", id).eq("state", "pending").gt("expires_at", new Date().toISOString())
      .select("id").maybeSingle();
    if (error || !updated) return reply(409, { error: "pairing_already_used" });
    return reply(200, { approved: true, email: user.email });
  }

  if (action === "claim") {
    if (challenge.state === "pending") return reply(202, { pending: true });
    if (challenge.state !== "approved" || !challenge.refresh_token || !challenge.email) {
      return reply(409, { error: "pairing_already_claimed" });
    }
    const { data: claimed, error } = await admin.from("linka_login_pairings")
      .update({ state: "claimed", claimed_at: new Date().toISOString(), refresh_token: null })
      .eq("id", id).eq("state", "approved").gt("expires_at", new Date().toISOString())
      .select("email").maybeSingle();
    if (error || !claimed) return reply(409, { error: "pairing_already_claimed" });
    // Refresh token is returned only to the holder of the 256-bit one-time QR secret.
    return reply(200, { email: challenge.email, refreshToken: challenge.refresh_token });
  }
  return reply(400, { error: "unsupported_action" });
});
