-- ============================================================
-- RR Recruitment Hub — migratie 025
-- Bijhouden wanneer de dagelijkse digest voor het laatst is
-- verstuurd, zodat 'm maar één keer per dag verstuurd wordt ongeacht
-- welk mechanisme 'm triggert (cron of het opportunistische vangnet
-- bij het openen van de hub, zie src/lib/daily-digest.ts).
-- Idempotent. Development Supabase project.
-- ============================================================

create table if not exists digest_send_log (
  organization_id uuid primary key references organizations(id) on delete cascade,
  last_sent_on date,
  last_sent_at timestamptz
);

alter table digest_send_log enable row level security;

drop policy if exists "organisatie toegang digest_send_log" on digest_send_log;
create policy "organisatie toegang digest_send_log"
  on digest_send_log for all
  using (is_org_member(organization_id))
  with check (is_org_member(organization_id));

grant select, insert, update, delete on digest_send_log to authenticated, service_role;
