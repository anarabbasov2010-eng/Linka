# Linka email OTP fallback setup

Google OAuth is now the primary sign-in flow. For Google provider configuration, follow [GOOGLE-OAUTH-SETUP.md](./GOOGLE-OAUTH-SETUP.md).

If email OTP is later enabled as a fallback, use a sender mailbox and custom SMTP settings. Never put a Gmail password, app password, or provider secret in this repository or in chat. Supabase's default email sender is restricted and is not intended for general public delivery.

