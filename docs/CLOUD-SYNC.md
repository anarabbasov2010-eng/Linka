# Linka Cloud Sync

Linka is local-first: links and notes are saved on the current device even while offline. Optional Cloud Sync can merge saved items across Linka for Android, Windows and the web when each client is connected to the **same Supabase project and the same Linka account**.

## Free setup

1. Create a Supabase project on a plan that suits your usage. Check current pricing and quotas in your Supabase dashboard before using it for a public service.
2. Open the project's SQL Editor and run the schema shown by **Settings → Linka Cloud Sync → Copy database setup SQL** in the web app, or use the **Set up sync database** action in Android's Cloud Sync screen.
3. Copy the project URL and the **publishable key** (or legacy public anon key) from the Supabase dashboard. Do not use a `service_role` or secret key in Linka.
4. In Linka on each device, enter the same project URL and public key. Create the same email/password account once, confirm the email if Supabase requires it, and sign in with that account on every other device.
5. Make a backup before the first sync. Linka merges captures by ID and most-recent update time; deleted capture IDs are stored as tombstones so old copies should not reappear during a successful sync.

## Database schema

The schema uses Row Level Security (RLS) and ties each database row to the authenticated Supabase user. Only signed-in clients can select, insert, update or delete rows for their own `auth.uid()`. Do not disable RLS and do not grant anonymous access.

```sql
create table if not exists public.linka_sync (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{"captures":[],"deletedIds":[]}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.linka_sync enable row level security;
grant select, insert, update, delete on public.linka_sync to authenticated;
drop policy if exists "linka_sync_own_data" on public.linka_sync;
create policy "linka_sync_own_data"
  on public.linka_sync for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

If the Supabase Data API is configured to restrict exposed tables, confirm `public.linka_sync` is exposed to authenticated requests. RLS must remain enabled.

## Limits and behaviour

- Local saving and manual JSON backup/import work without any cloud project.
- The web client and Windows desktop client share the same web storage and Cloud Sync module.
- Android Cloud Sync uses its own encrypted refresh-token store in Android Keystore; the web/Windows session is stored by the browser/WebView in local storage. They are separate sessions under the same account.
- Items are merged by capture ID and the newest `updatedAt`; deletion tombstones prevent previously deleted copies from being merged back.
- Keep regular JSON backups for important information. Cloud Sync is a convenience feature, not a guaranteed backup or a substitute for a separate export.
- Free service limits and availability can change; check the provider dashboard for current quotas.
