-- ============================================================
-- RR Recruitment Hub — migratie 009
-- Vrij tekstveld op de factuur om te noteren welke vacature is
-- vervuld. Geen koppeling; puur ter herkenning.
-- Idempotent. Development Supabase project.
-- ============================================================

alter table invoices add column if not exists vacancy_label text;
