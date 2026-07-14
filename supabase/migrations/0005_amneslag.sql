-- =============================================================
-- Ämneslag/skola: lärare kan gå ihop i ett ämneslag och dela
-- frågor med varandra i frågebanken.
-- Kör efter 0004_flikbyte.sql.
-- =============================================================

-- -------------------------------------------------------------
-- Tabeller och kolumner
-- -------------------------------------------------------------

create table public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  school_code text not null unique
    default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  created_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists school_id uuid
  references public.schools (id) on delete set null;

alter table public.question_bank
  add column if not exists delad boolean not null default false;

create index if not exists idx_profiles_school on public.profiles (school_id);

-- -------------------------------------------------------------
-- Hjälpfunktion: är användaren i samma ämneslag som p_user_id?
-- -------------------------------------------------------------

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
-- RLS
-- -------------------------------------------------------------

alter table public.schools enable row level security;

create policy "schools_member_select" on public.schools
  for select using (
    id = (select school_id from public.profiles where id = auth.uid())
  );

-- Lärare ser kollegor i samma ämneslag (behövs för "Delad av <namn>").
create policy "profiles_select_same_school_teachers" on public.profiles
  for select using (
    role = 'teacher'
    and public.current_role() = 'teacher'
    and public.same_school(id)
  );

-- Frågebank: egna frågor + seedfrågor + delade frågor från ämneslaget.
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

-- -------------------------------------------------------------
-- RPC:er
-- -------------------------------------------------------------

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
