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
