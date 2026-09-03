-- ============================================================
-- RR Recruitment Hub — migratie 007
--  * vacature: consultant (Ruud/Juul), partneraandeel-percentage,
--    fee-percentage rechtstreeks, einddatum exclusiviteit
--  * placement: partnernaam en partneraandeel in euro's
-- Idempotent. Development Supabase project.
-- ============================================================

alter table vacancies add column if not exists consultant text;
alter table vacancies add column if not exists partner_pct numeric(5, 2);
alter table vacancies add column if not exists fee_pct numeric(5, 2);
alter table vacancies add column if not exists exclusivity_until date;

alter table placements add column if not exists partner_name text;
alter table placements
  add column if not exists partner_share_amount numeric(12, 2);
