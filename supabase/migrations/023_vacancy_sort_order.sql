-- ============================================================
-- RR Recruitment Hub — migratie 023
-- Handmatige prioriteitsvolgorde voor vacatures in het Procedures-
-- overzicht (slepen om bovenaan te zetten). Leeg (null) = geen
-- voorkeur, valt terug op de bestaande alfabetische sortering.
-- Idempotent. Development Supabase project.
-- ============================================================

alter table vacancies add column if not exists sort_order integer;

create index if not exists idx_vacancies_sort_order
  on vacancies(organization_id, sort_order);
