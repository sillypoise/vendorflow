-- Fixed fictional scenarios, created through the same transitions as visitor actions.
-- Existing workspaces are untouched until their owner explicitly resets them.
create function private.seed_demo_workspace()
returns void language plpgsql security definer set search_path = '' as $$
declare
    v_organization_id uuid := private.assert_actor_role('requester');
    v_sample record;
    v_request public.vendor_requests;
begin
    if not exists (select 1 from private.demo_sessions
        where user_id = auth.uid() and organization_id = v_organization_id) then
        raise exception using errcode = 'P0001', message = 'PERMISSION_DENIED';
    end if;
    if exists (select 1 from public.vendor_requests where organization_id = v_organization_id) then
        raise exception using errcode = 'P0001', message = 'VALIDATION_FAILED';
    end if;
    for v_sample in select * from (values
        ('Beacon Metrics Inc.', 'beacon-metrics', 'software', 2400000, true, false, 'draft',
            'Consolidate weekly operating metrics into one reporting workspace.', null),
        ('Harbor Freight Partners', 'harbor-freight-partners', 'logistics', 7200000,
            false, true, 'submitted',
            'Provide regional warehouse transfers with next-day delivery and tracking.', null),
        ('Cedarbridge Advisory', 'cedarbridge-advisory', 'professional_services', 3600000,
            true, false, 'in_review',
            'Review procurement controls and document approval responsibilities for finance.',
            null),
        ('Northline Support Systems', 'northline-support', 'software', 1800000,
            true, true, 'changes_requested',
            'Replace the shared support inbox with ticket routing and incident escalation.',
            'Attach the data retention policy and confirm the incident notification window.'),
        ('Juniper Workplace Services', 'juniper-workplace', 'facilities', 4200000,
            false, false, 'approved',
            'Maintain two office locations with scheduled cleaning and consumables.', null),
        ('Clearpath Research Studio', 'clearpath-research', 'professional_services', 1500000,
            true, false, 'rejected',
            'Commission customer interviews to inform next quarter product discovery priorities.',
            'An existing research agreement covers this scope; consolidate before renewal.')
    ) as samples(name, slug, category, spend, confidential, critical, state, justification, reason)
    loop
        v_request := public.create_vendor_request(row(v_sample.name,
            'https://' || v_sample.slug || '.example', v_sample.category, v_sample.justification,
            v_sample.spend, 'USD', v_sample.confidential, v_sample.critical));
        if v_sample.state <> 'draft' then
            perform public.submit_vendor_request(v_request.id, 1);
        end if;
        if v_sample.state not in ('draft', 'submitted') then
            update public.organization_memberships set role = 'administrator'
            where user_id = auth.uid() and organization_id = v_organization_id;
            perform public.assign_vendor_request(v_request.id, 2, auth.uid());
        end if;
        if v_sample.state in ('changes_requested', 'approved', 'rejected') then
            update public.organization_memberships set role = 'reviewer'
            where user_id = auth.uid() and organization_id = v_organization_id;
            perform public.review_vendor_request(v_request.id, 3,
                case v_sample.state when 'approved' then 'approve' when 'rejected' then 'reject'
                    else 'request_changes' end, v_sample.reason);
        end if;
        update public.organization_memberships set role = 'requester'
        where user_id = auth.uid() and organization_id = v_organization_id;
    end loop;
end;
$$;
revoke all on function private.seed_demo_workspace() from public, anon, authenticated, service_role;

create or replace function public.start_demo()
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
    perform private.seed_demo_workspace();
    insert into private.demo_control_events(user_id, action) values (auth.uid(), 'created');
    return v_expires_at;
end;
$$;

create or replace function public.demo_control(p_action text)
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
        delete from public.vendor_request_audit_events
        where organization_id = v_demo.organization_id;
        delete from public.vendor_requests where organization_id = v_demo.organization_id;
        update public.organization_memberships set role = 'requester'
        where user_id = auth.uid() and organization_id = v_demo.organization_id;
        perform private.seed_demo_workspace();
    else
        update public.organization_memberships set role = p_action::public.membership_role
        where user_id = auth.uid() and organization_id = v_demo.organization_id;
    end if;
    update private.demo_sessions set control_count = control_count + 1 where user_id = auth.uid();
    insert into private.demo_control_events(user_id, action) values (auth.uid(), p_action);
end;
$$;

