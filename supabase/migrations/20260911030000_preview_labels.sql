-- Presentation-only changes: retain RPC names, authority, expiry, and visitor data.
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
    insert into public.organizations(name) values ('Private preview workspace')
    returning id into v_organization_id;
    insert into private.demo_sessions(user_id, organization_id)
    values (auth.uid(), v_organization_id) returning expires_at into v_expires_at;
    insert into public.organization_memberships(organization_id, user_id, role, display_name)
    values (v_organization_id, auth.uid(), 'requester', 'Preview visitor');
    perform private.seed_demo_workspace();
    insert into private.demo_control_events(user_id, action) values (auth.uid(), 'created');
    return v_expires_at;
end;
$$;

-- Rename only system-generated labels in isolated workspaces, not visitor-authored content.
update public.organizations as organization set name = 'Private preview workspace'
from private.demo_sessions as session
where organization.id = session.organization_id and organization.name = 'Your fictional workspace';
update public.organization_memberships as membership set display_name = 'Preview visitor'
from private.demo_sessions as session
where membership.user_id = session.user_id and membership.organization_id = session.organization_id
    and membership.display_name = 'Demo visitor';
