-- Hosted PostgreSQL verification, not a replacement for a real browser/Auth workflow.
-- Privileged fixture setup is rolled back; every workflow call below uses authenticated grants/RLS.
begin;
set local statement_timeout = '30s';
set local idle_in_transaction_session_timeout = '60s';
set local plpgsql.check_asserts = on;
create temporary table hosted_actors (
    visitor integer primary key, id uuid default extensions.gen_random_uuid(), request_id uuid
);
grant select, update on hosted_actors to authenticated;
insert into hosted_actors(visitor) values (1), (2);
insert into auth.users(id, is_anonymous, created_at)
select id, true, statement_timestamp() from hosted_actors;

select set_config('request.jwt.claim.sub',
    (select id::text from hosted_actors where visitor = 1), true);
set local role authenticated;
select public.start_demo();
update hosted_actors set request_id = (
    select id from public.vendor_requests where vendor_legal_name = 'Beacon Metrics Inc.')
where visitor = 1;
do $check$ begin
    assert (select count(*) from public.vendor_requests) = 18;
    assert (select count(*) from public.organizations) = 1;
    assert has_function_privilege('authenticated',
        'public.cleanup_expired_demos()', 'execute') = false;
    assert has_table_privilege('authenticated', 'public.vendor_requests', 'update') = false;
end; $check$;
reset role;

select set_config('request.jwt.claim.sub',
    (select id::text from hosted_actors where visitor = 2), true);
set local role authenticated;
select public.start_demo();
select public.demo_control('administrator');
do $check$ begin
    assert (select count(*) from public.vendor_requests) = 18;
    assert (select count(*) from public.vendor_requests where id =
        (select request_id from hosted_actors where visitor = 1)) = 0;
    begin
        perform public.assign_vendor_request(
            (select request_id from hosted_actors where visitor = 1), 1, auth.uid());
        raise exception 'EXPECTED_DENIAL';
    exception when sqlstate 'P0001' then
        if sqlerrm <> 'REQUEST_NOT_FOUND' then raise; end if;
    end;
end; $check$;
reset role;

select set_config('request.jwt.claim.sub',
    (select id::text from hosted_actors where visitor = 1), true);
set local role authenticated;
select public.submit_vendor_request((select request_id from hosted_actors where visitor = 1), 1);
select public.demo_control('administrator');
select public.assign_vendor_request(
    (select request_id from hosted_actors where visitor = 1), 2, auth.uid());
do $check$ begin
    begin
        perform public.review_vendor_request(
            (select request_id from hosted_actors where visitor = 1), 3, 'approve');
        raise exception 'EXPECTED_DENIAL';
    exception when sqlstate 'P0001' then
        if sqlerrm <> 'PERMISSION_DENIED' then raise; end if;
    end;
end; $check$;
select public.demo_control('reviewer');
select public.review_vendor_request(
    (select request_id from hosted_actors where visitor = 1), 3, 'approve');
do $check$
declare v_request_id uuid := (select request_id from hosted_actors where visitor = 1);
begin
    assert (select state from public.vendor_requests where id = v_request_id) = 'approved';
    assert (select revision from public.vendor_requests where id = v_request_id) = 4;
    assert (select count(*) from public.vendor_request_audit_events
        where request_id = v_request_id) = 4;
    begin
        perform public.review_vendor_request(
            (select request_id from hosted_actors where visitor = 1), 3, 'reject', 'stale fixture');
        raise exception 'EXPECTED_DENIAL';
    exception when sqlstate 'P0001' then
        if sqlerrm <> 'STALE_REVISION' then raise; end if;
    end;
    assert (select count(*) from public.vendor_request_audit_events
        where request_id = v_request_id) = 4;
end; $check$;
select public.demo_control('reset');
reset role;
select set_config('request.jwt.claim.sub',
    (select id::text from hosted_actors where visitor = 2), true);
set local role authenticated;
do $check$ begin
    assert (select count(*) from public.vendor_requests) = 18;
    assert (select count(*) from public.vendor_request_audit_events) = 54;
end; $check$;
reset role;
select 'passed' as hosted_workflow;
rollback;
