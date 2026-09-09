-- ============================================================
-- RR Recruitment Hub — migratie 014
-- Datum bij de huidige stap van een kandidaat in de mini-funnel
-- (bijv. de datum van het 1e gesprek). Wordt leeggemaakt zodra de
-- kandidaat naar een andere stap gaat.
-- Idempotent. Development Supabase project.
-- ============================================================

alter table vacancy_candidates
  add column if not exists stage_date date;
