-- ============================================================
-- RR Recruitment Hub — migratie 011
-- Vacature-radar: dagelijks de carrièrepagina's van klanten en
-- concurrenten aftasten en nieuw gevonden vacatures bewaren.
--  * watch_sources   : één rij per te volgen website
--  * watch_vacancies : gevonden vacatures, met first_seen_at (wanneer
--                      wij 'm zagen) en closed_at (van de site af)
-- Idempotent. Development Supabase project.
-- ============================================================

create table if not exists watch_sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  kind text not null check (kind in ('klant', 'concurrent', 'prospect')),
  client_id uuid references clients(id) on delete set null,
  name text not null,
  fetch_url text not null,
  mode text not null default 'html' check (mode in ('html', 'sitemap')),
  -- html: regexfragment voor vacature-links (leeg = ingebouwde standaard)
  link_pattern text,
  -- sitemap: alleen <loc>'s die dit fragment bevatten tellen mee
  path_filter text,
  -- html: hoeveel vervolgpagina's (?page=2 ..) meepakken
  max_pages int not null default 1,
  active boolean not null default true,
  last_scan_at timestamptz,
  last_scan_status text check (last_scan_status in ('ok', 'error')),
  last_scan_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_watch_sources_org
  on watch_sources(organization_id, kind, active);

create trigger trg_watch_sources_updated_at
  before update on watch_sources
  for each row execute function set_updated_at();

create table if not exists watch_vacancies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  source_id uuid not null references watch_sources(id) on delete cascade,
  url text not null,
  -- stabiele sleutel uit de url (id-segment); valt terug op de url zelf
  external_key text not null,
  title text not null,
  location text,
  posted_on date,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  closed_at timestamptz,
  raw jsonb,
  unique (source_id, external_key)
);

create index if not exists idx_watch_vacancies_source
  on watch_vacancies(source_id, first_seen_at desc);
create index if not exists idx_watch_vacancies_open
  on watch_vacancies(organization_id, first_seen_at desc)
  where closed_at is null;

alter table watch_sources enable row level security;
alter table watch_vacancies enable row level security;

drop policy if exists "organisatie toegang watch_sources" on watch_sources;
create policy "organisatie toegang watch_sources"
  on watch_sources for all
  using (is_org_member(organization_id))
  with check (is_org_member(organization_id));

drop policy if exists "organisatie toegang watch_vacancies" on watch_vacancies;
create policy "organisatie toegang watch_vacancies"
  on watch_vacancies for all
  using (is_org_member(organization_id))
  with check (is_org_member(organization_id));
