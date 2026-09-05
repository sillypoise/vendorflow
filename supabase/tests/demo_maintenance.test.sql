begin;
create extension if not exists pgtap with schema extensions;
select extensions.no_plan();

-- Monitoring must fail closed when scheduling or its success heartbeat is missing.
update private.demo_maintenance_status set last_succeeded_at = null;
set local role anon;
select extensions.is(public.demo_health(), false, 'missing cleanup heartbeat is unhealthy');
select extensions.throws_ok('select private.run_demo_maintenance()', '42501',
    'permission denied for schema private', 'anonymous caller cannot run scheduled cleanup');
reset role;
select extensions.lives_ok('select private.run_demo_maintenance()', 'owner can run bounded cleanup');
select extensions.is(public.demo_health(), true, 'successful cleanup and active schedule are healthy');
update private.demo_maintenance_status
set last_succeeded_at = statement_timestamp() - interval '5 minutes';
select extensions.is(public.demo_health(), false, 'heartbeat expiry boundary is unhealthy');
update private.demo_maintenance_status set last_succeeded_at = statement_timestamp();
select cron.alter_job((select jobid from cron.job where jobname = 'vendorflow-demo-maintenance'),
    active := false);
select extensions.is(public.demo_health(), false, 'disabled scheduler is unhealthy');
select cron.alter_job((select jobid from cron.job where jobname = 'vendorflow-demo-maintenance'),
    active := true);
set local role authenticated;
select extensions.is(public.demo_health(), true, 'health bit is safe for authenticated callers');
select extensions.throws_ok('select * from private.demo_maintenance_status', '42501',
    'permission denied for schema private', 'heartbeat details are private');
select extensions.throws_ok('select private.run_demo_maintenance()', '42501',
    'permission denied for schema private', 'authenticated caller cannot run scheduled cleanup');
reset role;

-- Transactional fixtures isolate the exact signup-rate boundary without persisting identity edits.
update auth.users set created_at = statement_timestamp() - interval '2 hours' where is_anonymous;
insert into auth.users(id, is_anonymous, created_at)
select extensions.gen_random_uuid(), true, statement_timestamp() from generate_series(1, 99);
select extensions.is(public.demo_health(), true, '99 recent anonymous identities are below the alert boundary');
insert into auth.users(id, is_anonymous, created_at)
values (extensions.gen_random_uuid(), true, statement_timestamp());
select extensions.is(public.demo_health(), false, '100 recent anonymous identities trigger the alert');
update auth.users set created_at = statement_timestamp() - interval '2 hours' where is_anonymous;
create temporary table rate_actor(id uuid default extensions.gen_random_uuid());
insert into rate_actor default values;
insert into auth.users(id, is_anonymous, created_at)
select id, true, statement_timestamp() from rate_actor;
select set_config('request.jwt.claim.sub', (select id::text from rate_actor), true);
select public.start_demo();
update private.demo_control_events set created_at = statement_timestamp() - interval '2 hours';
insert into private.demo_control_events(user_id, action)
select id, 'requester' from rate_actor cross join generate_series(1, 999);
select extensions.is(public.demo_health(), true, '999 recent controls are below the alert boundary');
insert into private.demo_control_events(user_id, action) select id, 'requester' from rate_actor;
select extensions.is(public.demo_health(), false, '1000 recent controls trigger the alert');
select * from extensions.finish();
rollback;
