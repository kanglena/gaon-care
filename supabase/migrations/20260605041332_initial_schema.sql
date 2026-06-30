create table public.umbrellas (
  id text primary key,
  label text not null,
  qr_payload text not null unique,
  status text not null default 'available',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint umbrellas_status_check check (status in ('available', 'borrowed', 'lost', 'maintenance'))
);

create table public.rentals (
  id uuid primary key default gen_random_uuid(),
  umbrella_id text not null references public.umbrellas(id),
  student_id text not null,
  borrowed_at timestamptz not null default now(),
  returned_at timestamptz,
  created_at timestamptz not null default now(),
  constraint rentals_student_id_check check (student_id ~ '^[0-9]{5}$'),
  constraint rentals_returned_after_borrowed_check check (returned_at is null or returned_at >= borrowed_at)
);

create unique index rentals_one_active_per_umbrella
on public.rentals (umbrella_id)
where returned_at is null;

create index rentals_active_borrowed_at_idx
on public.rentals (borrowed_at)
where returned_at is null;

alter table public.umbrellas enable row level security;
alter table public.rentals enable row level security;

revoke all on table public.umbrellas from anon, authenticated, service_role;
revoke all on table public.rentals from anon, authenticated, service_role;

grant select on table public.umbrellas to authenticated;
grant select on table public.rentals to authenticated;

grant select, insert, update, delete on table public.umbrellas to service_role;
grant select, insert, update, delete on table public.rentals to service_role;

create policy "authenticated users can read umbrellas"
on public.umbrellas
for select
to authenticated
using (true);

create policy "authenticated users can read rentals"
on public.rentals
for select
to authenticated
using (true);

insert into public.umbrellas (id, label, qr_payload, status)
values
  ('UMB-001', '1번 우산', 'UMB-001', 'available'),
  ('UMB-002', '2번 우산', 'UMB-002', 'available'),
  ('UMB-003', '3번 우산', 'UMB-003', 'available');
