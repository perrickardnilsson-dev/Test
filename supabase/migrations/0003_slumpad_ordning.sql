-- =============================================================
-- Anti-fusk: slumpad frågeordning per elev.
-- Kör efter 0002_forbattringar.sql.
-- =============================================================

alter table public.exams
  add column if not exists slumpa_fragor boolean not null default false;
