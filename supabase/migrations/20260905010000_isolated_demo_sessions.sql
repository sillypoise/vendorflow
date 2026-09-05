-- Demo capabilities are issued only to an authenticated anonymous user, never a supplied identity.
create table private.demo_sessions (
    user_id uuid primary key references auth.users(id),
    organization_id uuid not null unique references public.organizations(id),
    expires_at timestamptz not null default (statement_timestamp() + interval '24 hours'),
    control_count integer not null default 0 check (control_count between 0 and 200)
);
create table private.demo_control_events (
    user_id uuid not null references private.demo_sessions(user_id),
    action text not null check (action in ('created', 'requester', 'reviewer', 'administrator', 'reset')),
    created_at timestamptz not null default statement_timestamp()
);
create index demo_sessions_expiry_idx on private.demo_sessions(expires_at);

create function private.demo_access_valid(p_organization_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
    select not exists (
        select 1 from private.demo_sessions
        where organization_id = p_organization_id and expires_at <= statement_timestamp()
    );
$$;

create or replace function private.is_active_member(p_organization_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
    select exists (
        select 1 from public.organization_memberships
        where organization_id = p_organization_id and user_id = auth.uid() and active
    ) and private.demo_access_valid(p_organization_id);
$$;

create or replace function private.user_has_role(
    p_organization_id uuid, p_role public.membership_role
)
returns boolean language sql stable security definer set search_path = '' as $$
    select exists (
        select 1 from public.organization_memberships
        where organization_id = p_organization_id and user_id = auth.uid()
          and role = p_role and active
    ) and private.demo_access_valid(p_organization_id);
$$;

create or replace function private.can_read_vendor_request(p_request_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
    select exists (
        select 1 from public.vendor_requests as request
        join public.organization_memberships as membership
          on membership.organization_id = request.organization_id
         and membership.user_id = auth.uid() and membership.active
        where request.id = p_request_id
          and private.demo_access_valid(request.organization_id)
          and (request.owner_user_id = auth.uid() or membership.role = 'administrator'
            or (membership.role = 'reviewer' and request.reviewer_user_id = auth.uid()))
    );
$$;

-- Serialize demo mutations, role changes, and reset on the same session row.
create or replace function private.assert_actor_role(p_role public.membership_role)
returns uuid language plpgsql volatile security definer set search_path = '' as $$
declare
    v_organization_id uuid;
begin
    if auth.uid() is null then
        raise exception using errcode = 'P0001', message = 'AUTHENTICATION_REQUIRED';
    end if;
    perform 1 from private.demo_sessions where user_id = auth.uid() for update;
    select organization_id into v_organization_id from public.organization_memberships
    where user_id = auth.uid() and role = p_role and active;
    if v_organization_id is null then
        raise exception using errcode = 'P0001', message = 'PERMISSION_DENIED';
    end if;
    if private.demo_access_valid(v_organization_id) = false then
        raise exception using errcode = 'P0001', message = 'DEMO_EXPIRED';
    end if;
    return v_organization_id;
end;
$$;

drop policy memberships_select_self_or_administrator on public.organization_memberships;
create policy memberships_select_self_or_administrator on public.organization_memberships
for select to authenticated using (
    private.is_active_member(organization_id)
    and (user_id = auth.uid() or private.user_has_role(organization_id, 'administrator'))
);

create function public.start_demo()
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare
    v_organization_id uuid;
    v_expires_at timestamptz;
begin
    -- The auth row lock makes repeat and concurrent provisioning idempotent.
    perform 1 from auth.users where id = auth.uid() and is_anonymous for update;
    if not found then
        raise exception using errcode = 'P0001', message = 'PERMISSION_DENIED';
    end if;
    select expires_at into v_expires_at from private.demo_sessions where user_id = auth.uid();
    if found then
        if v_expires_at <= statement_timestamp() then
            raise exception using errcode = 'P0001', message = 'DEMO_EXPIRED';
        end if;
        return v_expires_at;
    end if;
    if exists (select 1 from public.organization_memberships where user_id = auth.uid()) then
        raise exception using errcode = 'P0001', message = 'PERMISSION_DENIED';
    end if;
    insert into public.organizations(name) values ('Your fictional workspace')
    returning id into v_organization_id;
    insert into private.demo_sessions(user_id, organization_id)
    values (auth.uid(), v_organization_id) returning expires_at into v_expires_at;
    insert into public.organization_memberships(organization_id, user_id, role, display_name)
    values (v_organization_id, auth.uid(), 'requester', 'Demo visitor');
    perform public.create_vendor_request(row(
        'Beacon Metrics Inc.', 'https://beacon-metrics.example', 'software',
        'Consolidate weekly operating metrics into one reporting workspace.',
        2400000, 'USD', true, false
    ));
    insert into private.demo_control_events(user_id, action) values (auth.uid(), 'created');
    return v_expires_at;
end;
$$;

create function public.demo_control(p_action text)
returns void language plpgsql security definer set search_path = '' as $$
declare
    v_demo private.demo_sessions;
begin
    if p_action is null or p_action not in ('requester', 'administrator', 'reviewer', 'reset') then
        raise exception using errcode = 'P0001', message = 'VALIDATION_FAILED';
    end if;
    select * into v_demo from private.demo_sessions where user_id = auth.uid() for update;
    if not found then
        raise exception using errcode = 'P0001', message = 'PERMISSION_DENIED';
    end if;
    if v_demo.expires_at <= statement_timestamp() then
        raise exception using errcode = 'P0001', message = 'DEMO_EXPIRED';
    end if;
    if not exists (select 1 from public.organization_memberships
        where user_id = auth.uid() and organization_id = v_demo.organization_id and active) then
        raise exception using errcode = 'P0001', message = 'PERMISSION_DENIED';
    end if;
    if v_demo.control_count >= 200 then
        raise exception using errcode = 'P0001', message = 'DEMO_LIMIT_REACHED';
    end if;
    if p_action = 'reset' then
        delete from public.vendor_request_audit_events where organization_id = v_demo.organization_id;
        delete from public.vendor_requests where organization_id = v_demo.organization_id;
        update public.organization_memberships set role = 'requester'
        where user_id = auth.uid() and organization_id = v_demo.organization_id;
        perform public.create_vendor_request(row(
            'Beacon Metrics Inc.', 'https://beacon-metrics.example', 'software',
            'Consolidate weekly operating metrics into one reporting workspace.',
            2400000, 'USD', true, false
        ));
    else
        update public.organization_memberships set role = p_action::public.membership_role
        where user_id = auth.uid() and organization_id = v_demo.organization_id;
    end if;
    update private.demo_sessions set control_count = control_count + 1 where user_id = auth.uid();
    insert into private.demo_control_events(user_id, action) values (auth.uid(), p_action);
end;
$$;

-- Caps keep both visitor storage and an eventual cleanup batch bounded.
create function private.bound_demo_request()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
    perform 1 from private.demo_sessions where organization_id = new.organization_id for update;
    if found then
        if new.revision > 100 then
            raise exception using errcode = 'P0001', message = 'DEMO_LIMIT_REACHED';
        end if;
        if tg_op = 'INSERT' then
            if (select count(*) from public.vendor_requests
                where organization_id = new.organization_id) >= 100 then
                raise exception using errcode = 'P0001', message = 'DEMO_LIMIT_REACHED';
            end if;
        end if;
    end if;
    return new;
end;
$$;
create trigger bound_demo_request before insert or update on public.vendor_requests
for each row execute function private.bound_demo_request();

create function public.cleanup_expired_demos()
returns integer language plpgsql security definer set search_path = '' as $$
declare
    v_demo private.demo_sessions;
    v_abandoned_user_id uuid;
    v_count integer := 0;
begin
    for v_demo in select * from private.demo_sessions where expires_at <= statement_timestamp()
        order by expires_at limit 1 for update skip locked
    loop
        delete from public.vendor_request_audit_events where organization_id = v_demo.organization_id;
        delete from public.vendor_requests where organization_id = v_demo.organization_id;
        delete from public.organization_memberships where organization_id = v_demo.organization_id;
        delete from private.demo_control_events where user_id = v_demo.user_id;
        delete from private.demo_sessions where user_id = v_demo.user_id;
        delete from public.organizations where id = v_demo.organization_id;
        delete from auth.users where id = v_demo.user_id;
        v_count := v_count + 1;
    end loop;
    -- Failed provisioning can leave an Auth identity without a workspace; expire those too.
    for v_abandoned_user_id in select id from auth.users as actor
        where is_anonymous and created_at <= statement_timestamp() - interval '24 hours'
          and not exists (select 1 from private.demo_sessions where user_id = actor.id)
          and not exists (select 1 from public.organization_memberships where user_id = actor.id)
        order by created_at limit 100 for update skip locked
    loop
        delete from auth.users where id = v_abandoned_user_id;
        v_count := v_count + 1;
    end loop;
    return v_count;
end;
$$;

revoke all on all tables in schema private from public, anon, authenticated;
revoke all on function private.demo_access_valid(uuid) from public, anon, authenticated;
revoke all on function private.bound_demo_request() from public, anon, authenticated;
revoke all on function public.start_demo() from public, anon;
revoke all on function public.demo_control(text) from public, anon;
revoke all on function public.cleanup_expired_demos() from public, anon, authenticated;
grant execute on function public.start_demo() to authenticated;
grant execute on function public.demo_control(text) to authenticated;
grant execute on function public.cleanup_expired_demos() to service_role;

-- Only a demo owner may nominate themselves while playing the administrator role.
-- Standard organizations still require an active member whose role is reviewer.
create or replace function public.assign_vendor_request(
    p_request_id uuid, p_expected_revision integer, p_reviewer_user_id uuid
)
returns public.vendor_request_transition_result
language plpgsql volatile security definer set search_path = '' as $$
declare
    v_actor_user_id uuid := auth.uid();
    v_audit_event_id uuid := extensions.gen_random_uuid();
    v_organization_id uuid;
    v_request public.vendor_requests;
    v_transitioned_at timestamptz := statement_timestamp();
begin
    perform private.assert_request_revision_input(p_request_id, p_expected_revision);
    if p_reviewer_user_id is null then
        raise exception using errcode = 'P0001', message = 'VALIDATION_FAILED';
    end if;
    v_organization_id := private.assert_actor_role('administrator');
    select * into v_request from public.vendor_requests
    where id = p_request_id and organization_id = v_organization_id for update;
    if v_request.id is null then
        raise exception using errcode = 'P0001', message = 'REQUEST_NOT_FOUND';
    end if;
    if v_request.revision <> p_expected_revision then
        raise exception using errcode = 'P0001', message = 'STALE_REVISION';
    end if;
    if v_request.state <> 'submitted' then
        raise exception using errcode = 'P0001', message = 'INVALID_TRANSITION';
    end if;
    perform 1 from public.organization_memberships as membership
    where membership.organization_id = v_organization_id
      and membership.user_id = p_reviewer_user_id and membership.active
      and (membership.role = 'reviewer' or exists (
          select 1 from private.demo_sessions where user_id = auth.uid()
          and user_id = p_reviewer_user_id and organization_id = v_organization_id
          and expires_at > statement_timestamp()
      ));
    if not found then
        raise exception using errcode = 'P0001', message = 'VALIDATION_FAILED';
    end if;
    update public.vendor_requests set state = 'in_review', reviewer_user_id = p_reviewer_user_id,
        revision = revision + 1, updated_at = v_transitioned_at
    where id = p_request_id returning * into v_request;
    insert into public.vendor_request_audit_events (
        id, request_id, organization_id, actor_user_id, actor_role, action,
        previous_state, current_state, reason, resulting_revision, created_at
    ) values (
        v_audit_event_id, v_request.id, v_request.organization_id, v_actor_user_id,
        'administrator', 'assigned', 'submitted', 'in_review', null,
        v_request.revision, v_transitioned_at
    );
    return (v_request.id, 'submitted'::public.vendor_request_state,
        v_request.state, v_request.revision, v_audit_event_id, v_transitioned_at);
end;
$$;
