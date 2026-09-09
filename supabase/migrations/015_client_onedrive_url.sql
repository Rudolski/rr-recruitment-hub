-- ============================================================
-- RR Recruitment Hub — migratie 015
-- Link naar de OneDrive-map van een klant. Bestanden blijven op
-- OneDrive; de Hub linkt er alleen naartoe.
-- Idempotent. Development Supabase project.
-- ============================================================

alter table clients
  add column if not exists onedrive_url text;
