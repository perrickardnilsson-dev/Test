-- =============================================================
-- Förbättringar: bildstöd i frågor, förlängd tid per elev,
-- lärarens möjlighet att återöppna försök, samt bildbucket.
-- Kör efter 0001_init.sql.
-- =============================================================

-- -------------------------------------------------------------
-- Bildstöd i frågor
-- -------------------------------------------------------------

alter table public.question_bank add column if not exists bild_url text;

-- Publik bucket för frågebilder (bilderna innehåller inga persondata).
insert into storage.buckets (id, name, public)
values ('question-images', 'question-images', true)
on conflict (id) do nothing;

create policy "question_images_teacher_insert" on storage.objects
  for insert with check (
    bucket_id = 'question-images'
    and public.current_role() = 'teacher'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "question_images_public_select" on storage.objects
  for select using (bucket_id = 'question-images');

create policy "question_images_teacher_delete" on storage.objects
  for delete using (
    bucket_id = 'question-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- -------------------------------------------------------------
-- Förlängd tid per elev + återöppning av försök
-- -------------------------------------------------------------

alter table public.attempts
  add column if not exists extra_minuter int not null default 0
  check (extra_minuter >= 0);

-- Läraren får uppdatera försök i sina egna prov (återöppna inlämning,
-- förlänga tid).
create policy "attempts_teacher_update" on public.attempts
  for update using (public.is_exam_teacher(exam_id))
  with check (public.is_exam_teacher(exam_id));

-- -------------------------------------------------------------
-- RPC:er uppdateras med bild_url
-- -------------------------------------------------------------

drop function if exists public.get_student_exam_questions(uuid);

create or replace function public.get_student_exam_questions(p_exam_id uuid)
returns table (
  exam_question_id uuid,
  ordning int,
  poang int,
  fragetyp text,
  fragetext text,
  alternativ jsonb,
  bild_url text
)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not exists (
    select 1 from public.exams e
    where e.id = p_exam_id
      and e.status <> 'utkast'
      and public.is_class_member(e.class_id)
  ) then
    raise exception 'Ingen åtkomst till detta prov';
  end if;

  return query
  select eq.id, eq.ordning, eq.poang, qb.fragetyp, qb.fragetext,
         qb.alternativ, qb.bild_url
  from public.exam_questions eq
  join public.question_bank qb on qb.id = eq.question_id
  where eq.exam_id = p_exam_id
  order by eq.ordning;
end;
$$;

drop function if exists public.get_student_results(uuid);

create or replace function public.get_student_results(p_attempt_id uuid)
returns table (
  exam_question_id uuid,
  ordning int,
  max_poang int,
  fragetyp text,
  fragetext text,
  alternativ jsonb,
  bild_url text,
  facit jsonb,
  svar jsonb,
  poang numeric,
  kommentar text,
  ai_niva text
)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.attempts a
    join public.exams e on e.id = a.exam_id
    where a.id = p_attempt_id
      and a.student_id = auth.uid()
      and e.status = 'rattat'
  ) then
    raise exception 'Resultatet är inte publicerat ännu';
  end if;

  return query
  select
    eq.id,
    eq.ordning,
    eq.poang,
    qb.fragetyp,
    qb.fragetext,
    qb.alternativ,
    qb.bild_url,
    qb.facit,
    ans.svar,
    coalesce(g.larare_poang, g.auto_poang, 0),
    g.larare_kommentar,
    g.ai_niva
  from public.attempts a
  join public.exam_questions eq on eq.exam_id = a.exam_id
  join public.question_bank qb on qb.id = eq.question_id
  left join public.answers ans
    on ans.attempt_id = a.id and ans.exam_question_id = eq.id
  left join public.gradings g on g.answer_id = ans.id
  where a.id = p_attempt_id
  order by eq.ordning;
end;
$$;
