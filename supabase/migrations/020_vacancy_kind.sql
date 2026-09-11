-- ============================================================
-- RR Recruitment Hub — migratie 020
-- Soort vacature: W&S (default) / Interim (eigen uren) / ZZP Marge.
-- Net als bij facturen, maar zonder 'commitment' (dat ontstaat pas ná
-- een geslaagde W&S-plaatsing, niet als vacaturesoort op zich).
-- Idempotent. Development Supabase project.
-- ============================================================

alter table vacancies add column if not exists kind text not null default 'wervingsfee';

alter table vacancies drop constraint if exists vacancies_kind_check;
alter table vacancies add constraint vacancies_kind_check check (
  kind in ('wervingsfee', 'interim', 'zzp_marge')
);
