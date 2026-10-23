# Linka email sign-in setup (free)

The Linka Supabase project and its database are already provisioned on the Free plan. These last email-delivery settings must be entered by the project owner in the Supabase Dashboard. Do not put a Gmail password or app password in this repository or in chat.

## 1. Enable Gmail SMTP

1. Secure `mbgkzw@gmail.com` with Google 2-Step Verification.
2. Open [Google App Passwords](https://myaccount.google.com/apppasswords) and create an app password for Linka. If Google does not offer App Passwords, the account may not be eligible or 2-Step Verification may not be fully enabled.
3. Open [Linka → Supabase Authentication → SMTP Settings](https://supabase.com/dashboard/project/imppocbirxwlvnfdfbll/auth/smtp).
4. Enable custom SMTP and use:
   - Sender email: `mbgkzw@gmail.com`
   - Sender name: `Linka`
   - SMTP host: `smtp.gmail.com`
   - SMTP port: `587` (STARTTLS)
   - SMTP username: `mbgkzw@gmail.com`
   - SMTP password: the Google App Password generated above, not the regular Gmail password.
5. Save settings and send a test email if the dashboard offers it.

Gmail SMTP is not a paid service, but Google imposes its own sending limits and policies. Supabase's default email service is restricted to project-team addresses, so custom SMTP is required for ordinary users.

## 2. Set the OTP email template

Open [Linka → Authentication → Email Templates](https://supabase.com/dashboard/project/imppocbirxwlvnfdfbll/auth/templates). Edit the **Magic Link** template (Supabase uses this template for email OTPs). Set the subject to `Your Linka sign-in code` and use this HTML body:

```html
<div style="margin:0;background:#09090b;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#f4f4f5">
  <div style="max-width:440px;margin:0 auto;border:1px solid #27272a;border-radius:20px;padding:28px;background:#111113">
    <div style="font-size:12px;letter-spacing:3px;color:#a1a1aa">LINKA</div>
    <h1 style="font-size:24px;line-height:1.25;margin:24px 0 8px">Your sign-in code</h1>
    <p style="font-size:14px;line-height:1.7;color:#a1a1aa;margin:0">Enter this code in Linka to continue. Never share it with anyone.</p>
    <div style="margin:28px 0;padding:20px 12px;text-align:center;border:1px solid #3f3f46;border-radius:14px;background:#09090b">
      <span style="font-size:34px;letter-spacing:10px;font-weight:700;color:#ffffff">{{ .Token }}</span>
    </div>
    <p style="font-size:13px;line-height:1.7;color:#a1a1aa">This code expires after 2 minutes. If you didn't request it, ignore this email.</p>
    <div style="height:1px;background:#27272a;margin:24px 0"></div>
    <p style="font-size:11px;color:#71717a;margin:0">Linka · Your personal library, across your devices</p>
  </div>
</div>
```

## 3. Set expiry and rate limits

1. Open [Authentication → Providers](https://supabase.com/dashboard/project/imppocbirxwlvnfdfbll/auth/providers), select Email, and set **OTP expiry** to `120` seconds. Keep email confirmations enabled.
2. Open [Authentication → Rate Limits](https://supabase.com/dashboard/project/imppocbirxwlvnfdfbll/auth/rate-limits) and set the email OTP sending interval to at least `120` seconds if the setting is available. The client also enforces a two-minute resend cooldown, but server-side rate limiting is required because client checks can be bypassed.
3. Test account creation and repeat sign-in using an email address you control. Confirm the code arrives, expires, and cannot be reused.

## Project safety

- Use only the publishable key in client applications. Never expose the Supabase service-role key.
- The QR pairing table has row-level security enabled and no client policies; the Edge Function accesses it with the server-side service role.
- Free-tier resources have quotas and availability limits. No paid service is required for this setup, but Gmail/Supabase policies and limits still apply.
