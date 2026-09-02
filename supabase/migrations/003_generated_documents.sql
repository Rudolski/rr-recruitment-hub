-- ============================================================
-- RR Recruitment Hub — migratie 003
-- Geschiedenis van AI-gegenereerde teksten (fase 3). Elke
-- generator schrijft hier zijn output naar toe zodat niets
-- verloren gaat en oude versies terug te vinden zijn.
-- Uit te voeren op het development Supabase project.
-- ============================================================

create table generated_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  created_by uuid references auth.users(id),
  type text not null check (type in (
    'contract', 'vacaturetekst', 'kandidaatintro', 'outreach', 'boolean'
  )),
  title text,
  related_entity_type text,
  related_entity_id uuid,
  input jsonb,
  content text not null,
  model text,
  created_at timestamptz not null default now()
);

create index idx_generated_documents_org_type
  on generated_documents(organization_id, type, created_at desc);

alter table generated_documents enable row level security;

create policy "organisatie toegang generated_documents"
  on generated_documents for all
  using (is_org_member(organization_id))
  with check (is_org_member(organization_id));
