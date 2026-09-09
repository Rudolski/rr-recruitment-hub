-- ============================================================
-- RR Recruitment Hub — migratie 012
-- Vacature-radar: alleen exclusieve vacatures kunnen volgen.
--  * watch_sources.exclusive_only : detailpagina ophalen en alleen
--    vacatures bewaren waar een opdrachtgever met naam in staat
--  * watch_vacancies.company       : die opdrachtgevernaam
-- Idempotent. Development Supabase project.
-- ============================================================

alter table watch_sources
  add column if not exists exclusive_only boolean not null default false;

alter table watch_vacancies
  add column if not exists company text;

create index if not exists idx_watch_vacancies_company
  on watch_vacancies(source_id)
  where company is not null and closed_at is null;
