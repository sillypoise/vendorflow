-- All records are fictional and exist only for local portfolio development.
insert into auth.users (
    id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, is_sso_user, is_anonymous
) values
    (
        '20000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
        'maya.requester@vendorflow.example', statement_timestamp(),
        '{"provider":"email","providers":["email"]}', '{"full_name":"Maya Chen"}',
        statement_timestamp(), statement_timestamp(), false, false
    ),
    (
        '20000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
        'jon.reviewer@vendorflow.example', statement_timestamp(),
        '{"provider":"email","providers":["email"]}', '{"full_name":"Jon Bell"}',
        statement_timestamp(), statement_timestamp(), false, false
    ),
    (
        '20000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated',
        'priya.admin@vendorflow.example', statement_timestamp(),
        '{"provider":"email","providers":["email"]}', '{"full_name":"Priya Shah"}',
        statement_timestamp(), statement_timestamp(), false, false
    ),
    (
        '20000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated',
        'elliot.requester@vendorflow.example', statement_timestamp(),
        '{"provider":"email","providers":["email"]}', '{"full_name":"Elliot Stone"}',
        statement_timestamp(), statement_timestamp(), false, false
    ),
    (
        '20000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated',
        'nina.external@vendorflow.example', statement_timestamp(),
        '{"provider":"email","providers":["email"]}', '{"full_name":"Nina Brooks"}',
        statement_timestamp(), statement_timestamp(), false, false
    );

insert into public.organizations (id, name) values
    ('10000000-0000-4000-8000-000000000001', 'Harborline Operations'),
    ('10000000-0000-4000-8000-000000000002', 'Pinecrest Labs');

insert into public.organization_memberships (organization_id, user_id, role, active) values
    (
        '10000000-0000-4000-8000-000000000001',
        '20000000-0000-4000-8000-000000000001',
        'requester',
        true
    ),
    (
        '10000000-0000-4000-8000-000000000001',
        '20000000-0000-4000-8000-000000000002',
        'reviewer',
        true
    ),
    (
        '10000000-0000-4000-8000-000000000001',
        '20000000-0000-4000-8000-000000000003',
        'administrator',
        true
    ),
    (
        '10000000-0000-4000-8000-000000000001',
        '20000000-0000-4000-8000-000000000004',
        'requester',
        true
    ),
    (
        '10000000-0000-4000-8000-000000000002',
        '20000000-0000-4000-8000-000000000005',
        'requester',
        true
    );

insert into public.vendor_requests (
    id, organization_id, owner_user_id, reviewer_user_id, vendor_legal_name,
    vendor_website, service_category, business_justification, annual_spend_minor_units,
    currency_code, receives_confidential_data, supports_critical_process, state, revision,
    created_at, updated_at
) values
    (
        '30000000-0000-4000-8000-000000000001',
        '10000000-0000-4000-8000-000000000001',
        '20000000-0000-4000-8000-000000000001',
        null, 'Copperline Events', null, null, null, null, null, null, null,
        'draft', 1, statement_timestamp() - interval '4 days',
        statement_timestamp() - interval '4 days'
    ),
    (
        '30000000-0000-4000-8000-000000000002',
        '10000000-0000-4000-8000-000000000001',
        '20000000-0000-4000-8000-000000000001',
        null, 'Atlas Facilities LLC', 'https://atlas-facilities.example', 'facilities',
        'Provide preventative maintenance for the new regional office.', 4800000, 'USD',
        false, true, 'submitted', 2, statement_timestamp() - interval '3 days',
        statement_timestamp() - interval '2 days'
    ),
    (
        '30000000-0000-4000-8000-000000000003',
        '10000000-0000-4000-8000-000000000001',
        '20000000-0000-4000-8000-000000000004',
        '20000000-0000-4000-8000-000000000002',
        'Beacon Metrics Inc.', 'https://beacon-metrics.example', 'software',
        'Consolidate weekly operating metrics into one reporting workspace.', 2400000, 'USD',
        true, false, 'in_review', 3, statement_timestamp() - interval '5 days',
        statement_timestamp() - interval '1 day'
    ),
    (
        '30000000-0000-4000-8000-000000000004',
        '10000000-0000-4000-8000-000000000001',
        '20000000-0000-4000-8000-000000000001',
        '20000000-0000-4000-8000-000000000002',
        'Cedar Legal Partners', 'https://cedar-legal.example', 'professional_services',
        'Review updated supplier terms for the annual purchasing cycle.', 1800000, 'USD',
        true, true, 'changes_requested', 4, statement_timestamp() - interval '7 days',
        statement_timestamp() - interval '6 hours'
    ),
    (
        '30000000-0000-4000-8000-000000000005',
        '10000000-0000-4000-8000-000000000002',
        '20000000-0000-4000-8000-000000000005',
        null, 'Pinecrest Courier', null, 'logistics', null, null, null, false, false,
        'draft', 1, statement_timestamp() - interval '1 day',
        statement_timestamp() - interval '1 day'
    );

insert into public.vendor_request_audit_events (
    id, request_id, organization_id, actor_user_id, actor_role, action,
    previous_state, current_state, reason, resulting_revision, created_at
) values
    (
        '40000000-0000-4000-8000-000000000001',
        '30000000-0000-4000-8000-000000000001',
        '10000000-0000-4000-8000-000000000001',
        '20000000-0000-4000-8000-000000000001',
        'requester', 'created', null, 'draft', null, 1,
        statement_timestamp() - interval '4 days'
    ),
    (
        '40000000-0000-4000-8000-000000000002',
        '30000000-0000-4000-8000-000000000002',
        '10000000-0000-4000-8000-000000000001',
        '20000000-0000-4000-8000-000000000001',
        'requester', 'created', null, 'draft', null, 1,
        statement_timestamp() - interval '3 days'
    ),
    (
        '40000000-0000-4000-8000-000000000003',
        '30000000-0000-4000-8000-000000000002',
        '10000000-0000-4000-8000-000000000001',
        '20000000-0000-4000-8000-000000000001',
        'requester', 'submitted', 'draft', 'submitted', null, 2,
        statement_timestamp() - interval '2 days'
    ),
    (
        '40000000-0000-4000-8000-000000000004',
        '30000000-0000-4000-8000-000000000003',
        '10000000-0000-4000-8000-000000000001',
        '20000000-0000-4000-8000-000000000004',
        'requester', 'created', null, 'draft', null, 1,
        statement_timestamp() - interval '5 days'
    ),
    (
        '40000000-0000-4000-8000-000000000005',
        '30000000-0000-4000-8000-000000000003',
        '10000000-0000-4000-8000-000000000001',
        '20000000-0000-4000-8000-000000000004',
        'requester', 'submitted', 'draft', 'submitted', null, 2,
        statement_timestamp() - interval '2 days'
    ),
    (
        '40000000-0000-4000-8000-000000000006',
        '30000000-0000-4000-8000-000000000003',
        '10000000-0000-4000-8000-000000000001',
        '20000000-0000-4000-8000-000000000003',
        'administrator', 'assigned', 'submitted', 'in_review', null, 3,
        statement_timestamp() - interval '1 day'
    ),
    (
        '40000000-0000-4000-8000-000000000007',
        '30000000-0000-4000-8000-000000000004',
        '10000000-0000-4000-8000-000000000001',
        '20000000-0000-4000-8000-000000000001',
        'requester', 'created', null, 'draft', null, 1,
        statement_timestamp() - interval '7 days'
    ),
    (
        '40000000-0000-4000-8000-000000000008',
        '30000000-0000-4000-8000-000000000004',
        '10000000-0000-4000-8000-000000000001',
        '20000000-0000-4000-8000-000000000001',
        'requester', 'submitted', 'draft', 'submitted', null, 2,
        statement_timestamp() - interval '6 days'
    ),
    (
        '40000000-0000-4000-8000-000000000009',
        '30000000-0000-4000-8000-000000000004',
        '10000000-0000-4000-8000-000000000001',
        '20000000-0000-4000-8000-000000000003',
        'administrator', 'assigned', 'submitted', 'in_review', null, 3,
        statement_timestamp() - interval '5 days'
    ),
    (
        '40000000-0000-4000-8000-000000000010',
        '30000000-0000-4000-8000-000000000004',
        '10000000-0000-4000-8000-000000000001',
        '20000000-0000-4000-8000-000000000002',
        'reviewer', 'requested_changes', 'in_review', 'changes_requested',
        'Attach the current data-processing agreement before approval.', 4,
        statement_timestamp() - interval '6 hours'
    ),
    (
        '40000000-0000-4000-8000-000000000011',
        '30000000-0000-4000-8000-000000000005',
        '10000000-0000-4000-8000-000000000002',
        '20000000-0000-4000-8000-000000000005',
        'requester', 'created', null, 'draft', null, 1,
        statement_timestamp() - interval '1 day'
    );
