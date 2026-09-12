-- ============================================================
-- RR Recruitment Hub — migratie 022
-- App-vergrendeling met Face ID / Touch ID (WebAuthn). Los van de
-- bestaande login + verplichte MFA: dit is een extra "ontgrendel dit
-- scherm"-laag die na een periode van inactiviteit terugkomt, zodat
-- iemand die je ontgrendelde telefoon oppakt niet zomaar in de hub
-- kan kijken.
-- Idempotent. Development Supabase project.
-- ============================================================

create table if not exists webauthn_credentials (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  credential_id text not null unique,
  public_key text not null,
  counter bigint not null default 0,
  device_label text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index if not exists idx_webauthn_credentials_user
  on webauthn_credentials(user_id);

alter table webauthn_credentials enable row level security;

-- Eigen apparaten alleen voor jezelf — geen org-brede policy, dit is
-- persoonlijk aan het account gebonden.
drop policy if exists "eigen webauthn credentials" on webauthn_credentials;
create policy "eigen webauthn credentials"
  on webauthn_credentials for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
