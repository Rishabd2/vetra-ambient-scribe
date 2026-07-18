create table if not exists public.vetra_patient_memory (
  id uuid primary key default gen_random_uuid(),
  memory_key text not null unique,
  phone text,
  owner_name text,
  pet_name text not null,
  pet_species text,
  pet_breed text,
  pet_age text,
  prior_issue text,
  last_summary text,
  open_followups text,
  due_care jsonb not null default '[]'::jsonb,
  appointments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists vetra_patient_memory_phone_idx
  on public.vetra_patient_memory (phone);

create index if not exists vetra_patient_memory_owner_idx
  on public.vetra_patient_memory (owner_name);

create index if not exists vetra_patient_memory_pet_idx
  on public.vetra_patient_memory (pet_name);

alter table public.vetra_patient_memory enable row level security;

drop policy if exists "vetra_patient_memory_read" on public.vetra_patient_memory;
drop policy if exists "vetra_patient_memory_insert" on public.vetra_patient_memory;
drop policy if exists "vetra_patient_memory_update" on public.vetra_patient_memory;

create policy "vetra_patient_memory_read"
  on public.vetra_patient_memory
  for select
  to anon
  using (true);

create policy "vetra_patient_memory_insert"
  on public.vetra_patient_memory
  for insert
  to anon
  with check (true);

create policy "vetra_patient_memory_update"
  on public.vetra_patient_memory
  for update
  to anon
  using (true)
  with check (true);
