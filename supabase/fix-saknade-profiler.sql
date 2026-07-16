supabase/fix-saknade-profiler.sql
-- Kör EFTER setup.sql om användare registrerats innan databasen fanns.
-- Skapar profiler för alla auth-användare som saknar rad i public.profiles.

insert into public.profiles (id, role, name, email, onboarded)
select
  u.id,
  coalesce(u.raw_user_meta_data ->> 'role', 'teacher'),
  coalesce(
    u.raw_user_meta_data ->> 'name',
    u.raw_user_meta_data ->> 'full_name',
    split_part(u.email, '@', 1)
  ),
  u.email,
  (u.raw_user_meta_data ->> 'role') is not null
from auth.users u
where not exists (
  select 1 from public.profiles p where p.id = u.id
);
