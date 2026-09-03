-- ============================================================
-- Import Cijfers26.xlsx — omzet 2026 (excl. btw) — TESTDATA
-- Draai in de Supabase SQL Editor (development). 'Run without RLS'.
-- Alle regels uit het Excel zijn overgenomen, ook die met tag
-- 'Prognose' of 'nog factureren', zodat de maandtotalen exact
-- overeenkomen met je sheet. Losse regels bijstellen kan daarna
-- via factuurnummer IMP26-xxx.
-- Terugdraaien:  delete from invoices where invoice_number like 'IMP26-%';
-- ============================================================

-- 1. Klanten (alleen als de naam nog niet bestaat)
with org as (select id from organizations where name = 'RR Recruitment' limit 1)
insert into clients (organization_id, name, status)
select (select id from org), x.name, 'actief'
from (values
  ('Caroz'),
  ('DHL'),
  ('Hines'),
  ('Jumbo'),
  ('Logicall'),
  ('Oegema'),
  ('Startech'),
  ('Udea'),
  ('Vos'),
  ('Worldpack')
) as x(name)
where not exists (select 1 from clients c where c.name = x.name);

-- 2. Facturen (status betaald; factuurdatum = 15e, betaald = 20e)
with org as (select id from organizations where name = 'RR Recruitment' limit 1)
insert into invoices (organization_id, client_id, invoice_number, amount_excl_btw,
  btw_percentage, status, issue_date, sent_at, paid_date, notes)
values
  ((select id from org), (select id from clients where name = 'Worldpack' order by created_at limit 1), 'IMP26-001', 2500.0, 21, 'betaald', DATE '2026-01-15', TIMESTAMPTZ '2026-01-15 12:00', DATE '2026-01-20', 'Worldpack SC Planner'),
  ((select id from org), (select id from clients where name = 'Worldpack' order by created_at limit 1), 'IMP26-002', 10834.56, 21, 'betaald', DATE '2026-02-15', TIMESTAMPTZ '2026-02-15 12:00', DATE '2026-02-20', 'Worldpack Demand Planner'),
  ((select id from org), (select id from clients where name = 'Caroz' order by created_at limit 1), 'IMP26-003', 5000.0, 21, 'betaald', DATE '2026-03-15', TIMESTAMPTZ '2026-03-15 12:00', DATE '2026-03-20', 'Caroz Gerrit - Vervanger Angelina 5K'),
  ((select id from org), (select id from clients where name = 'Caroz' order by created_at limit 1), 'IMP26-004', -2500.0, 21, 'betaald', DATE '2026-03-15', TIMESTAMPTZ '2026-03-15 12:00', DATE '2026-03-20', 'Caroz Gerrit - Vervanger Angelina 5K — correctie/verrekening (bv. commitment fee)'),
  ((select id from org), (select id from clients where name = 'Logicall' order by created_at limit 1), 'IMP26-005', 2500.0, 21, 'betaald', DATE '2026-03-15', TIMESTAMPTZ '2026-03-15 12:00', DATE '2026-03-20', 'Logicall Expediteur Twan'),
  ((select id from org), (select id from clients where name = 'Vos' order by created_at limit 1), 'IMP26-006', 7140.51, 21, 'betaald', DATE '2026-05-15', TIMESTAMPTZ '2026-05-15 12:00', DATE '2026-05-20', 'Vos HRBP Oss - opnieuw 50%'),
  ((select id from org), (select id from clients where name = 'Caroz' order by created_at limit 1), 'IMP26-007', 2500.0, 21, 'betaald', DATE '2026-04-15', TIMESTAMPTZ '2026-04-15 12:00', DATE '2026-04-20', 'Caroz Sales - JUUL — aandeel Juul (extern gefactureerd)'),
  ((select id from org), (select id from clients where name = 'Caroz' order by created_at limit 1), 'IMP26-008', -750.0, 21, 'betaald', DATE '2026-06-15', TIMESTAMPTZ '2026-06-15 12:00', DATE '2026-06-20', 'Caroz Sales - JUUL — aandeel Juul (extern gefactureerd)'),
  ((select id from org), (select id from clients where name = 'Vos' order by created_at limit 1), 'IMP26-009', 2500.0, 21, 'betaald', DATE '2026-06-15', TIMESTAMPTZ '2026-06-15 12:00', DATE '2026-06-20', 'Vos - Expediteur Barendrecht'),
  ((select id from org), (select id from clients where name = 'Vos' order by created_at limit 1), 'IMP26-010', 9378.1, 21, 'betaald', DATE '2026-07-15', TIMESTAMPTZ '2026-07-15 12:00', DATE '2026-07-20', 'Vos - Expediteur Barendrecht'),
  ((select id from org), (select id from clients where name = 'Vos' order by created_at limit 1), 'IMP26-011', -5439.05, 21, 'betaald', DATE '2026-07-15', TIMESTAMPTZ '2026-07-15 12:00', DATE '2026-07-20', 'Vos - Expediteur Barendrecht - JUUL — aandeel Juul (extern gefactureerd)'),
  ((select id from org), (select id from clients where name = 'Hines' order by created_at limit 1), 'IMP26-012', 2500.0, 21, 'betaald', DATE '2026-06-15', TIMESTAMPTZ '2026-06-15 12:00', DATE '2026-06-20', 'Hines - Controller'),
  ((select id from org), (select id from clients where name = 'Hines' order by created_at limit 1), 'IMP26-013', 17300.0, 21, 'betaald', DATE '2026-08-15', TIMESTAMPTZ '2026-08-15 12:00', DATE '2026-08-20', 'Hines - Controller'),
  ((select id from org), (select id from clients where name = 'Hines' order by created_at limit 1), 'IMP26-014', -9000.0, 21, 'betaald', DATE '2026-08-15', TIMESTAMPTZ '2026-08-15 12:00', DATE '2026-08-20', 'Hines Frank 50% — correctie/verrekening (bv. commitment fee)'),
  ((select id from org), (select id from clients where name = 'Startech' order by created_at limit 1), 'IMP26-015', 2500.0, 21, 'betaald', DATE '2026-06-15', TIMESTAMPTZ '2026-06-15 12:00', DATE '2026-06-20', 'Startech - Supervisor - Damian'),
  ((select id from org), (select id from clients where name = 'Startech' order by created_at limit 1), 'IMP26-016', 11756.0, 21, 'betaald', DATE '2026-08-15', TIMESTAMPTZ '2026-08-15 12:00', DATE '2026-08-20', 'Startech - Supervisor - Damian'),
  ((select id from org), (select id from clients where name = 'Startech' order by created_at limit 1), 'IMP26-017', 2500.0, 21, 'betaald', DATE '2026-06-15', TIMESTAMPTZ '2026-06-15 12:00', DATE '2026-06-20', 'Startech - Warehouse Coordinator / IVC'),
  ((select id from org), (select id from clients where name = 'Startech' order by created_at limit 1), 'IMP26-018', 8192.0, 21, 'betaald', DATE '2026-08-15', TIMESTAMPTZ '2026-08-15 12:00', DATE '2026-08-20', 'Startech - Warehouse Coordinator / IVC'),
  ((select id from org), (select id from clients where name = 'Startech' order by created_at limit 1), 'IMP26-019', 2500.0, 21, 'betaald', DATE '2026-08-15', TIMESTAMPTZ '2026-08-15 12:00', DATE '2026-08-20', 'Startech Senior Supervisor COMMITMENT'),
  ((select id from org), (select id from clients where name = 'Jumbo' order by created_at limit 1), 'IMP26-020', 2500.0, 21, 'betaald', DATE '2026-06-15', TIMESTAMPTZ '2026-06-15 12:00', DATE '2026-06-20', 'Jumbo Site Manager EFC Bleiswijk Commitment'),
  ((select id from org), (select id from clients where name = 'Udea' order by created_at limit 1), 'IMP26-021', 2500.0, 21, 'betaald', DATE '2026-06-15', TIMESTAMPTZ '2026-06-15 12:00', DATE '2026-06-20', 'Udea - Workforce planner'),
  ((select id from org), (select id from clients where name = 'Udea' order by created_at limit 1), 'IMP26-022', 6481.28, 21, 'betaald', DATE '2026-08-15', TIMESTAMPTZ '2026-08-15 12:00', DATE '2026-08-20', 'Udea - Workforce planner'),
  ((select id from org), (select id from clients where name = 'Udea' order by created_at limit 1), 'IMP26-023', -3990.64, 21, 'betaald', DATE '2026-08-15', TIMESTAMPTZ '2026-08-15 12:00', DATE '2026-08-20', 'Udea - Workforce planner — correctie/verrekening (bv. commitment fee)'),
  ((select id from org), (select id from clients where name = 'Udea' order by created_at limit 1), 'IMP26-024', 2500.0, 21, 'betaald', DATE '2026-06-15', TIMESTAMPTZ '2026-06-15 12:00', DATE '2026-06-20', 'Udea Wagenparkbeheerder'),
  ((select id from org), (select id from clients where name = 'Udea' order by created_at limit 1), 'IMP26-025', 4250.0, 21, 'betaald', DATE '2026-09-15', TIMESTAMPTZ '2026-09-15 12:00', DATE '2026-09-20', 'Udea Wagenparkbeheerder'),
  ((select id from org), (select id from clients where name = 'Udea' order by created_at limit 1), 'IMP26-026', 2500.0, 21, 'betaald', DATE '2026-06-15', TIMESTAMPTZ '2026-06-15 12:00', DATE '2026-06-20', 'Udea Warehouse Manager'),
  ((select id from org), (select id from clients where name = 'Udea' order by created_at limit 1), 'IMP26-027', 11756.0, 21, 'betaald', DATE '2026-07-15', TIMESTAMPTZ '2026-07-15 12:00', DATE '2026-07-20', 'Udea Warehouse Manager'),
  ((select id from org), (select id from clients where name = 'Udea' order by created_at limit 1), 'IMP26-028', 2500.0, 21, 'betaald', DATE '2026-06-15', TIMESTAMPTZ '2026-06-15 12:00', DATE '2026-06-20', 'Udea - Supply chain engineer'),
  ((select id from org), (select id from clients where name = 'Udea' order by created_at limit 1), 'IMP26-029', 10000.0, 21, 'betaald', DATE '2026-09-15', TIMESTAMPTZ '2026-09-15 12:00', DATE '2026-09-20', 'Udea - Supply chain engineer'),
  ((select id from org), (select id from clients where name = 'Vos' order by created_at limit 1), 'IMP26-030', 2500.0, 21, 'betaald', DATE '2026-06-15', TIMESTAMPTZ '2026-06-15 12:00', DATE '2026-06-20', 'Vos - Expediteur Oss'),
  ((select id from org), (select id from clients where name = 'Vos' order by created_at limit 1), 'IMP26-031', 3750.0, 21, 'betaald', DATE '2026-09-15', TIMESTAMPTZ '2026-09-15 12:00', DATE '2026-09-20', 'Vos - Expediteur Oss'),
  ((select id from org), (select id from clients where name = 'Oegema' order by created_at limit 1), 'IMP26-032', 2500.0, 21, 'betaald', DATE '2026-07-15', TIMESTAMPTZ '2026-07-15 12:00', DATE '2026-07-20', 'Oegema site manager'),
  ((select id from org), (select id from clients where name = 'Oegema' order by created_at limit 1), 'IMP26-033', 12368.21, 21, 'betaald', DATE '2026-08-15', TIMESTAMPTZ '2026-08-15 12:00', DATE '2026-08-20', 'Oegema site manager'),
  ((select id from org), (select id from clients where name = 'Oegema' order by created_at limit 1), 'IMP26-034', -6934.1, 21, 'betaald', DATE '2026-08-15', TIMESTAMPTZ '2026-08-15 12:00', DATE '2026-08-20', 'Oegema Juul — aandeel Juul (extern gefactureerd)'),
  ((select id from org), (select id from clients where name = 'Worldpack' order by created_at limit 1), 'IMP26-035', 2500.0, 21, 'betaald', DATE '2026-08-15', TIMESTAMPTZ '2026-08-15 12:00', DATE '2026-08-20', 'Worldpack - Demand Planner'),
  ((select id from org), (select id from clients where name = 'Worldpack' order by created_at limit 1), 'IMP26-036', 7500.0, 21, 'betaald', DATE '2026-09-15', TIMESTAMPTZ '2026-09-15 12:00', DATE '2026-09-20', 'Worldpack - Demand Planner'),
  ((select id from org), (select id from clients where name = 'Startech' order by created_at limit 1), 'IMP26-037', 9855.2, 21, 'betaald', DATE '2026-08-15', TIMESTAMPTZ '2026-08-15 12:00', DATE '2026-08-20', 'Startech - leading hand'),
  ((select id from org), (select id from clients where name = 'DHL' order by created_at limit 1), 'IMP26-038', 5520.0, 21, 'betaald', DATE '2026-06-15', TIMESTAMPTZ '2026-06-15 12:00', DATE '2026-06-20', 'DHL'),
  ((select id from org), (select id from clients where name = 'DHL' order by created_at limit 1), 'IMP26-039', 2880.0, 21, 'betaald', DATE '2026-07-15', TIMESTAMPTZ '2026-07-15 12:00', DATE '2026-07-20', 'DHL'),
  ((select id from org), (select id from clients where name = 'DHL' order by created_at limit 1), 'IMP26-040', 5760.0, 21, 'betaald', DATE '2026-08-15', TIMESTAMPTZ '2026-08-15 12:00', DATE '2026-08-20', 'DHL'),
  ((select id from org), (select id from clients where name = 'DHL' order by created_at limit 1), 'IMP26-041', 7680.0, 21, 'betaald', DATE '2026-09-15', TIMESTAMPTZ '2026-09-15 12:00', DATE '2026-09-20', 'DHL');

-- Controle — netto omzet per maand na import (excl. btw):
--   2026-01:       2500.0
--   2026-02:     10834.56
--   2026-03:       5000.0
--   2026-04:       2500.0
--   2026-05:      7140.51
--   2026-06:      29770.0
--   2026-07:     21075.05
--   2026-08:     56787.95
--   2026-09:      33180.0
--   Jaar 2026:     168788.07

-- 3. OPTIONEEL — maandtargets 2026 uit het Excel (overschrijft bestaande)
with org as (select id from organizations where name = 'RR Recruitment' limit 1)
insert into monthly_targets (organization_id, year, month, target_revenue)
values
  ((select id from org), 2026, 1, 12000.0),
  ((select id from org), 2026, 2, 20000.0),
  ((select id from org), 2026, 3, 20000.0),
  ((select id from org), 2026, 4, 20000.0),
  ((select id from org), 2026, 5, 20000.0),
  ((select id from org), 2026, 6, 20000.0),
  ((select id from org), 2026, 7, 5000.0),
  ((select id from org), 2026, 8, 20000.0),
  ((select id from org), 2026, 9, 20000.0),
  ((select id from org), 2026, 10, 20000.0),
  ((select id from org), 2026, 11, 20000.0),
  ((select id from org), 2026, 12, 12000.0)
on conflict (organization_id, year, month) do update set target_revenue = excluded.target_revenue;
