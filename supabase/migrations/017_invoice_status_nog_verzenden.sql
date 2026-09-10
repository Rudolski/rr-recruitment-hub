-- ============================================================
-- RR Recruitment Hub — migratie 017
-- Extra factuurstatus 'nog_verzenden': factuur staat vast maar is nog
-- niet in Snelstart verstuurd. Telt al wel mee als behaalde omzet.
-- Volgorde: concept -> nog_verzenden -> verzonden -> betaald / te_laat.
-- Idempotent. Development Supabase project.
-- ============================================================

alter table invoices drop constraint if exists invoices_status_check;
alter table invoices add constraint invoices_status_check check (
  status in (
    'concept',
    'nog_verzenden',
    'verzonden',
    'betaald',
    'te_laat',
    'gecrediteerd'
  )
);
