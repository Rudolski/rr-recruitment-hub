-- ============================================================
-- RR Recruitment Hub — migratie 024
-- Read-only koppeling met SnelStart: de hub leest verkoopfacturen
-- (klant, 100%) en inkoopfacturen (partner-kosten) uit SnelStart en
-- koppelt ze aan de bijbehorende vacature. SnelStart blijft de plek
-- waar facturen daadwerkelijk worden aangemaakt en verstuurd — de hub
-- schrijft hier nooit iets naar terug.
--
-- Volledig additief (geen wijziging aan bestaande tabellen) en met
-- een aan/uit-vlag (snelstart_settings.enabled) zodat de koppeling
-- zonder enig risico voor bestaande data uit te zetten is: staat
-- enabled op false, dan doet de sync niets en werkt de rest van de
-- hub exact zoals voorheen.
-- Idempotent. Development Supabase project.
-- ============================================================

create table if not exists snelstart_settings (
  organization_id uuid primary key references organizations(id) on delete cascade,
  enabled boolean not null default false,
  -- Alleen facturen vanaf deze datum worden gesynchroniseerd, zodat
  -- al handmatig verwerkte facturen (van vóór de koppeling) niet
  -- opnieuw als te koppelen worden voorgesteld.
  sync_since date not null default current_date,
  last_synced_at timestamptz,
  last_sync_error text
);

create table if not exists snelstart_sales_invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  snelstart_id text not null,
  invoice_number text,
  client_name text,
  amount numeric(10,2),
  status text,
  issue_date date,
  paid_date date,
  suggested_vacancy_id uuid references vacancies(id) on delete set null,
  matched_vacancy_id uuid references vacancies(id) on delete set null,
  matched_at timestamptz,
  raw jsonb,
  created_at timestamptz not null default now(),
  unique (organization_id, snelstart_id)
);

create table if not exists snelstart_purchase_invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  snelstart_id text not null,
  invoice_number text,
  relation_name text,
  amount numeric(10,2),
  status text,
  issue_date date,
  paid_date date,
  suggested_vacancy_id uuid references vacancies(id) on delete set null,
  matched_vacancy_id uuid references vacancies(id) on delete set null,
  matched_at timestamptz,
  raw jsonb,
  created_at timestamptz not null default now(),
  unique (organization_id, snelstart_id)
);

create index if not exists idx_snelstart_sales_unmatched
  on snelstart_sales_invoices(organization_id)
  where matched_vacancy_id is null;

create index if not exists idx_snelstart_purchase_unmatched
  on snelstart_purchase_invoices(organization_id)
  where matched_vacancy_id is null;

alter table snelstart_settings enable row level security;
alter table snelstart_sales_invoices enable row level security;
alter table snelstart_purchase_invoices enable row level security;

drop policy if exists "organisatie toegang snelstart_settings" on snelstart_settings;
create policy "organisatie toegang snelstart_settings"
  on snelstart_settings for all
  using (is_org_member(organization_id))
  with check (is_org_member(organization_id));

drop policy if exists "organisatie toegang snelstart_sales_invoices" on snelstart_sales_invoices;
create policy "organisatie toegang snelstart_sales_invoices"
  on snelstart_sales_invoices for all
  using (is_org_member(organization_id))
  with check (is_org_member(organization_id));

drop policy if exists "organisatie toegang snelstart_purchase_invoices" on snelstart_purchase_invoices;
create policy "organisatie toegang snelstart_purchase_invoices"
  on snelstart_purchase_invoices for all
  using (is_org_member(organization_id))
  with check (is_org_member(organization_id));

-- Sinds 30 okt 2026 kent Supabase nieuwe tabellen niet meer automatisch
-- Data API-rechten toe; zonder deze grants is de tabel onbereikbaar
-- via supabase-js/PostgREST, ongeacht de RLS-policy hierboven.
grant select, insert, update, delete on snelstart_settings to authenticated, service_role;
grant select, insert, update, delete on snelstart_sales_invoices to authenticated, service_role;
grant select, insert, update, delete on snelstart_purchase_invoices to authenticated, service_role;
