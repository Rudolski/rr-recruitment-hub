-- ============================================================
-- RR Recruitment Hub — migratie 019
-- Bewaarlijst voor LinkedIn-vacatures die (nog) geen relatie zijn: een
-- link + korte notitie + datum om later te benaderen. Nog geen klant —
-- daarom een losse tabel i.p.v. een status op 'clients'. Kan met één
-- actie omgezet worden naar een klant in de acquisitie-funnel.
-- Idempotent. Development Supabase project.
-- ============================================================

create table if not exists acquisitie_leads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  author_id uuid references auth.users(id),
  linkedin_url text not null,
  company_name text,
  note text,
  approach_on date not null,
  done boolean not null default false,
  done_at timestamptz,
  converted_client_id uuid references clients(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_acquisitie_leads_open
  on acquisitie_leads(organization_id, approach_on)
  where done = false;

alter table acquisitie_leads enable row level security;

drop policy if exists "organisatie toegang acquisitie_leads" on acquisitie_leads;
create policy "organisatie toegang acquisitie_leads"
  on acquisitie_leads for all
  using (is_org_member(organization_id))
  with check (is_org_member(organization_id));
