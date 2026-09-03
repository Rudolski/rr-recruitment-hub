-- ============================================================
-- RR Recruitment Hub — migratie 010
-- Per vacature:
--  * vacancy_tasks: actiepunten (afvinkbaar)
--  * vacancy_candidates: mini-funnel met alleen voornamen (AVG-proof),
--    één stap per kandidaat
-- Idempotent. Development Supabase project.
-- ============================================================

create table if not exists vacancy_tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  vacancy_id uuid not null references vacancies(id) on delete cascade,
  body text not null,
  done boolean not null default false,
  done_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_vacancy_tasks_vacancy
  on vacancy_tasks(vacancy_id, created_at);

alter table vacancy_tasks enable row level security;

drop policy if exists "organisatie toegang vacancy_tasks" on vacancy_tasks;
create policy "organisatie toegang vacancy_tasks"
  on vacancy_tasks for all
  using (is_org_member(organization_id))
  with check (is_org_member(organization_id));

create table if not exists vacancy_candidates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  vacancy_id uuid not null references vacancies(id) on delete cascade,
  first_name text not null,
  stage text not null default 'intake' check (
    stage in (
      'intake',
      'voorgesteld',
      'gesprek_1',
      'gesprek_2',
      'abvw',
      'aangenomen',
      'afgewezen'
    )
  ),
  note text,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_vacancy_candidates_vacancy
  on vacancy_candidates(vacancy_id, stage, position);

alter table vacancy_candidates enable row level security;

drop policy if exists "organisatie toegang vacancy_candidates" on vacancy_candidates;
create policy "organisatie toegang vacancy_candidates"
  on vacancy_candidates for all
  using (is_org_member(organization_id))
  with check (is_org_member(organization_id));
