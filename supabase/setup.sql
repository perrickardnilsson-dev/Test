-- =============================================================
-- NO-lärarplattform – KOMPLETT SETUP I ETT SVEP
--
-- Klistra in hela den här filen i Supabase SQL Editor och kör.
-- Den motsvarar migrationerna 0001–0005 + seed-data och är säker
-- att köra flera gånger (även om du redan kört äldre migrationer):
-- allt skapas med "if not exists" / "create or replace".
-- =============================================================

-- -------------------------------------------------------------
-- 1. Tabeller
-- -------------------------------------------------------------

create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  school_code text not null unique
    default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('teacher', 'student')),
  name text not null,
  email text not null,
  school_id uuid references public.schools (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  amne text not null check (amne in ('biologi', 'fysik', 'kemi', 'teknik')),
  arskurs int not null check (arskurs between 7 and 9),
  class_code text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.class_members (
  class_id uuid not null references public.classes (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (class_id, student_id)
);

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  email text not null,
  token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  status text not null default 'vantar' check (status in ('vantar', 'accepterad')),
  created_at timestamptz not null default now()
);

create table if not exists public.source_documents (
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

create table if not exists public.question_bank (
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
  bild_url text,
  delad boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.exams (
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
  slumpa_fragor boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.exam_questions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams (id) on delete cascade,
  question_id uuid not null references public.question_bank (id) on delete restrict,
  ordning int not null,
  poang int not null default 1 check (poang > 0),
  unique (exam_id, question_id)
);

create table if not exists public.attempts (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  startad timestamptz not null default now(),
  inlamnad timestamptz,
  extra_minuter int not null default 0 check (extra_minuter >= 0),
  fokus_tapp int not null default 0 check (fokus_tapp >= 0),
  unique (exam_id, student_id)
);

create table if not exists public.answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.attempts (id) on delete cascade,
  exam_question_id uuid not null references public.exam_questions (id) on delete cascade,
  svar jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (attempt_id, exam_question_id)
);

create table if not exists public.gradings (
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

-- Kolumner som tillkommit i senare versioner – läggs till om databasen
-- skapades med en äldre version av schemat.
alter table public.profiles
  add column if not exists school_id uuid references public.schools (id) on delete set null;
alter table public.question_bank add column if not exists bild_url text;
alter table public.question_bank add column if not exists delad boolean not null default false;
alter table public.exams add column if not exists slumpa_fragor boolean not null default false;
alter table public.attempts
  add column if not exists extra_minuter int not null default 0 check (extra_minuter >= 0);
alter table public.attempts
  add column if not exists fokus_tapp int not null default 0 check (fokus_tapp >= 0);

create index if not exists idx_classes_teacher on public.classes (teacher_id);
create index if not exists idx_class_members_student on public.class_members (student_id);
create index if not exists idx_question_bank_owner on public.question_bank (owner_id);
create index if not exists idx_question_bank_amne on public.question_bank (amne, arskurs);
create index if not exists idx_exams_class on public.exams (class_id);
create index if not exists idx_exam_questions_exam on public.exam_questions (exam_id);
create index if not exists idx_attempts_exam on public.attempts (exam_id);
create index if not exists idx_answers_attempt on public.answers (attempt_id);
create index if not exists idx_profiles_school on public.profiles (school_id);

-- -------------------------------------------------------------
-- 2. Profil skapas automatiskt vid registrering
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -------------------------------------------------------------
-- 3. Hjälpfunktioner för RLS
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

create or replace function public.same_school(p_user_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.profiles me
    join public.profiles other on other.id = p_user_id
    where me.id = auth.uid()
      and me.school_id is not null
      and me.school_id = other.school_id
  );
$$;

-- -------------------------------------------------------------
-- 4. RLS-policyer
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
alter table public.schools enable row level security;

-- profiles
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (id = auth.uid());

drop policy if exists "profiles_select_teacher_students" on public.profiles;
create policy "profiles_select_teacher_students" on public.profiles
  for select using (
    exists (
      select 1
      from public.class_members cm
      join public.classes c on c.id = cm.class_id
      where cm.student_id = profiles.id and c.teacher_id = auth.uid()
    )
  );

drop policy if exists "profiles_select_same_school_teachers" on public.profiles;
create policy "profiles_select_same_school_teachers" on public.profiles
  for select using (
    role = 'teacher'
    and public.current_role() = 'teacher'
    and public.same_school(id)
  );

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid());

-- schools
drop policy if exists "schools_member_select" on public.schools;
create policy "schools_member_select" on public.schools
  for select using (
    id = (select school_id from public.profiles where id = auth.uid())
  );

-- classes
drop policy if exists "classes_teacher_all" on public.classes;
create policy "classes_teacher_all" on public.classes
  for all using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

drop policy if exists "classes_student_select" on public.classes;
create policy "classes_student_select" on public.classes
  for select using (public.is_class_member(id));

-- class_members
drop policy if exists "class_members_teacher_select" on public.class_members;
create policy "class_members_teacher_select" on public.class_members
  for select using (public.is_class_teacher(class_id));

drop policy if exists "class_members_teacher_delete" on public.class_members;
create policy "class_members_teacher_delete" on public.class_members
  for delete using (public.is_class_teacher(class_id));

drop policy if exists "class_members_student_select" on public.class_members;
create policy "class_members_student_select" on public.class_members
  for select using (student_id = auth.uid());

-- invitations
drop policy if exists "invitations_teacher_all" on public.invitations;
create policy "invitations_teacher_all" on public.invitations
  for all using (public.is_class_teacher(class_id))
  with check (public.is_class_teacher(class_id));

-- source_documents
drop policy if exists "source_documents_teacher_all" on public.source_documents;
create policy "source_documents_teacher_all" on public.source_documents
  for all using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

-- question_bank: egna frågor + seedfrågor + delade frågor från ämneslaget.
-- Elever har ingen direkt åtkomst – frågor hämtas via säkra RPC:er utan facit.
drop policy if exists "question_bank_teacher_select" on public.question_bank;
create policy "question_bank_teacher_select" on public.question_bank
  for select using (
    public.current_role() = 'teacher'
    and (
      owner_id is null
      or owner_id = auth.uid()
      or (delad and public.same_school(owner_id))
    )
  );

drop policy if exists "question_bank_teacher_insert" on public.question_bank;
create policy "question_bank_teacher_insert" on public.question_bank
  for insert with check (owner_id = auth.uid());

drop policy if exists "question_bank_teacher_update" on public.question_bank;
create policy "question_bank_teacher_update" on public.question_bank
  for update using (owner_id = auth.uid());

drop policy if exists "question_bank_teacher_delete" on public.question_bank;
create policy "question_bank_teacher_delete" on public.question_bank
  for delete using (owner_id = auth.uid());

-- exams
drop policy if exists "exams_teacher_all" on public.exams;
create policy "exams_teacher_all" on public.exams
  for all using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

drop policy if exists "exams_student_select" on public.exams;
create policy "exams_student_select" on public.exams
  for select using (
    status <> 'utkast' and public.is_class_member(class_id)
  );

-- exam_questions: endast lärare direkt (elever via RPC utan facit)
drop policy if exists "exam_questions_teacher_all" on public.exam_questions;
create policy "exam_questions_teacher_all" on public.exam_questions
  for all using (public.is_exam_teacher(exam_id))
  with check (public.is_exam_teacher(exam_id));

-- attempts
drop policy if exists "attempts_student_insert" on public.attempts;
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

drop policy if exists "attempts_student_select" on public.attempts;
create policy "attempts_student_select" on public.attempts
  for select using (student_id = auth.uid());

drop policy if exists "attempts_student_update" on public.attempts;
create policy "attempts_student_update" on public.attempts
  for update using (student_id = auth.uid())
  with check (student_id = auth.uid());

drop policy if exists "attempts_teacher_select" on public.attempts;
create policy "attempts_teacher_select" on public.attempts
  for select using (public.is_exam_teacher(exam_id));

drop policy if exists "attempts_teacher_update" on public.attempts;
create policy "attempts_teacher_update" on public.attempts
  for update using (public.is_exam_teacher(exam_id))
  with check (public.is_exam_teacher(exam_id));

-- answers: elev äger sina svar, kan bara ändra före inlämning
drop policy if exists "answers_student_insert" on public.answers;
create policy "answers_student_insert" on public.answers
  for insert with check (
    public.owns_attempt(attempt_id)
    and exists (
      select 1 from public.attempts a
      where a.id = attempt_id and a.inlamnad is null
    )
  );

drop policy if exists "answers_student_select" on public.answers;
create policy "answers_student_select" on public.answers
  for select using (public.owns_attempt(attempt_id));

drop policy if exists "answers_student_update" on public.answers;
create policy "answers_student_update" on public.answers
  for update using (
    public.owns_attempt(attempt_id)
    and exists (
      select 1 from public.attempts a
      where a.id = attempt_id and a.inlamnad is null
    )
  );

drop policy if exists "answers_teacher_select" on public.answers;
create policy "answers_teacher_select" on public.answers
  for select using (
    exists (
      select 1 from public.attempts a
      where a.id = attempt_id and public.is_exam_teacher(a.exam_id)
    )
  );

-- gradings: endast lärare direkt (elever ser publicerade resultat via RPC)
drop policy if exists "gradings_teacher_all" on public.gradings;
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
-- 5. RPC:er (security definer)
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

-- Elevens resultat – endast när läraren publicerat rättningen (status = 'rattat')
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

-- Eleven rapporterar själv att provfliken lämnats (anti-fusk).
-- Räknaren kan bara ökas, och bara på ett eget, ej inlämnat försök.
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

-- Lärare skapar ett ämneslag och blir medlem direkt.
create or replace function public.create_school(p_name text)
returns table (school_id uuid, school_name text, school_code text)
language plpgsql security definer set search_path = public
as $$
declare
  v_school public.schools%rowtype;
begin
  if public.current_role() <> 'teacher' then
    raise exception 'Endast lärare kan skapa ämneslag';
  end if;
  if trim(coalesce(p_name, '')) = '' then
    raise exception 'Ange ett namn på ämneslaget';
  end if;

  insert into public.schools (name) values (trim(p_name))
  returning * into v_school;

  update public.profiles set school_id = v_school.id where id = auth.uid();

  return query select v_school.id, v_school.name, v_school.school_code;
end;
$$;

-- Lärare går med i ett ämneslag via kod.
create or replace function public.join_school_with_code(p_code text)
returns table (school_id uuid, school_name text)
language plpgsql security definer set search_path = public
as $$
declare
  v_school public.schools%rowtype;
begin
  if public.current_role() <> 'teacher' then
    raise exception 'Endast lärare kan gå med i ämneslag';
  end if;

  select * into v_school
  from public.schools
  where upper(school_code) = upper(trim(p_code));

  if not found then
    raise exception 'Ogiltig kod';
  end if;

  update public.profiles set school_id = v_school.id where id = auth.uid();

  return query select v_school.id, v_school.name;
end;
$$;

-- Lärare lämnar sitt ämneslag. Delade frågor slutar delas automatiskt
-- eftersom RLS-kontrollen utgår från nuvarande medlemskap.
create or replace function public.leave_school()
returns void
language plpgsql security definer set search_path = public
as $$
begin
  update public.profiles set school_id = null where id = auth.uid();
end;
$$;

-- Kollegor i samma ämneslag.
create or replace function public.get_school_members()
returns table (id uuid, name text, email text)
language sql stable security definer set search_path = public
as $$
  select p.id, p.name, p.email
  from public.profiles p
  where p.role = 'teacher'
    and p.school_id is not null
    and p.school_id = (select school_id from public.profiles where id = auth.uid())
  order by p.name;
$$;

-- -------------------------------------------------------------
-- 6. Storage: buckets och policyer
-- -------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('np-pdfs', 'np-pdfs', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('question-images', 'question-images', true)
on conflict (id) do nothing;

drop policy if exists "np_pdfs_teacher_insert" on storage.objects;
create policy "np_pdfs_teacher_insert" on storage.objects
  for insert with check (
    bucket_id = 'np-pdfs'
    and public.current_role() = 'teacher'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "np_pdfs_teacher_select" on storage.objects;
create policy "np_pdfs_teacher_select" on storage.objects
  for select using (
    bucket_id = 'np-pdfs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "np_pdfs_teacher_delete" on storage.objects;
create policy "np_pdfs_teacher_delete" on storage.objects
  for delete using (
    bucket_id = 'np-pdfs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "question_images_teacher_insert" on storage.objects;
create policy "question_images_teacher_insert" on storage.objects
  for insert with check (
    bucket_id = 'question-images'
    and public.current_role() = 'teacher'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "question_images_public_select" on storage.objects;
create policy "question_images_public_select" on storage.objects
  for select using (bucket_id = 'question-images');

drop policy if exists "question_images_teacher_delete" on storage.objects;
create policy "question_images_teacher_delete" on storage.objects
  for delete using (
    bucket_id = 'question-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- -------------------------------------------------------------
-- 7. Seed-data: exempelfrågor i alla fyra ämnen
--    Läggs bara in om det inte redan finns seedfrågor,
--    så att omkörning inte skapar dubbletter.
-- -------------------------------------------------------------

insert into public.question_bank
  (owner_id, amne, arskurs, centralt_innehall, fragetyp, fragetext,
   alternativ, facit, bedomningsanvisning, niva, kalla, poang)
select * from (values

-- ---------------- BIOLOGI ----------------
(null::uuid, 'biologi', 9, 'Evolutionens mekanismer och organismers utveckling',
 'flerval_ett',
 'Vilken av följande är den viktigaste drivkraften bakom evolutionen enligt Darwins teori?',
 '["Naturligt urval", "Slumpmässiga miljöförändringar", "Att organismer anstränger sig för att utvecklas", "Att alla individer i en art förändras samtidigt"]'::jsonb,
 '{"typ": "flerval_ett", "korrekt_index": 0}'::jsonb,
 null, 'E', 'egen', 1),

(null, 'biologi', 8, 'Ekosystem och ekologiska samband',
 'flerval_flera',
 'Vilka av följande är exempel på abiotiska faktorer i ett ekosystem? Välj alla som stämmer.',
 '["Solljus", "Nedbrytare", "Vattentillgång", "Temperatur", "Växtätare"]'::jsonb,
 '{"typ": "flerval_flera", "korrekta_index": [0, 2, 3]}'::jsonb,
 null, 'E', 'egen', 2),

(null, 'biologi', 9, 'Arvsmassans uppbyggnad och genteknik',
 'kortsvar',
 'Vad kallas den molekyl som bär den genetiska informationen i våra celler?',
 null,
 '{"typ": "kortsvar", "godkanda_svar": ["DNA", "dna", "deoxiribonukleinsyra"]}'::jsonb,
 'Godkänt svar är DNA (deoxiribonukleinsyra).',
 'E', 'egen', 1),

(null, 'biologi', 9, 'Biologisk mångfald och hållbar utveckling',
 'fritext',
 'Förklara hur minskad biologisk mångfald kan påverka ett ekosystems förmåga att stå emot förändringar. Ge exempel i ditt resonemang.',
 null,
 '{"typ": "fritext", "exempelsvar": "Ett ekosystem med hög biologisk mångfald har fler arter som kan fylla liknande funktioner. Om en art försvinner kan andra ta över dess roll, vilket gör systemet motståndskraftigt. Vid låg mångfald blir ekosystemet känsligare, t.ex. om en pollinatör försvinner och inga andra kan pollinera växterna."}'::jsonb,
 'E: Eleven ger ett enkelt samband mellan mångfald och stabilitet. C: Eleven förklarar sambandet med relevant exempel och begreppet motståndskraft. A: Eleven resonerar nyanserat med flera exempel och kopplar till funktioner/nischer i ekosystemet.',
 'C', 'egen', 4),

-- ---------------- FYSIK ----------------
(null, 'fysik', 8, 'Krafter, rörelse och rörelseförändringar',
 'flerval_ett',
 'En bil kör med konstant hastighet på en rak väg. Vad gäller för de krafter som verkar på bilen?',
 '["Den resulterande kraften är noll", "Framåtkraften är större än friktionen", "Det verkar inga krafter alls på bilen", "Tyngdkraften är större än normalkraften"]'::jsonb,
 '{"typ": "flerval_ett", "korrekt_index": 0}'::jsonb,
 null, 'C', 'egen', 1),

(null, 'fysik', 9, 'Energiformer, energiomvandlingar och energikvalitet',
 'kortsvar',
 'Vilken enhet mäts energi i enligt SI-systemet?',
 null,
 '{"typ": "kortsvar", "godkanda_svar": ["joule", "J", "Joule"]}'::jsonb,
 'Godkänt svar är joule (J).',
 'E', 'egen', 1),

(null, 'fysik', 8, 'Elektricitet och magnetism',
 'flerval_flera',
 'Vilka av följande material leder elektrisk ström bra? Välj alla som stämmer.',
 '["Koppar", "Glas", "Aluminium", "Gummi", "Silver"]'::jsonb,
 '{"typ": "flerval_flera", "korrekta_index": [0, 2, 4]}'::jsonb,
 null, 'E', 'egen', 2),

(null, 'fysik', 9, 'Energiformer, energiomvandlingar och energikvalitet',
 'fritext',
 'Beskriv energiomvandlingarna som sker när du åker rutschkana från toppen till botten. Använd begreppen lägesenergi och rörelseenergi.',
 null,
 '{"typ": "fritext", "exempelsvar": "På toppen har du hög lägesenergi och låg rörelseenergi. När du åker nedåt omvandlas lägesenergin till rörelseenergi, så farten ökar. En del energi omvandlas också till värme på grund av friktion mellan kroppen och rutschkanan."}'::jsonb,
 'E: Eleven nämner att lägesenergi omvandlas till rörelseenergi. C: Eleven beskriver omvandlingen tydligt och kopplar till fartökningen. A: Eleven inkluderar även friktion/värme och resonerar om energins bevarande.',
 'C', 'egen', 4),

-- ---------------- KEMI ----------------
(null, 'kemi', 8, 'Materiens uppbyggnad: atomer, molekyler och joner',
 'flerval_ett',
 'Hur många protoner har en syreatom (O), som har atomnummer 8?',
 '["6", "8", "16", "2"]'::jsonb,
 '{"typ": "flerval_ett", "korrekt_index": 1}'::jsonb,
 null, 'E', 'egen', 1),

(null, 'kemi', 9, 'Syror, baser och pH',
 'flerval_ett',
 'Vilket pH-värde har en neutral lösning vid rumstemperatur?',
 '["0", "7", "14", "1"]'::jsonb,
 '{"typ": "flerval_ett", "korrekt_index": 1}'::jsonb,
 null, 'E', 'egen', 1),

(null, 'kemi', 9, 'Kemiska reaktioner och reaktionsformler',
 'kortsvar',
 'Vad bildas när ett ämne reagerar med syre vid en förbränning? Ange den generella typen av ämne.',
 null,
 '{"typ": "kortsvar", "godkanda_svar": ["oxider", "oxid", "en oxid", "metalloxider"]}'::jsonb,
 'Godkänt svar beskriver att det bildas oxider.',
 'C', 'egen', 1),

(null, 'kemi', 9, 'Kemin i vardagen och samhället: material och kretslopp',
 'fritext',
 'Förklara varför det är viktigt att sortera och återvinna metaller. Resonera om både resurser och miljö.',
 null,
 '{"typ": "fritext", "exempelsvar": "Metaller är en ändlig resurs som bryts ur malm. Genom att återvinna sparar vi råvaror och behöver bryta mindre malm, vilket minskar miljöpåverkan. Att smälta om återvunnen metall kräver dessutom mindre energi än att framställa ny metall, vilket minskar utsläppen."}'::jsonb,
 'E: Eleven nämner att metaller är en begränsad resurs eller att återvinning sparar råvaror. C: Eleven kopplar återvinning till både resurser och energi/miljö. A: Eleven resonerar utvecklat om kretslopp, energiåtgång och långsiktig hållbarhet.',
 'C', 'egen', 4),

-- ---------------- TEKNIK ----------------
(null, 'teknik', 7, 'Mekanismer, hållfasta och stabila konstruktioner',
 'flerval_ett',
 'Vilken geometrisk form ger störst stabilitet i en konstruktion, t.ex. i en bro eller en byggnadsställning?',
 '["Fyrkanten", "Triangeln", "Cirkeln", "Rektangeln"]'::jsonb,
 '{"typ": "flerval_ett", "korrekt_index": 1}'::jsonb,
 null, 'E', 'egen', 1),

(null, 'teknik', 8, 'Tekniska system och deras komponenter',
 'flerval_flera',
 'Vilka av följande är exempel på tekniska system i ett samhälle? Välj alla som stämmer.',
 '["Elnätet", "Vattenreningssystemet", "En regnbåge", "Vägnätet", "Solsystemet"]'::jsonb,
 '{"typ": "flerval_flera", "korrekta_index": [0, 1, 3]}'::jsonb,
 null, 'E', 'egen', 2),

(null, 'teknik', 9, 'Styrning och reglering med programmering',
 'kortsvar',
 'Vad kallas en komponent som känner av något i omgivningen, t.ex. temperatur eller ljus, och skickar en signal till ett tekniskt system?',
 null,
 '{"typ": "kortsvar", "godkanda_svar": ["sensor", "givare", "en sensor", "en givare"]}'::jsonb,
 'Godkänt svar är sensor eller givare.',
 'C', 'egen', 1),

(null, 'teknik', 9, 'Teknikens konsekvenser för individ, samhälle och miljö',
 'fritext',
 'Diskutera fördelar och nackdelar med ökad automatisering och robotisering i arbetslivet. Väg olika perspektiv mot varandra.',
 null,
 '{"typ": "fritext", "exempelsvar": "Fördelar är att robotar kan utföra tunga, farliga eller repetitiva arbeten, öka produktiviteten och sänka priser. Nackdelar är att jobb kan försvinna och att människor behöver omskolas. Ur ett miljöperspektiv kan tillverkning av robotar kräva resurser, men de kan också effektivisera och minska svinn."}'::jsonb,
 'E: Eleven ger minst en fördel och en nackdel. C: Eleven väger fördelar och nackdelar mot varandra med exempel. A: Eleven resonerar nyanserat ur flera perspektiv (individ, samhälle, miljö) och drar en underbyggd slutsats.',
 'A', 'egen', 4)

) as seed(owner_id, amne, arskurs, centralt_innehall, fragetyp, fragetext,
          alternativ, facit, bedomningsanvisning, niva, kalla, poang)
where not exists (
  select 1 from public.question_bank where owner_id is null
);

-- Klart! Kontrollera gärna under Database → Tables att tabellerna finns.
