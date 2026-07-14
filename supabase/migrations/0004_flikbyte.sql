-- =============================================================
-- Anti-fusk: registrera när eleven lämnar provfliken.
-- Kör efter 0003_slumpad_ordning.sql.
-- =============================================================

alter table public.attempts
  add column if not exists fokus_tapp int not null default 0
  check (fokus_tapp >= 0);

-- Eleven rapporterar själv att fliken lämnats. Räknaren kan bara ökas,
-- och bara på ett eget, ej inlämnat försök.
create or replace function public.report_focus_loss(p_attempt_id uuid)
returns int
language plpgsql security definer set search_path = public
as $$
declare
  v_count int;
begin
  update public.attempts
  set fokus_tapp = fokus_tapp + 1
  where id = p_attempt_id
    and student_id = auth.uid()
    and inlamnad is null
  returning fokus_tapp into v_count;

  return coalesce(v_count, 0);
end;
$$;
