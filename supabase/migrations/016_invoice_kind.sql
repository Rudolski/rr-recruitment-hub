-- ============================================================
-- RR Recruitment Hub — migratie 016
-- Soort factuur: niet elke factuur is een wervingsfee.
--   wervingsfee  — standaard W&S-fee (meestal %)
--   commitment   — commitment fee, meestal vast bedrag (~2500)
--   interim      — interim-omzet, eigen uren (geen W&S)
--   zzp_marge    — marge op ZZP-inhuur (geen W&S)
-- Bestaande facturen worden 'wervingsfee'.
-- Idempotent. Development Supabase project.
-- ============================================================

alter table invoices
  add column if not exists kind text not null default 'wervingsfee';

alter table invoices drop constraint if exists invoices_kind_check;
alter table invoices add constraint invoices_kind_check check (
  kind in ('wervingsfee', 'commitment', 'interim', 'zzp_marge')
);

create index if not exists idx_invoices_kind on invoices(kind);
