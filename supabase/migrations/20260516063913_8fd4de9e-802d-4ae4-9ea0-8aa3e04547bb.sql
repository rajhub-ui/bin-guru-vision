
-- disposal_proofs table
create table public.disposal_proofs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  detection_id uuid null,
  centre_id text not null,
  centre_name text not null,
  image_path text not null,
  eco_points_awarded integer not null default 25,
  created_at timestamptz not null default now()
);

alter table public.disposal_proofs enable row level security;

create policy "Users view own proofs" on public.disposal_proofs
  for select using (auth.uid() = user_id);
create policy "Users insert own proofs" on public.disposal_proofs
  for insert with check (auth.uid() = user_id);
create policy "Users update own proofs" on public.disposal_proofs
  for update using (auth.uid() = user_id);
create policy "Users delete own proofs" on public.disposal_proofs
  for delete using (auth.uid() = user_id);

create index idx_disposal_proofs_user on public.disposal_proofs(user_id, created_at desc);

-- Storage bucket (private)
insert into storage.buckets (id, name, public)
values ('disposal-proofs', 'disposal-proofs', false)
on conflict (id) do nothing;

-- Storage policies: users can manage objects under their own {uid}/ prefix
create policy "Users read own disposal proofs" on storage.objects
  for select using (
    bucket_id = 'disposal-proofs'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users upload own disposal proofs" on storage.objects
  for insert with check (
    bucket_id = 'disposal-proofs'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users update own disposal proofs" on storage.objects
  for update using (
    bucket_id = 'disposal-proofs'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users delete own disposal proofs" on storage.objects
  for delete using (
    bucket_id = 'disposal-proofs'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
