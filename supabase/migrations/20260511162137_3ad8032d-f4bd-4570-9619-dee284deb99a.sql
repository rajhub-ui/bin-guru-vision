
-- ENUMS
create type public.app_role as enum ('admin', 'user');
create type public.waste_class as enum ('plastic','paper','metal','glass','organic','ewaste');
create type public.detection_source as enum ('image','live','video','pdf');

-- PROFILES
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  eco_score integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "Users view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users insert own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "Users update own profile" on public.profiles for update using (auth.uid() = id);

-- USER ROLES
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role);
$$;

create policy "Users view own roles" on public.user_roles for select using (auth.uid() = user_id);
create policy "Admins view all roles" on public.user_roles for select using (public.has_role(auth.uid(), 'admin'));

-- DETECTIONS
create table public.detections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source detection_source not null,
  predicted_class waste_class not null,
  confidence real not null,
  image_path text,
  carbon_grams real not null default 0,
  created_at timestamptz not null default now()
);
alter table public.detections enable row level security;
create index detections_user_created_idx on public.detections (user_id, created_at desc);

create policy "Users view own detections" on public.detections for select using (auth.uid() = user_id);
create policy "Users insert own detections" on public.detections for insert with check (auth.uid() = user_id);
create policy "Users delete own detections" on public.detections for delete using (auth.uid() = user_id);

-- CHAT MESSAGES
create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  created_at timestamptz not null default now()
);
alter table public.chat_messages enable row level security;
create index chat_messages_user_created_idx on public.chat_messages (user_id, created_at);

create policy "Users view own messages" on public.chat_messages for select using (auth.uid() = user_id);
create policy "Users insert own messages" on public.chat_messages for insert with check (auth.uid() = user_id);
create policy "Users delete own messages" on public.chat_messages for delete using (auth.uid() = user_id);

-- BADGES
create table public.badges (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null,
  icon text not null,
  threshold integer not null default 0
);
alter table public.badges enable row level security;
create policy "Anyone authed reads badges" on public.badges for select to authenticated using (true);

create table public.user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_id uuid not null references public.badges(id) on delete cascade,
  earned_at timestamptz not null default now(),
  unique (user_id, badge_id)
);
alter table public.user_badges enable row level security;
create policy "Users view own badges" on public.user_badges for select using (auth.uid() = user_id);
create policy "Users insert own badges" on public.user_badges for insert with check (auth.uid() = user_id);

-- Seed badges
insert into public.badges (slug,name,description,icon,threshold) values
  ('first_scan','First Scan','You logged your first waste detection.','sparkles',1),
  ('eco_novice','Eco Novice','Reach 10 detections.','leaf',10),
  ('eco_hero','Eco Hero','Reach 50 detections.','trophy',50),
  ('recycler','Recycler','Detect 5 recyclable items.','recycle',5);

-- AUTOCREATE PROFILE
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at trigger
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- STORAGE BUCKET
insert into storage.buckets (id, name, public) values ('scans','scans', false)
on conflict (id) do nothing;

create policy "Users read own scans" on storage.objects for select
  using (bucket_id = 'scans' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Users upload own scans" on storage.objects for insert
  with check (bucket_id = 'scans' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Users delete own scans" on storage.objects for delete
  using (bucket_id = 'scans' and auth.uid()::text = (storage.foldername(name))[1]);
