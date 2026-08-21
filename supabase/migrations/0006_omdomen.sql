-- =============================================================
-- Omdömesunderlag: AI-genererade utkast per elev och klass som
-- läraren redigerar och sparar. Endast läraren ser dem.
-- Kör efter 0005_amneslag.sql.
-- =============================================================

create table if not exists public.student_reports (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  innehall text not null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (class_id, student_id)
);

create index if not exists idx_student_reports_class
  on public.student_reports (class_id);

alter table public.student_reports enable row level security;

-- Endast klassens lärare – eleverna ser aldrig underlagen.
create policy "student_reports_teacher_all" on public.student_reports
  for all using (public.is_class_teacher(class_id))
  with check (public.is_class_teacher(class_id));
