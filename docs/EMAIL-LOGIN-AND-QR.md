# Email login, QR pairing and shared sync

## Account flow

Linka uses a passwordless email OTP. The client calls `POST /auth/v1/otp` and then `POST /auth/v1/verify`; no password is stored. The client enforces a two-minute resend wait, but the Supabase project's server-side OTP rate limit and expiration are authoritative.

In the Supabase dashboard, configure **Authentication → Email** to:
- set **Email OTP Expiration** to **120 seconds**;
- keep OTP sending rate-limited and use the project's rate-limit settings;
- change the Magic Link template to a clear six-digit code template containing `{{ .Token }}`, never print that token into logs;
- configure a verified custom SMTP sender if the From address should be `mbgkzw@gmail.com`. The app cannot send mail from a Gmail mailbox just by knowing its address, and no Gmail/SMTP password belongs in the repository or client configuration.

The default hosted email sender may enforce low quotas and template restrictions. It is not suitable to assume unlimited delivery on a free plan. See the current [Supabase passwordless email guide](https://supabase.com/docs/guides/auth/auth-email-passwordless) and [rate limits](https://supabase.com/docs/guides/auth/rate-limits).

## Shared data

Run the SQL in `CLOUD-SYNC.md` to provision `public.linka_sync`. Enable RLS and keep the per-user policy. Profile metadata is stored inside that user's sync JSON next to captures and deletion tombstones.

## QR pairing

Run `supabase/migrations/202610230001_linka_login_pairings.sql`, then deploy the Edge Function in `supabase/functions/linka-pairing/index.ts` as `linka-pairing`. Keep JWT verification enabled for the function endpoint; approval requests must include a valid user access token. The function uses Supabase's server-provided `SUPABASE_SERVICE_ROLE_KEY`; it must never be copied into any app.

A QR challenge contains a random 256-bit secret, has a two-minute lifetime and can be claimed once. The SQL table is deliberately not accessible to `anon` or `authenticated`; all reads and state transitions happen in the Edge Function. Deploy the function only after reviewing it in your own Supabase project.

## Release/rollout checklist

1. Create or activate the dedicated Linka Supabase project.
2. Set repository Actions variables `LINKA_SUPABASE_URL` and `LINKA_SUPABASE_PUBLISHABLE_KEY` to the project's public URL/key. Never use a service-role key.
3. Configure Authentication URL settings, a 120-second OTP validity, email template and verified SMTP sender.
4. Apply both database schemas and deploy `linka-pairing`.
5. Verify OTP signup, sign-in after sign-out, cooldown, expiration, account isolation/RLS, QR approve/claim/expiry/replay, and cross-device conflict handling using two real accounts before calling the release production-ready.
6. Export a JSON backup before first sync. Linka's local inbox remains usable offline even when the cloud is unavailable.
