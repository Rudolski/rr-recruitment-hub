-- ============================================================
-- RR Recruitment Hub — migratie 005
-- Herstructurering:
--  * kandidaten en sollicitatieprocedures verdwijnen (staan in het ATS)
--  * placement houdt alleen een kandidaatnaam als tekst
--  * facturen krijgen een partner-tag (bv. Juul) voor omzet met/zonder
--    partneraandeel
-- Uit te voeren op het development Supabase project.
-- ============================================================

-- Pipeline weg
drop table if exists applications cascade;

-- Placement: kandidaatnaam als tekst i.p.v. koppeling
alter table placements add column if not exists candidate_name text;
update placements p
  set candidate_name = c.name
  from candidates c
  where c.id = p.candidate_id
    and p.candidate_name is null;
alter table placements drop column if exists candidate_id;
alter table placements drop column if exists application_id;

-- Kandidaten weg
drop table if exists candidates cascade;

-- Facturen: partneraandeel
alter table invoices add column if not exists partner_name text;
create index if not exists idx_invoices_partner on invoices(partner_name);

comment on column invoices.partner_name is
  'Gezet = deze factuurregel is een uitbetaling aan die partner (bedrag negatief). Leeg = normale klantfactuur.';

-- Bestaande import-regels van Juul taggen
update invoices
  set partner_name = 'Juul'
  where partner_name is null
    and (notes ilike '%aandeel Juul%' or notes ilike '%- JUUL%');
