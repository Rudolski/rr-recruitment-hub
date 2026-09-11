-- ============================================================
-- RR Recruitment Hub — migratie 018
-- Factuurstatussen vereenvoudigd:
--  - 'nog_verzenden' vervalt en gaat op in 'concept'. 'concept' telt
--    voortaan zelf al mee als behaalde omzet (net als 'nog_verzenden'
--    deed) — het bedrag staat vast zodra de factuurregel bestaat, ook
--    al is 'ie nog niet verstuurd.
--  - 'gecrediteerd' vervalt volledig; crediteren doen we niet.
-- Idempotent. Development Supabase project.
-- ============================================================

update invoices set status = 'concept' where status in ('nog_verzenden', 'gecrediteerd');

alter table invoices drop constraint if exists invoices_status_check;
alter table invoices add constraint invoices_status_check check (
  status in (
    'concept',
    'verzonden',
    'betaald',
    'te_laat'
  )
);
