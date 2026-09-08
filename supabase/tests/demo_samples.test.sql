begin;
create extension if not exists pgtap with schema extensions;
select extensions.no_plan();

-- Exercise all six fixture states, private seeding authority, and atomic reset rollback.
insert into auth.users(id, is_anonymous) values ('91000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000001', true);
set local role authenticated;
select public.start_demo();
select extensions.is(
    (select array_agg(distinct state::text order by state::text) from public.vendor_requests),
    array['approved', 'changes_requested', 'draft', 'in_review', 'rejected', 'submitted'],
    'the sample workspace covers the complete six-state domain');
select extensions.is((select count(*) from public.vendor_requests), 18::bigint,
    'eighteen requests fit the first twenty-row page');
select extensions.ok((select bool_and(request_count = 3) from (
    select count(*) as request_count from public.vendor_requests group by state
) as counts), 'each workflow state contains three scenarios');
select extensions.is((select count(distinct vendor_legal_name) from public.vendor_requests),
    18::bigint, 'every sample vendor is distinct');
select extensions.is((select count(*) from public.vendor_request_audit_events), 54::bigint,
    'sample history consists of actual lifecycle transitions');
select extensions.ok((select bool_and(revision = (
    select count(*) from public.vendor_request_audit_events where request_id = request.id
)) from public.vendor_requests as request), 'each request revision matches its seed history');
select extensions.ok((select bool_and(vendor_website like 'https://%.example')
    from public.vendor_requests), 'sample vendors use reserved fictional domains');
select extensions.is((select role::text from public.organization_memberships), 'requester',
    'seeding restores the requester persona');
select extensions.throws_ok('select private.seed_demo_workspace()', '42501',
    'permission denied for schema private', 'visitors cannot invoke the seeder directly');
select extensions.throws_ok('select * from private.demo_vendor_samples()', '42501',
    'permission denied for schema private', 'visitors cannot invoke the private catalog directly');
reset role;
create temporary table sample_snapshot as select id from public.vendor_requests
where owner_user_id = auth.uid();
create temporary table sample_expiry as select expires_at from private.demo_sessions
where user_id = auth.uid();
grant select on sample_snapshot to authenticated;
select extensions.is((select control_count from private.demo_sessions where user_id = auth.uid()),
    0, 'seed personas do not consume visitor control capacity');
set local role authenticated;
select public.start_demo();
select extensions.is((select count(*) from public.vendor_requests join sample_snapshot using (id)),
    18::bigint, 'repeat entry preserves all existing sample identifiers');
select public.demo_control('reviewer');
reset role;

-- Reject a later sample insert to prove earlier seed writes and reset deletions roll back together.
alter table public.vendor_requests add constraint sample_seed_failure
check (vendor_legal_name <> 'Juniper Workplace Services') not valid;
set local role authenticated;
select extensions.throws_ok('select public.demo_control(''reset'')', 'P0001', 'VALIDATION_FAILED',
    'failed seeding rejects the entire reset');
select extensions.is((select count(*) from public.vendor_requests join sample_snapshot using (id)),
    18::bigint, 'failed reset preserves every old request');
select extensions.is((select count(*) from public.vendor_request_audit_events), 54::bigint,
    'failed reset preserves all old history');
select extensions.is((select role::text from public.organization_memberships), 'reviewer',
    'failed reset preserves the previous persona');
reset role;
select extensions.is((select control_count from private.demo_sessions where user_id = auth.uid()),
    1, 'failed reset does not consume control capacity');
alter table public.vendor_requests drop constraint sample_seed_failure;
set local role authenticated;
select public.demo_control('reset');
select extensions.is((select count(*) from public.vendor_requests), 18::bigint,
    'successful reset restores the complete sample workspace');
select extensions.is((select count(*) from public.vendor_requests join sample_snapshot using (id)),
    0::bigint, 'successful reset replaces old request identifiers');
reset role;
select extensions.is((select expires_at from private.demo_sessions where user_id = auth.uid()),
    (select expires_at from sample_expiry), 'reset never extends expiry');
select extensions.is((select control_count from private.demo_sessions where user_id = auth.uid()),
    2, 'successful reset consumes exactly one control');
select * from extensions.finish();
rollback;
