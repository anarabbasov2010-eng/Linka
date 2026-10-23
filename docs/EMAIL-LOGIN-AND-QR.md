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


## Email template for Linka

Paste the complete HTML from [`docs/templates/linka-email-otp.html`](templates/linka-email-otp.html) into **Authentication → Email Templates → Magic Link**. It uses Supabase's `{{ .Token }}` variable to display the six-digit OTP in the center of the email and warns recipients never to share it. Customize the sender name to `Linka`; do not log or expose the OTP in the app or server logs.

The template does not change the OTP's real lifetime. Set **Email OTP Expiration** to `120` seconds in the Supabase Auth configuration. Supabase Auth is the authority for actual expiry and server-side rate limits; the two-minute countdown in Linka is only a client-side guard.

## Configure the Windows in-app updater

Linka's Tauri updater is designed to verify signed update archives before installation; it does not accept unsigned updates.

1. On a trusted local computer, run `cd apps/desktop && npm install && npx tauri signer generate -w ~/.tauri/linka-updater.key`. Keep the private key file backed up offline. Never commit it.
2. Add the **contents** of `linka-updater.key` as GitHub Actions secret `TAURI_SIGNING_PRIVATE_KEY`. If the key has a password, add `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` as another secret.
3. Add the contents of `linka-updater.key.pub` as repository Actions variable `LINKA_UPDATER_PUBLIC_KEY`. This public key is embedded into the application and is not secret.
4. The Windows release workflow detects both values, generates the signed NSIS updater archive, and publishes it with `latest.json`. Without both values, it builds the normal installer and leaves the in-app updater disabled; the application continues to offer the release page instead.

**Do not rotate or lose the private signing key after distributing a build.** An updater signature mismatch is deliberately rejected. The Windows installer continues to support installing over the existing Linka installation while preserving the same app identifier.


## Public environment values per platform

Use the same active Linka Supabase project on all builds:
- **GitHub → Settings → Secrets and variables → Actions → Variables:** add `LINKA_SUPABASE_URL` and `LINKA_SUPABASE_PUBLISHABLE_KEY`. The Windows release workflow injects them into the public webview config; the Android workflow reads these same variable names.
- **Vercel → Linka web project → Settings → Environment Variables:** add the same two variables and redeploy. The Vite build generates `public/linka-config.js` from them; do not add a service-role key to Vercel frontend variables.
- **Supabase:** configure Authentication email OTP and custom SMTP, apply `supabase/migrations/202610230000_linka_sync.sql` and `202610230001_linka_login_pairings.sql`, then deploy `supabase/functions/linka-pairing/index.ts` with the documented JWT setting.

The URL and publishable key are client-visible, so they are not password-equivalent secrets. The **service-role key and SMTP password are secrets** and must only be saved in the appropriate server-side secret settings. Never put them in a `VITE_*` variable, website source, mobile APK or repository.
