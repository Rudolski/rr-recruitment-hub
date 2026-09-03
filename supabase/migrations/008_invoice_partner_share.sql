-- ============================================================
-- RR Recruitment Hub — migratie 008
-- Factuur = één regel met het volledige factuurbedrag. Het deel
-- dat naar een partner (bijv. Juul) gaat, staat apart in
-- partner_share_amount (excl. btw, positief bedrag). De netto-omzet
-- van RR = amount_excl_btw - partner_share_amount.
-- Idempotent. Development Supabase project.
-- ============================================================

alter table invoices
  add column if not exists partner_share_amount numeric(12, 2);
