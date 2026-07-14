-- =============================================================
-- Google-inloggning: användare som skapas via OAuth har ingen
-- roll vald ännu och får välja roll vid första inloggningen.
-- Kör efter 0006_omdomen.sql.
-- =============================================================

alter table public.profiles
  add column if not exists onboarded boolean not null default true;

-- Uppdaterad profiltrigger: e-postregistrering skickar med roll i metadata
-- och blir klar direkt; OAuth-användare (Google) saknar roll och markeras
-- som ej onboardade tills de valt roll.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, role, name, email, onboarded)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'role', 'student'),
    coalesce(
      new.raw_user_meta_data ->> 'name',
      new.raw_user_meta_data ->> 'full_name',
      split_part(new.email, '@', 1)
    ),
    new.email,
    (new.raw_user_meta_data ->> 'role') is not null
  );
  return new;
end;
$$;

-- Engångsval av roll för OAuth-användare. Kan inte användas för att byta
-- roll senare: fungerar bara medan onboarded = false.
create or replace function public.complete_onboarding(p_role text, p_name text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if p_role not in ('teacher', 'student') then
    raise exception 'Ogiltig roll';
  end if;

  update public.profiles
  set role = p_role,
      name = coalesce(nullif(trim(p_name), ''), name),
      onboarded = true
  where id = auth.uid()
    and onboarded = false;

  if not found then
    raise exception 'Kontot är redan klart';
  end if;
end;
$$;
