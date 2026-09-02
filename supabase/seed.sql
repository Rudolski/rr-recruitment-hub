-- ============================================================
-- RR Recruitment Hub — development seed
-- Alleen uitvoeren op het DEVELOPMENT-project, nooit op productie.
-- Draai dit in de Supabase SQL Editor (die draait als 'postgres' en
-- omzeilt RLS; via de app zou het niet luken omdat er geen
-- insert-policy op deze tabellen staat).
-- ============================================================

-- STAP 1 — Maak eerst je auth-gebruiker aan:
--   Supabase Dashboard > Authentication > Users > Add user
--   - Email + wachtwoord invullen
--   - "Auto Confirm User" AAN zetten
--
-- STAP 2 — Vervang hieronder het e-mailadres door dat van je zojuist
-- aangemaakte gebruiker en voer het hele blok uit. Het maakt de
-- organisatie aan (als die nog niet bestaat) en koppelt jou als owner.

with target_user as (
  select id
  from auth.users
  where email = 'VERVANG-DOOR-JOUW-EMAIL@voorbeeld.nl'
),
org as (
  insert into organizations (name)
  select 'RR Recruitment'
  where not exists (select 1 from organizations where name = 'RR Recruitment')
  returning id
),
org_id as (
  select id from org
  union all
  select id from organizations where name = 'RR Recruitment'
  limit 1
)
insert into organization_members (organization_id, user_id, role)
select org_id.id, target_user.id, 'owner'
from org_id, target_user
on conflict (organization_id, user_id) do nothing;

-- Controle: dit hoort nu jouw lidmaatschap te tonen.
select m.role, o.name as organization, u.email
from organization_members m
join organizations o on o.id = m.organization_id
join auth.users u on u.id = m.user_id;
