-- ============================================================
-- RR Recruitment Hub — migratie 006
-- Lichte acquisitie-/CRM-laag:
--  * klantstatus wordt de acquisitie-funnel
--  * client_notes: notities per klant met een optionele opvolgdatum
-- Idempotent waar mogelijk. Development Supabase project.
-- ============================================================

-- 1. Klantstatus = acquisitie-funnel
update clients set status = 'nieuw' where status = 'prospect';

alter table clients drop constraint if exists clients_status_check;
alter table clients alter column status set default 'nieuw';
alter table clients add constraint clients_status_check check (
  status in (
    'nieuw',
    'in_outreach',
    'warm',
    'afspraak_gepland',
    'voorstel_gestuurd',
    'actief',
    'inactief'
  )
);

-- 2. Notities + opvolging
create table if not exists client_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  author_id uuid references auth.users(id),
  body text not null,
  follow_up_on date,
  follow_up_done boolean not null default false,
  follow_up_done_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_client_notes_client
  on client_notes(client_id, created_at desc);
create index if not exists idx_client_notes_followup
  on client_notes(organization_id, follow_up_on)
  where follow_up_done = false;

alter table client_notes enable row level security;

drop policy if exists "organisatie toegang client_notes" on client_notes;
create policy "organisatie toegang client_notes"
  on client_notes for all
  using (is_org_member(organization_id))
  with check (is_org_member(organization_id));
