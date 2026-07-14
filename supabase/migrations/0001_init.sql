-- =============================================================
-- NO-lärarplattform – initialt schema med RLS
-- =============================================================

-- -------------------------------------------------------------
-- Tabeller
-- -------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('teacher', 'student')),
  name text not null,
  email text not null,
  created_at timestamptz not null default now()
);

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  amne text not null check (amne in ('biologi', 'fysik', 'kemi', 'teknik')),
  arskurs int not null check (arskurs between 7 and 9),
  class_code text not null unique,
  created_at timestamptz not null default now()
);

create table public.class_members (
  class_id uuid not null references public.classes (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (class_id, student_id)
);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  email text not null,
  token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  status text not null default 'vantar' check (status in ('vantar', 'accepterad')),
  created_at timestamptz not null default now()
);

create table public.source_documents (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  amne text not null check (amne in ('biologi', 'fysik', 'kemi', 'teknik')),
  year int,
  storage_path text not null,
  status text not null default 'uppladdad'
    check (status in ('uppladdad', 'tolkar', 'tolkad', 'misslyckad')),
  extracted jsonb,
  error_message text,
  created_at timestamptz not null default now()
);

create table public.question_bank (
  id uuid primary key default gen_random_uuid(),
  -- null = delad exempel-/seedfråga som alla lärare kan använda
  owner_id uuid references public.profiles (id) on delete cascade,
  amne text not null check (amne in ('biologi', 'fysik', 'kemi', 'teknik')),
  arskurs int not null check (arskurs between 7 and 9),
  centralt_innehall text not null,
  fragetyp text not null
    check (fragetyp in ('flerval_ett', 'flerval_flera', 'kortsvar', 'fritext')),
  fragetext text not null,
  alternativ jsonb,
  facit jsonb not null,
  bedomningsanvisning text,
  niva text not null check (niva in ('E', 'C', 'A')),
  kalla text not null check (kalla in ('np', 'ai_genererad', 'egen')),
  source_document_id uuid references public.source_documents (id) on delete set null,
  poang int not null default 1 check (poang > 0),
  created_at timestamptz not null default now()
);

create table public.exams (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  titel text not null,
  instruktioner text,
  visningslage text not null default 'en_fraga'
    check (visningslage in ('en_fraga', 'alla')),
  tidsgrans_minuter int check (tidsgrans_minuter > 0),
  oppnar timestamptz,
  stanger timestamptz,
  status text not null default 'utkast'
    check (status in ('utkast', 'publicerat', 'rattat')),
  created_at timestamptz not null default now()
);

create table public.exam_questions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams (id) on delete cascade,
  question_id uuid not null references public.question_bank (id) on delete restrict,
  ordning int not null,
  poang int not null default 1 check (poang > 0),
  unique (exam_id, question_id)
);

create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  startad timestamptz not null default now(),
  inlamnad timestamptz,
  unique (exam_id, student_id)
);

create table public.answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.attempts (id) on delete cascade,
  exam_question_id uuid not null references public.exam_questions (id) on delete cascade,
  svar jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (attempt_id, exam_question_id)
);

create table public.gradings (
  id uuid primary key default gen_random_uuid(),
  answer_id uuid not null unique references public.answers (id) on delete cascade,
  auto_poang numeric,
  ai_forslag_poang numeric,
  ai_niva text check (ai_niva in ('E', 'C', 'A')),
  ai_motivering text,
  larare_poang numeric,
  larare_kommentar text,
  status text not null default 'vantar' check (status in ('vantar', 'godkand')),
  updated_at timestamptz not null default now()
);

create index idx_classes_teacher on public.classes (teacher_id);
create index idx_class_members_student on public.class_members (student_id);
create index idx_question_bank_owner on public.question_bank (owner_id);
create index idx_question_bank_amne on public.question_bank (amne, arskurs);
create index idx_exams_class on public.exams (class_id);
create index idx_exam_questions_exam on public.exam_questions (exam_id);
create index idx_attempts_exam on public.attempts (exam_id);
create index idx_answers_attempt on public.answers (attempt_id);

-- -------------------------------------------------------------
-- Profil skapas automatiskt vid registrering
-- -------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, role, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'role', 'student'),
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -------------------------------------------------------------
-- Hjälpfunktioner för RLS
-- -------------------------------------------------------------

create or replace function public.current_role()
returns text
language sql stable security definer set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_class_teacher(p_class_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.classes
    where id = p_class_id and teacher_id = auth.uid()
  );
$$;

create or replace function public.is_class_member(p_class_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.class_members
    where class_id = p_class_id and student_id = auth.uid()
  );
$$;

create or replace function public.is_exam_teacher(p_exam_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.exams
    where id = p_exam_id and teacher_id = auth.uid()
  );
$$;

create or replace function public.owns_attempt(p_attempt_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.attempts
    where id = p_attempt_id and student_id = auth.uid()
  );
$$;

-- -------------------------------------------------------------
-- RLS-policyer
-- -------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.class_members enable row level security;
alter table public.invitations enable row level security;
alter table public.source_documents enable row level security;
alter table public.question_bank enable row level security;
alter table public.exams enable row level security;
alter table public.exam_questions enable row level security;
alter table public.attempts enable row level security;
alter table public.answers enable row level security;
alter table public.gradings enable row level security;

-- profiles: egen profil, samt lärare ser elever i sina klasser
create policy "profiles_select_own" on public.profiles
  for select using (id = auth.uid());

create policy "profiles_select_teacher_students" on public.profiles
  for select using (
    exists (
      select 1
      from public.class_members cm
      join public.classes c on c.id = cm.class_id
      where cm.student_id = profiles.id and c.teacher_id = auth.uid()
    )
  );

create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid());

-- classes
create policy "classes_teacher_all" on public.classes
  for all using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

create policy "classes_student_select" on public.classes
  for select using (public.is_class_member(id));

-- class_members
create policy "class_members_teacher_select" on public.class_members
  for select using (public.is_class_teacher(class_id));

create policy "class_members_teacher_delete" on public.class_members
  for delete using (public.is_class_teacher(class_id));

create policy "class_members_student_select" on public.class_members
  for select using (student_id = auth.uid());

-- invitations
create policy "invitations_teacher_all" on public.invitations
  for all using (public.is_class_teacher(class_id))
  with check (public.is_class_teacher(class_id));

-- source_documents
create policy "source_documents_teacher_all" on public.source_documents
  for all using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

-- question_bank: lärare ser egna frågor + delade seedfrågor (owner_id is null).
-- Elever har ingen direkt åtkomst – frågor hämtas via säkra RPC:er utan facit.
create policy "question_bank_teacher_select" on public.question_bank
  for select using (
    public.current_role() = 'teacher'
    and (owner_id is null or owner_id = auth.uid())
  );

create policy "question_bank_teacher_insert" on public.question_bank
  for insert with check (owner_id = auth.uid());

create policy "question_bank_teacher_update" on public.question_bank
  for update using (owner_id = auth.uid());

create policy "question_bank_teacher_delete" on public.question_bank
  for delete using (owner_id = auth.uid());

-- exams
create policy "exams_teacher_all" on public.exams
  for all using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

create policy "exams_student_select" on public.exams
  for select using (
    status <> 'utkast' and public.is_class_member(class_id)
  );

-- exam_questions: endast lärare direkt (elever via RPC utan facit)
create policy "exam_questions_teacher_all" on public.exam_questions
  for all using (public.is_exam_teacher(exam_id))
  with check (public.is_exam_teacher(exam_id));

-- attempts
create policy "attempts_student_insert" on public.attempts
  for insert with check (
    student_id = auth.uid()
    and exists (
      select 1 from public.exams e
      where e.id = exam_id
        and e.status = 'publicerat'
        and public.is_class_member(e.class_id)
        and (e.oppnar is null or e.oppnar <= now())
        and (e.stanger is null or e.stanger >= now())
    )
  );

create policy "attempts_student_select" on public.attempts
  for select using (student_id = auth.uid());

create policy "attempts_student_update" on public.attempts
  for update using (student_id = auth.uid())
  with check (student_id = auth.uid());

create policy "attempts_teacher_select" on public.attempts
  for select using (public.is_exam_teacher(exam_id));

-- answers: elev äger sina svar, kan bara ändra före inlämning
create policy "answers_student_insert" on public.answers
  for insert with check (
    public.owns_attempt(attempt_id)
    and exists (
      select 1 from public.attempts a
      where a.id = attempt_id and a.inlamnad is null
    )
  );

create policy "answers_student_select" on public.answers
  for select using (public.owns_attempt(attempt_id));

create policy "answers_student_update" on public.answers
  for update using (
    public.owns_attempt(attempt_id)
    and exists (
      select 1 from public.attempts a
      where a.id = attempt_id and a.inlamnad is null
    )
  );

create policy "answers_teacher_select" on public.answers
  for select using (
    exists (
      select 1 from public.attempts a
      where a.id = attempt_id and public.is_exam_teacher(a.exam_id)
    )
  );

-- gradings: endast lärare direkt (elever ser publicerade resultat via RPC)
create policy "gradings_teacher_all" on public.gradings
  for all using (
    exists (
      select 1
      from public.answers ans
      join public.attempts a on a.id = ans.attempt_id
      where ans.id = answer_id and public.is_exam_teacher(a.exam_id)
    )
  )
  with check (
    exists (
      select 1
      from public.answers ans
      join public.attempts a on a.id = ans.attempt_id
      where ans.id = answer_id and public.is_exam_teacher(a.exam_id)
    )
  );

-- -------------------------------------------------------------
-- RPC:er (security definer)
-- -------------------------------------------------------------

-- Elev går med i klass via klasskod
create or replace function public.join_class_with_code(p_code text)
returns table (class_id uuid, class_name text)
language plpgsql security definer set search_path = public
as $$
declare
  v_class public.classes%rowtype;
begin
  if public.current_role() <> 'student' then
    raise exception 'Endast elever kan gå med i klasser';
  end if;

  select * into v_class
  from public.classes
  where upper(class_code) = upper(trim(p_code));

  if not found then
    raise exception 'Ogiltig klasskod';
  end if;

  insert into public.class_members (class_id, student_id)
  values (v_class.id, auth.uid())
  on conflict do nothing;

  return query select v_class.id, v_class.name;
end;
$$;

-- Publik info om en inbjudan (visas på inbjudningssidan före inloggning)
create or replace function public.get_invitation_info(p_token text)
returns table (email text, class_name text, amne text, arskurs int, status text)
language sql stable security definer set search_path = public
as $$
  select i.email, c.name, c.amne, c.arskurs, i.status
  from public.invitations i
  join public.classes c on c.id = i.class_id
  where i.token = p_token;
$$;

-- Inloggad elev accepterar en inbjudan
create or replace function public.accept_invitation(p_token text)
returns table (class_id uuid, class_name text)
language plpgsql security definer set search_path = public
as $$
declare
  v_inv public.invitations%rowtype;
  v_class public.classes%rowtype;
begin
  if public.current_role() <> 'student' then
    raise exception 'Endast elever kan acceptera inbjudningar';
  end if;

  select * into v_inv from public.invitations where token = p_token;
  if not found then
    raise exception 'Ogiltig inbjudan';
  end if;

  select * into v_class from public.classes where id = v_inv.class_id;

  insert into public.class_members (class_id, student_id)
  values (v_inv.class_id, auth.uid())
  on conflict do nothing;

  update public.invitations set status = 'accepterad' where id = v_inv.id;

  return query select v_class.id, v_class.name;
end;
$$;

-- Elevens provfrågor – utan facit och bedömningsanvisning
create or replace function public.get_student_exam_questions(p_exam_id uuid)
returns table (
  exam_question_id uuid,
  ordning int,
  poang int,
  fragetyp text,
  fragetext text,
  alternativ jsonb
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
  select eq.id, eq.ordning, eq.poang, qb.fragetyp, qb.fragetext, qb.alternativ
  from public.exam_questions eq
  join public.question_bank qb on qb.id = eq.question_id
  where eq.exam_id = p_exam_id
  order by eq.ordning;
end;
$$;

-- Elevens resultat – endast när läraren publicerat rättningen (status = 'rattat')
create or replace function public.get_student_results(p_attempt_id uuid)
returns table (
  exam_question_id uuid,
  ordning int,
  max_poang int,
  fragetyp text,
  fragetext text,
  alternativ jsonb,
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

-- -------------------------------------------------------------
-- Storage: bucket för uppladdade NP-PDF:er
-- -------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('np-pdfs', 'np-pdfs', false)
on conflict (id) do nothing;

create policy "np_pdfs_teacher_insert" on storage.objects
  for insert with check (
    bucket_id = 'np-pdfs'
    and public.current_role() = 'teacher'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "np_pdfs_teacher_select" on storage.objects
  for select using (
    bucket_id = 'np-pdfs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "np_pdfs_teacher_delete" on storage.objects
  for delete using (
    bucket_id = 'np-pdfs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
