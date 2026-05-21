
-- 1. Profiles: extend
alter table public.profiles
  add column if not exists preferred_name text,
  add column if not exists gender text,
  add column if not exists date_of_birth date,
  add column if not exists nationality text,
  add column if not exists languages_spoken jsonb not null default '[]'::jsonb,
  add column if not exists primary_language text,
  add column if not exists willing_to_relocate boolean not null default false,
  add column if not exists remote_available boolean not null default true,
  add column if not exists bio text,
  add column if not exists dream_career text,
  add column if not exists industries jsonb not null default '[]'::jsonb,
  add column if not exists causes jsonb not null default '[]'::jsonb,
  add column if not exists future_vision text,
  add column if not exists social_links jsonb not null default '{}'::jsonb,
  add column if not exists cv_url text,
  add column if not exists video_intro_url text,
  add column if not exists visibility text not null default 'public',
  add column if not exists verifications jsonb not null default '{}'::jsonb,
  add column if not exists readiness jsonb not null default '{}'::jsonb,
  add column if not exists personality_insights jsonb not null default '{}'::jsonb;

-- Allow public viewing when visibility = public
drop policy if exists "public profiles viewable" on public.profiles;
create policy "public profiles viewable" on public.profiles
  for select using (visibility = 'public' or auth.uid() = id or is_admin(auth.uid()));

-- 2. Education
create table if not exists public.education (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  degree text,
  field text,
  institution text not null,
  country text,
  start_date date,
  end_date date,
  is_current boolean not null default false,
  achievements text,
  document_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.education enable row level security;
create policy "owners manage education" on public.education for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "public education viewable" on public.education for select
  using (exists (select 1 from public.profiles p where p.id = user_id and (p.visibility = 'public' or auth.uid() = p.id or is_admin(auth.uid()))));
create trigger trg_education_updated before update on public.education for each row execute function public.set_updated_at();

-- 3. Certifications
create table if not exists public.certifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  issuer text,
  issue_date date,
  expires_at date,
  credential_url text,
  document_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.certifications enable row level security;
create policy "owners manage certifications" on public.certifications for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "public certifications viewable" on public.certifications for select
  using (exists (select 1 from public.profiles p where p.id = user_id and (p.visibility = 'public' or auth.uid() = p.id or is_admin(auth.uid()))));
create trigger trg_certs_updated before update on public.certifications for each row execute function public.set_updated_at();

-- 4. Experiences
create table if not exists public.experiences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null,
  organization text,
  sector text,
  kind text not null default 'job',
  start_date date,
  end_date date,
  is_current boolean not null default false,
  description text,
  achievements text,
  skills_used jsonb not null default '[]'::jsonb,
  team_size integer,
  impact text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.experiences enable row level security;
create policy "owners manage experiences" on public.experiences for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "public experiences viewable" on public.experiences for select
  using (exists (select 1 from public.profiles p where p.id = user_id and (p.visibility = 'public' or auth.uid() = p.id or is_admin(auth.uid()))));
create trigger trg_exp_updated before update on public.experiences for each row execute function public.set_updated_at();

-- 5. Skills v2
create table if not exists public.skills_v2 (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text not null default 'digital',
  level integer not null default 1 check (level between 1 and 4),
  self_rated boolean not null default true,
  validations jsonb not null default '{"peer":0,"mentor":0,"org":0,"ai":0}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);
alter table public.skills_v2 enable row level security;
create policy "owners manage skills_v2" on public.skills_v2 for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "public skills_v2 viewable" on public.skills_v2 for select
  using (exists (select 1 from public.profiles p where p.id = user_id and (p.visibility = 'public' or auth.uid() = p.id or is_admin(auth.uid()))));
create trigger trg_skv2_updated before update on public.skills_v2 for each row execute function public.set_updated_at();

-- 6. Portfolio items
create table if not exists public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'project',
  title text not null,
  description text,
  url text,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.portfolio_items enable row level security;
create policy "owners manage portfolio" on public.portfolio_items for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "public portfolio viewable" on public.portfolio_items for select
  using (exists (select 1 from public.profiles p where p.id = user_id and (p.visibility = 'public' or auth.uid() = p.id or is_admin(auth.uid()))));
create trigger trg_port_updated before update on public.portfolio_items for each row execute function public.set_updated_at();

-- 7. Endorsements
create table if not exists public.endorsements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endorser_id uuid not null references auth.users(id) on delete cascade,
  skill_id uuid references public.skills_v2(id) on delete cascade,
  kind text not null default 'peer',
  note text,
  created_at timestamptz not null default now()
);
alter table public.endorsements enable row level security;
create policy "endorsers create" on public.endorsements for insert
  with check (auth.uid() = endorser_id and auth.uid() <> user_id);
create policy "target or endorser view" on public.endorsements for select
  using (auth.uid() = user_id or auth.uid() = endorser_id or is_admin(auth.uid()));
create policy "endorser delete own" on public.endorsements for delete
  using (auth.uid() = endorser_id);

-- 8. Storage buckets
insert into storage.buckets (id, name, public) values ('profile-photos','profile-photos', true)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('profile-documents','profile-documents', false)
  on conflict (id) do nothing;

-- profile-photos policies
create policy "photos public read" on storage.objects for select
  using (bucket_id = 'profile-photos');
create policy "photos owner write" on storage.objects for insert
  with check (bucket_id = 'profile-photos' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "photos owner update" on storage.objects for update
  using (bucket_id = 'profile-photos' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "photos owner delete" on storage.objects for delete
  using (bucket_id = 'profile-photos' and auth.uid()::text = (storage.foldername(name))[1]);

-- profile-documents policies
create policy "docs owner read" on storage.objects for select
  using (bucket_id = 'profile-documents' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "docs owner write" on storage.objects for insert
  with check (bucket_id = 'profile-documents' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "docs owner update" on storage.objects for update
  using (bucket_id = 'profile-documents' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "docs owner delete" on storage.objects for delete
  using (bucket_id = 'profile-documents' and auth.uid()::text = (storage.foldername(name))[1]);

-- 9. New gamification badges
insert into public.badges (id, name_fr, name_en, description_fr, description_en, icon, xp_reward) values
  ('profile_starter','Profil Démarré','Profile Starter','Profil rempli à 40%','Profile 40% complete','🌱',50),
  ('opportunity_ready','Prêt·e pour les Opportunités','Opportunity Ready','Profil rempli à 70%','Profile 70% complete','🚀',150),
  ('verified_talent','Talent Vérifié','Verified Talent','Au moins une vérification','At least one verification','✅',200),
  ('top_emerging_leader','Leader Émergent','Top Emerging Leader','3+ expériences de leadership','3+ leadership experiences','👑',250),
  ('ai_optimized_profile','Profil Optimisé IA','AI-Optimized Profile','Insights IA générés','AI insights generated','🧠',100)
on conflict (id) do nothing;
