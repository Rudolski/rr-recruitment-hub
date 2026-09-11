-- ============================================================
-- RR Recruitment Hub — migratie 021
-- Zeldzame uitzondering: een factuur waarvan het partnerdeel over
-- meerdere partners verdeeld wordt (bijv. Juul + Sven, elk een eigen
-- bedrag). partner_name/partner_share_amount blijven de standaard
-- (één partner, verreweg de meeste facturen); partner_breakdown is een
-- optionele array [{name, amount}, ...] die de losse bedragen per
-- partner vasthoudt zodra er meer dan één is. partner_share_amount
-- blijft in dat geval de SOM van de breakdown, zodat alle bestaande
-- omzetberekeningen (die alleen naar het totaal kijken) ongewijzigd
-- blijven werken.
-- Idempotent. Development Supabase project.
-- ============================================================

alter table invoices add column if not exists partner_breakdown jsonb;
