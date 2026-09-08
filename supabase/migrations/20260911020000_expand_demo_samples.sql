-- Keep the fixed scenario catalog separate from the authorized transition orchestration.
-- Three requests per state fill one 20-row page without changing the demo's capacity limits.
create function private.demo_vendor_samples()
returns table (
    name text, slug text, category text, spend_minor_units bigint,
    confidential boolean, critical boolean, state text, justification text, reason text
)
language sql immutable set search_path = '' as $$
    values
    ('Beacon Metrics Inc.', 'beacon-metrics', 'software', 2400000::bigint, true, false, 'draft',
        'Consolidate weekly operating metrics into one reporting workspace.', null),
    ('Harbor Freight Partners', 'harbor-freight-partners', 'logistics', 7200000,
        false, true, 'submitted',
        'Provide regional warehouse transfers with next-day delivery and tracking.', null),
    ('Cedarbridge Advisory', 'cedarbridge-advisory', 'professional_services', 3600000,
        true, false, 'in_review',
        'Review procurement controls and document approval responsibilities for finance.', null),
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
        'An existing research agreement covers this scope; consolidate before renewal.'),
    ('Alder Fleet Leasing', 'alder-fleet', 'logistics', 9600000, true, true, 'draft',
        'Lease four field-service vehicles with maintenance and fleet reporting included.', null),
    ('Redwood Meeting Rooms', 'redwood-meetings', 'facilities', 960000, false, false, 'draft',
        'Book overflow meeting space for quarterly planning and supplier workshops.', null),
    ('Atlas Payroll Services', 'atlas-payroll', 'professional_services', 5400000,
        true, true, 'submitted',
        'Process payroll and statutory filings for the regional employee population.', null),
    ('Orchard Learning Library', 'orchard-learning', 'software', 840000, false, false, 'submitted',
        'License a self-study course catalog without uploading employee records.', null),
    ('Bluepeak Identity Cloud', 'bluepeak-identity', 'software', 4800000, true, true, 'in_review',
        'Centralize single sign-on and access reviews for internal business applications.', null),
    ('Seabrook Packaging Supply', 'seabrook-packaging', 'other', 2880000, false, true, 'in_review',
        'Supply recyclable packaging with safety stock for weekly fulfillment demand.', null),
    ('Willow Records Storage', 'willow-records', 'professional_services', 1440000,
        true, false, 'changes_requested',
        'Store finance records off-site with indexed retrieval and scheduled destruction.',
        'Document destruction procedures and the annual storage price-increase cap.'),
    ('Ridgeway Delivery Network', 'ridgeway-delivery', 'logistics', 6600000,
        false, true, 'changes_requested',
        'Provide scheduled store deliveries and an overflow service during seasonal peaks.',
        'Clarify after-hours coverage and credits for missed delivery commitments.'),
    ('Pinecrest Device Supply', 'pinecrest-devices', 'other', 3200000, false, false, 'approved',
        'Purchase replacement laptops and docking stations through a fixed-price catalog.', null),
    ('Lakeshore Accessibility Studio', 'lakeshore-accessibility', 'professional_services',
        2250000, true, false, 'approved',
        'Review a pre-release customer portal and prioritize accessibility fixes.', null),
    ('Summit Conference Passes', 'summit-conference', 'other', 1250000, false, false, 'rejected',
        'Reserve eight event passes for product research and partnership development.',
        'Defer until the team has an attendance plan and an approved travel budget.'),
    ('Silverfern Invoice Automation', 'silverfern-invoices', 'software', 1980000,
        true, false, 'rejected',
        'Extract invoice details and route exceptions into the finance approval queue.',
        'Proposed data residency does not meet the finance team''s requirements.');
$$;
revoke all on function private.demo_vendor_samples() from public, anon, authenticated, service_role;

create or replace function private.seed_demo_workspace()
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
    for v_sample in select * from private.demo_vendor_samples()
    loop
        v_request := public.create_vendor_request(row(v_sample.name,
            'https://' || v_sample.slug || '.example', v_sample.category, v_sample.justification,
            v_sample.spend_minor_units, 'USD', v_sample.confidential, v_sample.critical));
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
