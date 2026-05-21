
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

revoke all on function public.has_role(uuid, public.app_role) from public, anon, authenticated;
revoke all on function public.is_admin(uuid) from public, anon, authenticated;
revoke all on function public.apply_xp_event() from public, anon, authenticated;
revoke all on function public.handle_new_user_role() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;

grant execute on function public.has_role(uuid, public.app_role) to authenticated, service_role;
grant execute on function public.is_admin(uuid) to authenticated, service_role;
grant execute on function public.apply_xp_event() to service_role;
grant execute on function public.handle_new_user_role() to service_role;
grant execute on function public.handle_new_user() to service_role;

drop view if exists public.pulse_results;
create view public.pulse_results with (security_invoker = true) as
select pulse_id, option_id, count(*)::int as votes
from public.pulse_responses group by pulse_id, option_id;

drop view if exists public.datalab_engagement;
create view public.datalab_engagement with (security_invoker = true) as
select date_trunc('day', created_at)::date as day,
       count(*) filter (where amount > 0) as xp_events,
       count(distinct user_id) as active_users
from public.xp_events group by 1 order by 1 desc;

drop view if exists public.datalab_opportunity_demand;
create view public.datalab_opportunity_demand with (security_invoker = true) as
select o.type, o.country, count(a.id) as applications, count(distinct a.user_id) as unique_applicants
from public.opportunities o
left join public.applications a on a.opportunity_id = o.id
group by o.type, o.country;
