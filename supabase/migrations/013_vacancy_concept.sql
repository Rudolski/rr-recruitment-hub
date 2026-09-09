-- ============================================================
-- RR Recruitment Hub — migratie 013
-- Vacaturestatus 'concept' toevoegen (vacature in voorbereiding,
-- telt niet mee als openstaand of in de forecast).
-- Idempotent. Development Supabase project.
-- ============================================================

alter table vacancies drop constraint if exists vacancies_status_check;
alter table vacancies add constraint vacancies_status_check check (
  status in ('concept', 'open', 'on_hold', 'vervuld', 'geannuleerd')
);
