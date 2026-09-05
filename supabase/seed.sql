-- All records are fictional and exist only for local portfolio development.
insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    phone_change, phone_change_token, reauthentication_token, raw_app_meta_data,
    raw_user_meta_data, created_at, updated_at, is_sso_user, is_anonymous
)
select
    '00000000-0000-0000-0000-000000000000', fixture.id, 'authenticated', 'authenticated',
    fixture.email, '$2a$10$TQ/WXmingWBWR6Md0Cnh8.oUxZgXCz5RoF6v2DQ/ZqEaz8k4X0UOO',
    statement_timestamp(), '', '', '', '', '', '', '',
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('full_name', fixture.full_name), statement_timestamp(),
    statement_timestamp(), false, false
from (
    values
        ('20000000-0000-4000-8000-000000000001'::uuid,
            'maya.requester@vendorflow.example', 'Maya Chen'),
        ('20000000-0000-4000-8000-000000000002'::uuid,
            'jon.reviewer@vendorflow.example', 'Jon Bell'),
        ('20000000-0000-4000-8000-000000000003'::uuid,
            'priya.admin@vendorflow.example', 'Priya Shah'),
        ('20000000-0000-4000-8000-000000000004'::uuid,
            'elliot.requester@vendorflow.example', 'Elliot Stone'),
        ('20000000-0000-4000-8000-000000000005'::uuid,
            'nina.external@vendorflow.example', 'Nina Brooks')
) as fixture(id, email, full_name);

insert into auth.identities (
    id, provider_id, user_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
)
select
    users.id, users.id::text, users.id,
    jsonb_build_object(
        'sub', users.id::text, 'email', users.email,
        'email_verified', true, 'phone_verified', false
    ),
    'email', statement_timestamp(), statement_timestamp(), statement_timestamp()
from auth.users as users
where users.email like '%@vendorflow.example';

insert into public.organizations (id, name) values
    ('10000000-0000-4000-8000-000000000001', 'Harborline Operations'),
    ('10000000-0000-4000-8000-000000000002', 'Pinecrest Labs');

insert into public.organization_memberships (
    organization_id, user_id, display_name, role, active
) values
    (
        '10000000-0000-4000-8000-000000000001',
        '20000000-0000-4000-8000-000000000001', 'Maya Chen', 'requester', true
    ),
    (
        '10000000-0000-4000-8000-000000000001',
        '20000000-0000-4000-8000-000000000002', 'Jon Bell', 'reviewer', true
    ),
    (
        '10000000-0000-4000-8000-000000000001',
        '20000000-0000-4000-8000-000000000003', 'Priya Shah', 'administrator', true
    ),
    (
        '10000000-0000-4000-8000-000000000001',
        '20000000-0000-4000-8000-000000000004', 'Elliot Stone', 'requester', true
    ),
    (
        '10000000-0000-4000-8000-000000000002',
        '20000000-0000-4000-8000-000000000005', 'Nina Brooks', 'requester', true
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
