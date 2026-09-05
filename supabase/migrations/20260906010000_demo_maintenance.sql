-- The database scheduler needs no browser-visible service credential or external worker.
create extension if not exists pg_cron;
create index demo_control_events_created_idx on private.demo_control_events(created_at);

create table private.demo_maintenance_status (
    singleton boolean primary key default true check (singleton),
    last_succeeded_at timestamptz,
    deleted_identities integer not null default 0 check (deleted_identities between 0 and 101)
);
insert into private.demo_maintenance_status(singleton) values (true);
revoke all on private.demo_maintenance_status from public, anon, authenticated;

create function private.run_demo_maintenance()
returns void language plpgsql security definer set search_path = '' as $$
declare
    v_deleted integer;
begin
    v_deleted := public.cleanup_expired_demos();
    update private.demo_maintenance_status
    set last_succeeded_at = statement_timestamp(), deleted_identities = v_deleted
    where singleton;
    -- Only this job's old execution records are pruned; other operators' jobs are untouched.
    delete from cron.job_run_details where runid in (
        select detail.runid from cron.job_run_details as detail
        join cron.job as job on job.jobid = detail.jobid
        where job.jobname = 'vendorflow-demo-maintenance'
          and detail.end_time < statement_timestamp() - interval '1 day'
        order by detail.runid limit 100
    );
end;
$$;
revoke all on function private.run_demo_maintenance() from public, anon, authenticated;

-- Public monitoring receives one health bit, never identities, counters, reasons, or credentials.
create function public.demo_health()
returns boolean language sql stable security definer set search_path = '' as $$
    select coalesce((select last_succeeded_at > statement_timestamp() - interval '5 minutes'
        from private.demo_maintenance_status where singleton), false)
      and exists (select 1 from cron.job where jobname = 'vendorflow-demo-maintenance' and active)
      and not exists (select 1 from private.demo_sessions
          where expires_at < statement_timestamp() - interval '15 minutes')
      and not exists (select 1 from auth.users as actor
          where is_anonymous and created_at < statement_timestamp() - interval '25 hours'
            and not exists (select 1 from private.demo_sessions where user_id = actor.id)
            and not exists (select 1 from public.organization_memberships where user_id = actor.id))
      and (select count(*) from auth.users where is_anonymous
          and created_at > statement_timestamp() - interval '1 hour') < 100
      and (select count(*) from private.demo_control_events
          where created_at > statement_timestamp() - interval '1 hour') < 1000
      and pg_catalog.pg_database_size(pg_catalog.current_database()) < 262144000;
$$;
revoke all on function public.demo_health() from public;
grant execute on function public.demo_health() to anon, authenticated, service_role;

select cron.schedule('vendorflow-demo-maintenance', '* * * * *',
    'set statement_timeout = ''20s''; select private.run_demo_maintenance();');
