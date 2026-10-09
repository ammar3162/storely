drop table if exists public.agent_payouts;
drop table if exists public.agent_commissions;
alter table public.organizations drop column if exists referred_at;
alter table public.organizations drop column if exists referred_by_agent;
drop table if exists public.agent_sessions;
drop table if exists public.agent_login_codes;
drop table if exists public.sales_agents;
notify pgrst, 'reload schema';
