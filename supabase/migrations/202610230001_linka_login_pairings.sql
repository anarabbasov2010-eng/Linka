-- Linka one-time QR login challenges.
-- Challenge rows are readable/writable only through the server-side Edge Function.
create table if not exists public.linka_login_pairings (
  id uuid primary key,
  secret_hash text not null,
  client_hash text not null,
  state text not null default 'pending'
    check (state in ('pending', 'approved', 'claimed')),
  user_id uuid references auth.users(id) on delete cascade,
  refresh_token text,
  email text,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  claimed_at timestamptz
);
create index if not exists linka_login_pairings_expiry_idx
  on public.linka_login_pairings (expires_at);
create index if not exists linka_login_pairings_client_idx
  on public.linka_login_pairings (client_hash, expires_at);
alter table public.linka_login_pairings enable row level security;
revoke all on table public.linka_login_pairings from public, anon, authenticated;
