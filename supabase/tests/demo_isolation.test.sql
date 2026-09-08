begin;
create extension if not exists pgtap with schema extensions;
select extensions.no_plan();

-- Two independently authenticated visitors exercise the actual grants and RLS, not mocked roles.
insert into auth.users(id, is_anonymous) values
    ('90000000-0000-4000-8000-000000000001', true),
    ('90000000-0000-4000-8000-000000000002', true),
    ('90000000-0000-4000-8000-000000000003', false);
create temporary table demo_snapshot (visitor integer, organization_id uuid, request_id uuid);
grant select on demo_snapshot to authenticated;

select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000001', true);
set local role authenticated;
select extensions.lives_ok('select public.start_demo()', 'visitor A can provision their own workspace');
select extensions.lives_ok('select public.start_demo()', 'repeat provisioning is idempotent');
select extensions.is((select count(*) from public.vendor_requests), 18::bigint,
    'eighteen seeded scenarios');
select extensions.is((select count(*) from public.organizations), 1::bigint, 'one private organization');
select extensions.throws_ok('select public.demo_control(null)', 'P0001', 'VALIDATION_FAILED',
    'null role fails closed');
select extensions.throws_ok('select public.demo_control(''owner'')', 'P0001', 'VALIDATION_FAILED',
    'unknown role fails closed');
select extensions.throws_ok('select public.cleanup_expired_demos()', '42501',
    'permission denied for function cleanup_expired_demos', 'cleanup is service-only');
select extensions.throws_ok('select * from private.demo_sessions', '42501',
    'permission denied for schema private', 'session capabilities are not exposed');
reset role;
insert into demo_snapshot select 1, organization_id, id from public.vendor_requests
where owner_user_id = '90000000-0000-4000-8000-000000000001'
    and vendor_legal_name = 'Beacon Metrics Inc.';

select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000002', true);
set local role authenticated;
select extensions.lives_ok('select public.start_demo()', 'visitor B gets an independent workspace');
select extensions.is((select count(*) from public.vendor_requests), 18::bigint,
    'B cannot read A requests');
select extensions.is((select count(*) from public.vendor_request_audit_events), 54::bigint,
    'B cannot read A history');
select extensions.throws_ok($test$select public.submit_vendor_request(
    (select request_id from demo_snapshot where visitor = 1), 1)$test$,
    'P0001', 'REQUEST_NOT_FOUND', 'cross-visitor mutation hides existence');
select extensions.lives_ok('select public.demo_control(''administrator'')',
    'B can explicitly re-authorize a demo-only role change');
select extensions.is((select count(*) from public.organizations), 1::bigint,
    'demo administrator still sees only their organization');
select extensions.is((select count(*) from public.organization_memberships), 1::bigint,
    'demo administrator cannot enumerate other visitors');
select extensions.lives_ok('select public.demo_control(''reset'')', 'reset is own-workspace only');
reset role;
select extensions.is((select count(*) from public.vendor_requests where id =
    (select request_id from demo_snapshot where visitor = 1)), 1::bigint, 'B reset preserves A data');
select extensions.is((select role from public.organization_memberships where user_id =
    '90000000-0000-4000-8000-000000000001'), 'requester'::public.membership_role,
    'B role switch never changes A role');
insert into demo_snapshot select 2, organization_id, id from public.vendor_requests
where owner_user_id = '90000000-0000-4000-8000-000000000002'
    and vendor_legal_name = 'Beacon Metrics Inc.';
insert into public.vendor_requests(organization_id, owner_user_id)
select organization_id, '90000000-0000-4000-8000-000000000002'::uuid
from demo_snapshot cross join generate_series(1, 81) where visitor = 2;
update public.vendor_requests set revision = 99
where id = (select request_id from demo_snapshot where visitor = 2);
set local role authenticated;
select extensions.lives_ok($test$select public.create_vendor_request(
    row(null, null, null, null, null, null, null, null))$test$, 'request 100 is accepted');
select extensions.throws_ok($test$select public.create_vendor_request(
    row(null, null, null, null, null, null, null, null))$test$,
    'P0001', 'DEMO_LIMIT_REACHED', 'request 101 fails without mutation');
select extensions.is((select count(*) from public.vendor_requests), 100::bigint,
    'live request cap holds');
select extensions.lives_ok($test$select public.update_vendor_request(
    (select request_id from demo_snapshot where visitor = 2), 99,
    row(null, null, null, null, null, null, null, null))$test$, 'revision 100 is accepted');
select extensions.throws_ok($test$select public.update_vendor_request(
    (select request_id from demo_snapshot where visitor = 2), 100,
    row(null, null, null, null, null, null, null, null))$test$,
    'P0001', 'DEMO_LIMIT_REACHED', 'revision 101 fails without mutation');
select extensions.is((select revision from public.vendor_requests where id =
    (select request_id from demo_snapshot where visitor = 2)), 100, 'revision cap holds');
reset role;

select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000001', true);
set local role authenticated;
select extensions.lives_ok($test$select public.submit_vendor_request(
    (select request_id from demo_snapshot where visitor = 1), 1)$test$, 'demo requester submits');
select extensions.throws_ok($test$select public.assign_vendor_request(
    (select request_id from demo_snapshot where visitor = 1), 2, auth.uid())$test$,
    'P0001', 'PERMISSION_DENIED', 'role switch does not bypass action authorization');
select extensions.lives_ok('select public.demo_control(''administrator'')', 'switch to administrator');
select extensions.throws_ok($test$select public.assign_vendor_request(
    (select request_id from demo_snapshot where visitor = 1), 2,
    '90000000-0000-4000-8000-000000000002')$test$,
    'P0001', 'VALIDATION_FAILED', 'cannot nominate another visitor as reviewer');
select extensions.lives_ok($test$select public.assign_vendor_request(
    (select request_id from demo_snapshot where visitor = 1), 2, auth.uid())$test$,
    'demo owner can nominate their own reviewer persona');
select extensions.throws_ok($test$select public.review_vendor_request(
    (select request_id from demo_snapshot where visitor = 1), 3, 'approve')$test$,
    'P0001', 'PERMISSION_DENIED', 'administrator still cannot make a decision');
select extensions.lives_ok('select public.demo_control(''reviewer'')', 'switch to assigned reviewer');
select extensions.lives_ok($test$select public.review_vendor_request(
    (select request_id from demo_snapshot where visitor = 1), 3, 'approve')$test$,
    'assigned demo reviewer approves');
select extensions.is((select count(*) from public.vendor_request_audit_events where request_id =
    (select request_id from demo_snapshot where visitor = 1)), 4::bigint,
    'full demo flow has four immutable lifecycle events');
select extensions.throws_ok($test$select public.review_vendor_request(
    (select request_id from demo_snapshot where visitor = 1), 3, 'reject', 'stale')$test$,
    'P0001', 'STALE_REVISION', 'stale decision cannot overwrite approval');
select extensions.is((select count(*) from public.vendor_request_audit_events where request_id =
    (select request_id from demo_snapshot where visitor = 1)), 4::bigint,
    'denied decision adds no audit event');
select extensions.lives_ok('select public.demo_control(''reset'')', 'explicit reset starts fresh');
select extensions.is((select count(*) from public.vendor_requests), 18::bigint,
    'reset restores eighteen scenarios');
select extensions.is((select count(*) from public.vendor_requests where id =
    (select request_id from demo_snapshot where visitor = 1)), 0::bigint, 'old identifier cannot be reused');
reset role;

update public.organization_memberships set active = false
where user_id = '90000000-0000-4000-8000-000000000001';
set local role authenticated;
select extensions.throws_ok('select public.demo_control(''administrator'')', 'P0001',
    'PERMISSION_DENIED', 'inactive membership cannot elevate through demo controls');
reset role;
select extensions.is((select control_count from private.demo_sessions where user_id =
    '90000000-0000-4000-8000-000000000001'), 3, 'denied control does not consume capacity');
update public.organization_memberships set active = true
where user_id = '90000000-0000-4000-8000-000000000001';

-- Limits and expiry are tested at the last permitted value and first rejected value.
update private.demo_sessions set control_count = 199
where user_id = '90000000-0000-4000-8000-000000000001';
set local role authenticated;
select extensions.lives_ok('select public.demo_control(''requester'')', 'control number 200 is accepted');
select extensions.throws_ok('select public.demo_control(''reset'')', 'P0001', 'DEMO_LIMIT_REACHED',
    'control number 201 is denied');
reset role;
update private.demo_sessions set expires_at = statement_timestamp()
where user_id = '90000000-0000-4000-8000-000000000001';
set local role authenticated;
select extensions.is((select count(*) from public.vendor_requests), 0::bigint,
    'expiry boundary hides requests');
select extensions.is((select count(*) from public.organizations), 0::bigint,
    'expiry boundary hides organizations');
select extensions.is((select count(*) from public.organization_memberships), 0::bigint,
    'expiry boundary hides memberships');
select extensions.is((select count(*) from public.vendor_request_audit_events), 0::bigint,
    'expiry boundary hides history');
select extensions.throws_ok('select public.start_demo()', 'P0001', 'DEMO_EXPIRED',
    'repeat provisioning cannot extend lifetime');
select extensions.throws_ok('select public.demo_control(''requester'')', 'P0001', 'DEMO_EXPIRED',
    'expired role change denied');
select extensions.throws_ok($test$select public.create_vendor_request(
    row(null, null, null, null, null, null, null, null))$test$,
    'P0001', 'DEMO_EXPIRED', 'expired workflow mutation denied');
reset role;
insert into auth.users(id, is_anonymous, created_at) values
    ('90000000-0000-4000-8000-000000000004', true, statement_timestamp() - interval '24 hours'),
    ('90000000-0000-4000-8000-000000000005', true, statement_timestamp());
set local role service_role;
select extensions.is(public.cleanup_expired_demos(), 2, 'cleanup removes expired session and abandoned identity');
reset role;
select extensions.is((select count(*) from auth.users where id =
    '90000000-0000-4000-8000-000000000001'), 0::bigint, 'cleanup removes expired identity');
select extensions.is((select count(*) from private.demo_sessions where user_id =
    '90000000-0000-4000-8000-000000000002'), 1::bigint, 'cleanup preserves live visitor');
select extensions.is((select count(*) from auth.users where id =
    '90000000-0000-4000-8000-000000000004'), 0::bigint, 'cleanup removes abandoned anonymous identity');
select extensions.is((select count(*) from auth.users where id =
    '90000000-0000-4000-8000-000000000005'), 1::bigint, 'cleanup preserves newly created identity');
set local role service_role;
select extensions.is(public.cleanup_expired_demos(), 0, 'repeat cleanup is safe and idempotent');
reset role;

select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000003', true);
set local role authenticated;
select extensions.throws_ok('select public.start_demo()', 'P0001', 'PERMISSION_DENIED',
    'ordinary identities cannot acquire demo authority');
select extensions.throws_ok('select public.demo_control(''administrator'')', 'P0001',
    'PERMISSION_DENIED', 'ordinary identity cannot elevate through demo control');
reset role;
select set_config('request.jwt.claim.sub', '', true);
set local role anon;
select extensions.throws_ok('select public.start_demo()', '42501',
    'permission denied for function start_demo', 'unauthenticated provisioning denied');
reset role;
select * from extensions.finish();
rollback;
