# Linka Google sign-in setup (free)

Google OAuth replaces the email-code sign-in as the primary web flow. Supabase remains on the Free plan. Google does not charge for standard OAuth sign-in; configure the provider credentials yourself because the Google client secret must never be committed to this repository or shared in chat.

## 1. Create Google OAuth credentials

1. Open [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials).
2. Create/select a project, configure the OAuth consent screen, and create an **OAuth client ID** for a **Web application**.
3. Add the Supabase callback URL shown in Supabase Authentication → Sign In / Providers → Google. For this project it is normally:
   `https://imppocbirxwlvnfdfbll.supabase.co/auth/v1/callback`
4. Save the OAuth client ID and client secret privately.

## 2. Enable Google in Supabase

1. Open [Linka → Supabase Google provider](https://supabase.com/dashboard/project/imppocbirxwlvnfdfbll/auth/providers).
2. Enable Google and paste the OAuth client ID and client secret from Google Cloud.
3. In Supabase Authentication → URL Configuration, add the deployed Linka website origin to the allowed redirect URLs.
4. For Android deep-link sign-in, add `linka://auth/callback` to allowed redirect URLs. For Windows/Tauri builds, also allow the app's configured Tauri origin if the desktop build uses a distinct origin.
5. Save changes. Keep the client secret only in the Supabase dashboard.

Google sign-in needs the provider configured in the dashboard before the new button can work. The browser app will start OAuth and process the session returned to the allowed redirect.

## 3. Keep data sync and QR login

Google OAuth uses the same Supabase Auth user model as other providers. The existing `linka_sync` table and QR pairing service remain in place. A user who signs in with Google on each device gets the same per-account sync row. Existing email-OTP accounts are not automatically merged with Google accounts just because they share an email; account linking needs to be configured deliberately.

## 4. Optional email-code fallback

Email OTP can remain available as a fallback, but custom SMTP is only required if you want to send one-time email codes. It is not required for Google OAuth itself. If you later enable email OTP, follow the email-template and SMTP setup instructions in the Git history or the Supabase email-template settings; do not put mail passwords in source control.

## Security notes

- Never put the Supabase service-role key or Google OAuth client secret into the web app, Android app, GitHub, or chat.
- Only use the Supabase publishable/anon key in clients.
- Add only the exact redirect URLs required by the deployed web app and native apps.
