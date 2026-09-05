-- Privileged pre-release benchmark: all fictional fixtures roll back in a subtransaction.
-- It exercises 100 requests and 10,000 audit rows with maximum-length four-byte reasons.
-- Relation growth and WAL are real even though fixture rows roll back; run only intentionally.
begin;
set local statement_timeout = '45s';
create temporary table vendorflow_cleanup_measurement (
    request_rows integer, audit_rows integer, reason_bytes bigint,
    cleanup_ms numeric, cleanup_wal_bytes numeric, deleted_identities integer
) on commit drop;

do $benchmark$
declare
    v_actor uuid := extensions.gen_random_uuid();
    v_organization uuid;
    v_started timestamptz;
    v_wal pg_lsn;
    v_elapsed numeric;
    v_wal_bytes numeric;
    v_deleted integer;
    v_reason_bytes bigint;
begin
    begin
        insert into auth.users(id, is_anonymous, created_at)
        values (v_actor, true, statement_timestamp());
        perform set_config('request.jwt.claim.sub', v_actor::text, true);
        perform public.start_demo();
        select organization_id into v_organization from private.demo_sessions
        where user_id = v_actor;
        perform public.create_vendor_request(row(null, null, null, null, null, null, null, null))
        from generate_series(1, 99);
        insert into public.vendor_request_audit_events (
            request_id, organization_id, actor_user_id, actor_role, action,
            previous_state, current_state, reason, resulting_revision
        )
        select request.id, v_organization, v_actor, 'reviewer', 'requested_changes',
            'in_review', 'changes_requested',
            (select string_agg(chr(65536 + floor(random() * 1048576)::integer), '')
                from generate_series(1, 1000) where revisions.value > 0), revisions.value
        from public.vendor_requests as request
        cross join generate_series(2, 100) as revisions(value)
        where request.organization_id = v_organization;
        assert (select count(*) from public.vendor_requests
            where organization_id = v_organization) = 100;
        assert (select count(*) from public.vendor_request_audit_events
            where organization_id = v_organization) = 10000;
        select sum(octet_length(reason)) into v_reason_bytes from public.vendor_request_audit_events
        where organization_id = v_organization;
        update private.demo_sessions set expires_at = '1970-01-01' where user_id = v_actor;
        v_wal := pg_current_wal_insert_lsn();
        v_started := clock_timestamp();
        v_deleted := public.cleanup_expired_demos();
        v_elapsed := extract(epoch from clock_timestamp() - v_started) * 1000;
        v_wal_bytes := pg_wal_lsn_diff(pg_current_wal_insert_lsn(), v_wal);
        assert v_deleted >= 1;
        assert (select count(*) from auth.users where id = v_actor) = 0;
        raise exception using errcode = 'VF001', message = 'ROLLBACK_BENCHMARK_FIXTURES';
    exception when sqlstate 'VF001' then null;
    end;
    assert (select count(*) from auth.users where id = v_actor) = 0;
    insert into vendorflow_cleanup_measurement
    values (100, 10000, v_reason_bytes, round(v_elapsed, 2), v_wal_bytes, v_deleted);
end;
$benchmark$;
select * from vendorflow_cleanup_measurement;
rollback;
