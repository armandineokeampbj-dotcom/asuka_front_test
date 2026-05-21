
-- =========================================================
-- ENUMS
-- =========================================================
create type public.app_role as enum ('youth','partner','institution','admin','moderator');
create type public.opportunity_type as enum ('job','internship','scholarship','freelance','volunteering','training','challenge','mentorship','entrepreneurship','grant','fellowship');
create type public.opportunity_status as enum ('draft','pending','approved','rejected','archived');
create type public.application_status as enum ('saved','applied','in_review','accepted','rejected','withdrawn');
create type public.notification_channel as enum ('in_app','email','sms','whatsapp','push');
create type public.notification_kind as enum ('opportunity','coach','profile','pulse','application','system','reward');
create type public.reward_kind as enum ('xp','points','stipend','grant','voucher','badge');
create type public.reward_status as enum ('pending','approved','paid','failed','cancelled');
create type public.payout_provider as enum ('mobile_money','bank','card','wallet','manual');

-- =========================================================
-- ROLES
-- =========================================================
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  granted_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role);
$$;

create or replace function public.is_admin(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(_user_id,'admin') or public.has_role(_user_id,'moderator');
$$;

create policy "users view own roles" on public.user_roles for select using (auth.uid() = user_id or public.is_admin(auth.uid()));
create policy "admins manage roles" on public.user_roles for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- =========================================================
-- PROFILES extensions
-- =========================================================
alter table public.profiles
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists xp integer not null default 0,
  add column if not exists level integer not null default 1,
  add column if not exists streak_days integer not null default 0,
  add column if not exists last_active_at timestamptz;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

-- Auto-grant 'youth' role on signup
create or replace function public.handle_new_user_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.user_roles (user_id, role) values (new.id, 'youth') on conflict do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created_role on auth.users;
create trigger on_auth_user_created_role after insert on auth.users
for each row execute function public.handle_new_user_role();

-- =========================================================
-- INSTITUTIONS
-- =========================================================
create table public.institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text,                     -- gov, ngo, un, employer, school...
  country text,
  website text,
  logo_url text,
  verified boolean not null default false,
  owner_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.institutions enable row level security;
create trigger institutions_set_updated_at before update on public.institutions for each row execute function public.set_updated_at();

create policy "anyone can view institutions" on public.institutions for select using (true);
create policy "owners or admins manage institutions" on public.institutions
  for all using (auth.uid() = owner_id or public.is_admin(auth.uid()))
  with check (auth.uid() = owner_id or public.is_admin(auth.uid()));

-- =========================================================
-- OPPORTUNITIES
-- =========================================================
create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid references public.institutions(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  type opportunity_type not null,
  status opportunity_status not null default 'pending',
  title_fr text not null,
  title_en text not null,
  description_fr text,
  description_en text,
  org_name text,
  location text,
  remote boolean not null default false,
  country text,
  languages text[] not null default '{}',
  tags text[] not null default '{}',
  skills text[] not null default '{}',
  deadline date,
  url text,
  emoji text,
  match_weights jsonb not null default '{}'::jsonb,
  ai_summary text,
  views_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.opportunities enable row level security;
create index opps_status_idx on public.opportunities(status);
create index opps_type_idx on public.opportunities(type);
create index opps_country_idx on public.opportunities(country);
create trigger opportunities_set_updated_at before update on public.opportunities for each row execute function public.set_updated_at();

create policy "approved opps visible to all" on public.opportunities
  for select using (status = 'approved' or auth.uid() = created_by or public.is_admin(auth.uid()));
create policy "partners create opps" on public.opportunities
  for insert with check (auth.uid() = created_by);
create policy "owners or admins update opps" on public.opportunities
  for update using (auth.uid() = created_by or public.is_admin(auth.uid()));
create policy "admins delete opps" on public.opportunities
  for delete using (public.is_admin(auth.uid()));

-- =========================================================
-- APPLICATIONS
-- =========================================================
create table public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  opportunity_id uuid references public.opportunities(id) on delete cascade not null,
  status application_status not null default 'saved',
  match_score integer,
  notes text,
  applied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, opportunity_id)
);
alter table public.applications enable row level security;
create trigger applications_set_updated_at before update on public.applications for each row execute function public.set_updated_at();

create policy "users view own apps" on public.applications for select using (auth.uid() = user_id or public.is_admin(auth.uid()));
create policy "users insert own apps" on public.applications for insert with check (auth.uid() = user_id);
create policy "users update own apps" on public.applications for update using (auth.uid() = user_id);
create policy "users delete own apps" on public.applications for delete using (auth.uid() = user_id);

-- =========================================================
-- AI RECOMMENDATIONS
-- =========================================================
create table public.recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  opportunity_id uuid references public.opportunities(id) on delete cascade not null,
  match_score integer not null,
  reason text,
  created_at timestamptz not null default now(),
  unique (user_id, opportunity_id)
);
alter table public.recommendations enable row level security;
create policy "users view own recs" on public.recommendations for select using (auth.uid() = user_id or public.is_admin(auth.uid()));
create policy "admins manage recs" on public.recommendations for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- =========================================================
-- PULSE
-- =========================================================
create table public.pulses (
  id uuid primary key default gen_random_uuid(),
  topic_fr text not null,
  topic_en text not null,
  question_fr text not null,
  question_en text not null,
  options jsonb not null default '[]'::jsonb, -- [{id,label_fr,label_en}]
  is_published boolean not null default true,
  closes_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.pulses enable row level security;
create trigger pulses_set_updated_at before update on public.pulses for each row execute function public.set_updated_at();
create policy "anyone view published pulses" on public.pulses for select using (is_published or public.is_admin(auth.uid()));
create policy "admins manage pulses" on public.pulses for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create table public.pulse_responses (
  id uuid primary key default gen_random_uuid(),
  pulse_id uuid references public.pulses(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  option_id text not null,
  comment text,
  created_at timestamptz not null default now(),
  unique (pulse_id, user_id)
);
alter table public.pulse_responses enable row level security;
create policy "users view own responses" on public.pulse_responses for select using (auth.uid() = user_id or public.is_admin(auth.uid()));
create policy "users insert own responses" on public.pulse_responses for insert with check (auth.uid() = user_id);
create policy "users update own responses" on public.pulse_responses for update using (auth.uid() = user_id);

create table public.pulse_insights (
  id uuid primary key default gen_random_uuid(),
  pulse_id uuid references public.pulses(id) on delete cascade not null,
  summary_fr text,
  summary_en text,
  stats jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default now()
);
alter table public.pulse_insights enable row level security;
create policy "anyone view insights" on public.pulse_insights for select using (true);
create policy "admins manage insights" on public.pulse_insights for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Aggregated view for live charts (no PII)
create or replace view public.pulse_results as
select pulse_id, option_id, count(*)::int as votes
from public.pulse_responses group by pulse_id, option_id;

-- =========================================================
-- NOTIFICATIONS
-- =========================================================
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  kind notification_kind not null default 'system',
  channel notification_channel not null default 'in_app',
  title text not null,
  body text,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.notifications enable row level security;
create index notif_user_idx on public.notifications(user_id, read_at);
create policy "users view own notifs" on public.notifications for select using (auth.uid() = user_id);
create policy "users update own notifs" on public.notifications for update using (auth.uid() = user_id);
create policy "users delete own notifs" on public.notifications for delete using (auth.uid() = user_id);
create policy "admins insert notifs" on public.notifications for insert with check (public.is_admin(auth.uid()) or auth.uid() = user_id);

-- =========================================================
-- GAMIFICATION
-- =========================================================
create table public.badges (
  id text primary key,                    -- e.g. 'first_application'
  name_fr text not null,
  name_en text not null,
  description_fr text,
  description_en text,
  icon text,
  xp_reward integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.badges enable row level security;
create policy "anyone view badges" on public.badges for select using (true);
create policy "admins manage badges" on public.badges for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create table public.user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  badge_id text references public.badges(id) on delete cascade not null,
  awarded_at timestamptz not null default now(),
  unique (user_id, badge_id)
);
alter table public.user_badges enable row level security;
create policy "users view own badges" on public.user_badges for select using (auth.uid() = user_id or public.is_admin(auth.uid()));
create policy "admins award badges" on public.user_badges for insert with check (public.is_admin(auth.uid()));

create table public.xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  amount integer not null,
  reason text not null,                   -- e.g. 'apply_opportunity','complete_pulse','daily_streak'
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.xp_events enable row level security;
create policy "users view own xp" on public.xp_events for select using (auth.uid() = user_id or public.is_admin(auth.uid()));
create policy "users insert own xp" on public.xp_events for insert with check (auth.uid() = user_id);

-- Increment XP/level on xp_events insert
create or replace function public.apply_xp_event()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.profiles
  set xp = xp + new.amount,
      level = greatest(1, 1 + ((xp + new.amount) / 500)),
      last_active_at = now()
  where id = new.user_id;
  return new;
end; $$;

drop trigger if exists xp_events_apply on public.xp_events;
create trigger xp_events_apply after insert on public.xp_events
for each row execute function public.apply_xp_event();

-- =========================================================
-- REWARDS (future-ready)
-- =========================================================
create table public.payout_methods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  provider payout_provider not null,
  account_label text,
  account_ref text,                       -- masked / tokenised reference
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.payout_methods enable row level security;
create policy "users manage own payout methods" on public.payout_methods for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.rewards_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  kind reward_kind not null,
  amount numeric(12,2) not null default 0,
  currency text default 'XOF',
  status reward_status not null default 'pending',
  reason text,
  source text,                            -- e.g. 'pulse_streak','program_id'
  payout_method_id uuid references public.payout_methods(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.rewards_ledger enable row level security;
create trigger rewards_set_updated_at before update on public.rewards_ledger for each row execute function public.set_updated_at();
create policy "users view own rewards" on public.rewards_ledger for select using (auth.uid() = user_id or public.is_admin(auth.uid()));
create policy "admins manage rewards" on public.rewards_ledger for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- =========================================================
-- DATALAB (admin-only aggregated views)
-- =========================================================
create or replace view public.datalab_engagement as
select date_trunc('day', created_at)::date as day,
       count(*) filter (where amount > 0) as xp_events,
       count(distinct user_id) as active_users
from public.xp_events group by 1 order by 1 desc;

create or replace view public.datalab_opportunity_demand as
select o.type, o.country, count(a.id) as applications, count(distinct a.user_id) as unique_applicants
from public.opportunities o
left join public.applications a on a.opportunity_id = o.id
group by o.type, o.country;

-- Restrict the views via underlying RLS — admins query through service role / server fns.

-- =========================================================
-- SEED: badges catalogue
-- =========================================================
insert into public.badges (id, name_fr, name_en, description_fr, description_en, icon, xp_reward) values
  ('profile_complete','Profil complet','Profile Complete','Tu as rempli ton profil à 100%.','You completed your profile.','🪪',100),
  ('first_application','Première candidature','First Application','Tu as postulé à ta première opportunité.','You applied to your first opportunity.','🚀',50),
  ('pulse_voice','Voix de la jeunesse','Youth Voice','Tu as participé à 5 Pulses.','You answered 5 Pulses.','📣',75),
  ('streak_7','Série de 7 jours','7-day Streak','7 jours d''activité consécutifs.','7 days in a row.','🔥',120),
  ('coach_explorer','Explorateur Coach','Coach Explorer','10 conversations avec ton Coach IA.','10 chats with your AI Coach.','🧭',60)
on conflict (id) do nothing;
