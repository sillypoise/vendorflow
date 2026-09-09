begin;
create extension if not exists pgtap with schema extensions;
select extensions.no_plan();

-- Test legacy, customized, and ordinary labels. A unit check pins this inline backfill to its
-- migration because the Supabase test container mounts only the tests directory.
insert into auth.users(id, is_anonymous) values
    ('92000000-0000-4000-8000-000000000001', true),
    ('92000000-0000-4000-8000-000000000002', true),
    ('92000000-0000-4000-8000-000000000003', false);
select set_config('request.jwt.claim.sub', '92000000-0000-4000-8000-000000000001', true);
select public.start_demo();
select extensions.is((select name from public.organizations where id = (
    select organization_id from private.demo_sessions where user_id = auth.uid()
)), 'Private preview workspace', 'new workspaces receive preview labels');
select extensions.is((select display_name from public.organization_memberships
    where user_id = auth.uid()), 'Preview visitor', 'new membership receives preview label');
update public.organizations set name = 'Your fictional workspace' where id = (
    select organization_id from private.demo_sessions where user_id = auth.uid());
update public.organization_memberships set display_name = 'Demo visitor' where user_id = auth.uid();
create temporary table label_snapshot as select expires_at, control_count,
    (select jsonb_agg(to_jsonb(request) order by request.id) from public.vendor_requests as request
        where request.organization_id = session.organization_id) as requests
from private.demo_sessions as session where user_id = auth.uid();

select set_config('request.jwt.claim.sub', '92000000-0000-4000-8000-000000000002', true);
select public.start_demo();
update public.organizations set name = 'Design operations' where id = (
    select organization_id from private.demo_sessions where user_id = auth.uid());
update public.organization_memberships set display_name = 'Sasha' where user_id = auth.uid();
insert into public.organizations(id, name)
values ('92000000-0000-4000-8000-000000000004', 'Your fictional workspace');
insert into public.organization_memberships(organization_id, user_id, role, display_name)
values ('92000000-0000-4000-8000-000000000004', '92000000-0000-4000-8000-000000000003',
    'requester', 'Demo visitor');

-- Rename only system-generated labels in isolated workspaces, not visitor-authored content.
update public.organizations as organization set name = 'Private preview workspace'
from private.demo_sessions as session
where organization.id = session.organization_id and organization.name = 'Your fictional workspace';
update public.organization_memberships as membership set display_name = 'Preview visitor'
from private.demo_sessions as session
where membership.user_id = session.user_id and membership.organization_id = session.organization_id
    and membership.display_name = 'Demo visitor';

select extensions.is((select name from public.organizations where id = (
    select organization_id from private.demo_sessions where user_id = auth.uid()
)), 'Design operations', 'custom workspace names are preserved');
select extensions.is((select display_name from public.organization_memberships
    where user_id = auth.uid()), 'Sasha', 'custom display names are preserved');
select extensions.is((select name from public.organizations
    where id = '92000000-0000-4000-8000-000000000004'), 'Your fictional workspace',
    'ordinary organization names are preserved');
select extensions.is((select display_name from public.organization_memberships
    where user_id = '92000000-0000-4000-8000-000000000003'), 'Demo visitor',
    'ordinary membership names are preserved');
select set_config('request.jwt.claim.sub', '92000000-0000-4000-8000-000000000001', true);
select extensions.is((select name from public.organizations where id = (
    select organization_id from private.demo_sessions where user_id = auth.uid()
)), 'Private preview workspace', 'legacy generated workspace labels are renamed');
select extensions.is((select display_name from public.organization_memberships
    where user_id = auth.uid()), 'Preview visitor', 'legacy generated member labels are renamed');
select extensions.is((select expires_at from private.demo_sessions where user_id = auth.uid()),
    (select expires_at from label_snapshot), 'label migration preserves expiry');
select extensions.is((select control_count from private.demo_sessions where user_id = auth.uid()),
    (select control_count from label_snapshot), 'label migration preserves control capacity');
select extensions.is((select jsonb_agg(to_jsonb(request) order by request.id)
    from public.vendor_requests as request where owner_user_id = auth.uid()),
    (select requests from label_snapshot), 'label migration preserves every request field');
select * from extensions.finish();
rollback;
