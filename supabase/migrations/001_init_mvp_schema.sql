-- ============================================================
-- RR Recruitment Hub — MVP schema
-- Uit te voeren op het development Supabase project (Frankfurt)
-- Bevat: organisatiestructuur, kernmodules, indexen en RLS
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- 1. Organisatie en gebruikers
-- Ook bij één gebruiker werken we vanaf dag één met een
-- organisatiestructuur, zodat een tweede gebruiker later
-- zonder migratiepijn toegevoegd kan worden.
-- ------------------------------------------------------------

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

-- Hulpfunctie: geeft true terug als de ingelogde gebruiker lid is
-- van de opgegeven organisatie. Wordt in elke policy hergebruikt.
create or replace function is_org_member(check_org_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from organization_members
    where organization_id = check_org_id
      and user_id = auth.uid()
  );
$$;

-- ------------------------------------------------------------
-- 2. Klanten en contactpersonen
-- ------------------------------------------------------------

create table clients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  kvk_number text,
  sector text,
  region text,
  status text not null default 'prospect' check (status in ('prospect', 'actief', 'inactief')),
  account_owner_id uuid references auth.users(id),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  name text not null,
  role text,
  email text,
  phone text,
  is_primary boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 3. Fee afspraken
-- Percentage ligt doorgaans tussen 18 en 25 procent, staffel
-- is de uitzondering.
-- ------------------------------------------------------------

create table fee_agreements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  type text not null check (type in ('percentage', 'staffel', 'vast_bedrag')),
  percentage numeric(5,2),
  fixed_amount numeric(10,2),
  minimum_fee numeric(10,2),
  valid_from date,
  valid_until date,
  notes text,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 4. Vacatures
-- expected_fee, expected_close_month en success_probability
-- voeden de forecast op het dashboard.
-- ------------------------------------------------------------

create table vacancies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  title text not null,
  function_group text,
  location text,
  salary_min numeric(10,2),
  salary_max numeric(10,2),
  employment_type text,
  status text not null default 'open' check (status in ('open', 'on_hold', 'vervuld', 'geannuleerd')),
  fee_agreement_id uuid references fee_agreements(id),
  expected_fee numeric(10,2),
  expected_close_month date,
  success_probability numeric(5,2) check (success_probability between 0 and 100),
  description text,
  requirements text,
  opened_at date not null default current_date,
  closed_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 5. Kandidaten en sollicitatieprocedures
-- ------------------------------------------------------------

create table candidates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  current_job_title text,
  source text,
  cv_link text,
  status text not null default 'in_proces' check (status in ('in_proces', 'beschikbaar', 'geplaatst', 'niet_beschikbaar')),
  notes text,
  created_at timestamptz not null default now()
);

create table applications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  vacancy_id uuid not null references vacancies(id) on delete cascade,
  candidate_id uuid not null references candidates(id) on delete cascade,
  stage text not null default 'aangemeld' check (stage in (
    'aangemeld', 'voorgesteld', 'gesprek1', 'gesprek2', 'aanbod',
    'geplaatst', 'afgewezen', 'teruggetrokken'
  )),
  stage_updated_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 6. Placements
-- ------------------------------------------------------------

create table placements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  application_id uuid references applications(id),
  client_id uuid not null references clients(id) on delete cascade,
  candidate_id uuid not null references candidates(id),
  vacancy_id uuid not null references vacancies(id),
  start_date date,
  gross_annual_salary numeric(10,2),
  fee_amount numeric(10,2),
  fee_percentage numeric(5,2),
  guarantee_months integer,
  guarantee_end_date date,
  status text not null default 'actief' check (status in ('actief', 'uitval_in_garantie', 'afgerond')),
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 7. Facturen
-- Registratie van wat er in Snelstart Web gebeurt, geen
-- factuurgenerator. Start altijd op concept, pas na handmatige
-- bevestiging op verzonden telt de factuur mee in de omzet.
-- ------------------------------------------------------------

create table invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  placement_id uuid references placements(id),
  invoice_number text,
  entity_name text,
  amount_excl_btw numeric(10,2) not null,
  btw_percentage numeric(4,2) not null default 21,
  amount_incl_btw numeric(10,2) generated always as (
    round(amount_excl_btw * (1 + btw_percentage / 100), 2)
  ) stored,
  status text not null default 'concept' check (status in ('concept', 'verzonden', 'betaald', 'te_laat', 'gecrediteerd')),
  sent_at timestamptz,
  issue_date date,
  due_date date,
  paid_date date,
  notes text,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 8. Indexen op de meest gebruikte foreign keys
-- ------------------------------------------------------------

create index idx_contacts_client_id on contacts(client_id);
create index idx_fee_agreements_client_id on fee_agreements(client_id);
create index idx_vacancies_client_id on vacancies(client_id);
create index idx_applications_vacancy_id on applications(vacancy_id);
create index idx_applications_candidate_id on applications(candidate_id);
create index idx_placements_client_id on placements(client_id);
create index idx_placements_vacancy_id on placements(vacancy_id);
create index idx_invoices_client_id on invoices(client_id);
create index idx_invoices_placement_id on invoices(placement_id);
create index idx_invoices_status on invoices(status);
create index idx_vacancies_expected_close_month on vacancies(expected_close_month);

-- ------------------------------------------------------------
-- 9. updated_at trigger, hergebruikt op clients en vacancies
-- ------------------------------------------------------------

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_clients_updated_at
  before update on clients
  for each row execute function set_updated_at();

create trigger trg_vacancies_updated_at
  before update on vacancies
  for each row execute function set_updated_at();

-- ------------------------------------------------------------
-- 10. Row Level Security
-- Elke tabel is alleen bereikbaar voor leden van de organisatie
-- waar de rij bij hoort. Geen enkele tabel is hiervan uitgezonderd.
-- ------------------------------------------------------------

alter table organizations enable row level security;
alter table organization_members enable row level security;
alter table clients enable row level security;
alter table contacts enable row level security;
alter table fee_agreements enable row level security;
alter table vacancies enable row level security;
alter table candidates enable row level security;
alter table applications enable row level security;
alter table placements enable row level security;
alter table invoices enable row level security;

create policy "leden zien hun organisatie"
  on organizations for select
  using (is_org_member(id));

create policy "leden zien medeleden"
  on organization_members for select
  using (is_org_member(organization_id));

create policy "organisatie toegang clients"
  on clients for all
  using (is_org_member(organization_id))
  with check (is_org_member(organization_id));

create policy "organisatie toegang contacts"
  on contacts for all
  using (is_org_member(organization_id))
  with check (is_org_member(organization_id));

create policy "organisatie toegang fee_agreements"
  on fee_agreements for all
  using (is_org_member(organization_id))
  with check (is_org_member(organization_id));

create policy "organisatie toegang vacancies"
  on vacancies for all
  using (is_org_member(organization_id))
  with check (is_org_member(organization_id));

create policy "organisatie toegang candidates"
  on candidates for all
  using (is_org_member(organization_id))
  with check (is_org_member(organization_id));

create policy "organisatie toegang applications"
  on applications for all
  using (is_org_member(organization_id))
  with check (is_org_member(organization_id));

create policy "organisatie toegang placements"
  on placements for all
  using (is_org_member(organization_id))
  with check (is_org_member(organization_id));

create policy "organisatie toegang invoices"
  on invoices for all
  using (is_org_member(organization_id))
  with check (is_org_member(organization_id));

-- ------------------------------------------------------------
-- 11. Seed voor development
-- Alleen uitvoeren op het development project, nooit op productie.
-- Vervang de user_id door je eigen auth.users id na het aanmaken
-- van je account via Supabase Auth.
-- ------------------------------------------------------------

-- insert into organizations (id, name) values ('00000000-0000-0000-0000-000000000001', 'RR-Recruitment');
-- insert into organization_members (organization_id, user_id, role)
--   values ('00000000-0000-0000-0000-000000000001', '<jouw-auth-user-id>', 'owner');
