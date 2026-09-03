-- ============================================================
-- RR Recruitment Hub — migratie 004
-- Bestandsopslag: één private Storage-bucket 'files', met paden
--   <organization_id>/clients/<client_id>/<bestand>
--   <organization_id>/brand/<bestand>
-- plus een metadatatabel stored_files.
-- Uit te voeren op het development Supabase project.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('files', 'files', false)
on conflict (id) do nothing;

-- Toegang tot objecten: alleen leden van de organisatie in het eerste
-- pad-segment.
create policy "org leden lezen bestanden"
  on storage.objects for select
  using (
    bucket_id = 'files'
    and is_org_member(((storage.foldername(name))[1])::uuid)
  );

create policy "org leden uploaden bestanden"
  on storage.objects for insert
  with check (
    bucket_id = 'files'
    and is_org_member(((storage.foldername(name))[1])::uuid)
  );

create policy "org leden verwijderen bestanden"
  on storage.objects for delete
  using (
    bucket_id = 'files'
    and is_org_member(((storage.foldername(name))[1])::uuid)
  );

create table stored_files (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  uploaded_by uuid references auth.users(id),
  scope text not null check (scope in ('client', 'brand')),
  client_id uuid references clients(id) on delete cascade,
  storage_path text not null unique,
  filename text not null,
  mime_type text,
  size_bytes bigint,
  label text,
  created_at timestamptz not null default now()
);

create index idx_stored_files_client on stored_files(client_id);
create index idx_stored_files_scope
  on stored_files(organization_id, scope, created_at desc);

alter table stored_files enable row level security;

create policy "organisatie toegang stored_files"
  on stored_files for all
  using (is_org_member(organization_id))
  with check (is_org_member(organization_id));
