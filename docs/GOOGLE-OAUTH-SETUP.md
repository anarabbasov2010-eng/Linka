# Linka Google sign-in setup (free)

Google OAuth is the primary account sign-in for Linka Web and the Windows desktop app. The Supabase project remains on the Free plan. Standard Google sign-in does not need SMS or a mail sender. Provider credentials must be entered in the Supabase dashboard and must never be committed to GitHub.

## 1. Create Google OAuth credentials

1. Open [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials).
2. Create or select a project and configure the OAuth consent screen.
3. Create an OAuth client ID of type **Web application**.
4. In **Authorized redirect URIs**, add this exact Supabase callback:
   `https://imppocbirxwlvnfdfbll.supabase.co/auth/v1/callback`
5. Save the client ID and client secret. Do not paste either into chat or the repository.

## 2. Enable Google in Supabase

1. Open [Linka → Authentication → Sign In / Providers](https://supabase.com/dashboard/project/imppocbirxwlvnfdfbll/auth/providers).
2. Enable **Google** and paste the OAuth client ID and client secret from Google Cloud.
3. Open [Authentication → URL Configuration](https://supabase.com/dashboard/project/imppocbirxwlvnfdfbll/auth/url-configuration) and add the exact redirect URLs:
   - Your deployed Linka website origin, such as `https://your-linka-site.example` (replace with the actual domain).
   - `linka://auth/callback` for Windows desktop deep-link sign-in.
   - The exact Tauri origin used by the Windows build if it differs from the web origin.
4. Save.

The Google Cloud **authorized redirect URI** is the Supabase callback in step 1. The website and Windows desktop deep link are **Supabase allowed redirect URLs**; these are different settings.

## 3. Test sign-in

1. Open Linka Web or the Windows desktop app.
2. Select **Continue with Google**.
3. Choose a Google account and approve the consent screen.
4. On first sign-in, finish the Linka profile. Name is required; age is optional.
5. Sign in with the same Google account on other devices to use the same cloud sync account.

## 4. Existing email accounts

Supabase does not automatically merge an existing email-OTP account with a Google identity just because the email addresses match. If you already created a Linka account with email OTP, do not assume its cloud data will appear under Google until identity linking is deliberately configured or the same account is otherwise linked.

## Security

- Never put the Google client secret or Supabase service-role key into client code, Windows/Web client code, GitHub, or chat.
- The Supabase publishable key is the only Supabase key that belongs in client apps.
- Use exact redirect URLs; avoid wildcard redirects.
- SMTP configuration is not required for Google OAuth. It is only needed if email OTP is retained as an alternative sign-in method.
