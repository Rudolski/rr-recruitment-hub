-- ============================================================
-- RR Recruitment Hub — migratie 002
-- Maandelijkse targets (fase 2). Kwartaal- en jaartotalen worden
-- niet opgeslagen maar in de app opgeteld uit de maanden.
-- Uit te voeren op het development Supabase project.
-- ============================================================

create table monthly_targets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  year integer not null,
  month integer not null check (month between 1 and 12),
  target_revenue numeric(12,2),
  target_placements integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, year, month)
);

create index idx_monthly_targets_org_year
  on monthly_targets(organization_id, year);

create trigger trg_monthly_targets_updated_at
  before update on monthly_targets
  for each row execute function set_updated_at();

alter table monthly_targets enable row level security;

create policy "organisatie toegang monthly_targets"
  on monthly_targets for all
  using (is_org_member(organization_id))
  with check (is_org_member(organization_id));
