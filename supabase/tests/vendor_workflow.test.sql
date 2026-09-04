begin;

create extension if not exists pgtap with schema extensions;

-- The fixture is rebuilt inside this transaction so repeated runs are independent of seed state.
delete from public.vendor_request_audit_events;
delete from public.vendor_requests;
delete from public.organization_memberships;
delete from public.organizations;
delete from auth.users where email like '%@vendorflow.example';

insert into auth.users (id, aud, role, email, created_at, updated_at, is_sso_user, is_anonymous)
values
    (
        '20000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
        'requester-a@vendorflow.example', statement_timestamp(), statement_timestamp(), false, false
    ),
    (
        '20000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
        'reviewer@vendorflow.example', statement_timestamp(), statement_timestamp(), false, false
    ),
    (
        '20000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated',
        'administrator@vendorflow.example', statement_timestamp(), statement_timestamp(), false,
        false
    ),
    (
        '20000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated',
        'requester-b@vendorflow.example', statement_timestamp(), statement_timestamp(), false, false
    ),
    (
        '20000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated',
        'external@vendorflow.example', statement_timestamp(), statement_timestamp(), false, false
    ),
    (
        '20000000-0000-4000-8000-000000000006', 'authenticated', 'authenticated',
        'inactive-reviewer@vendorflow.example', statement_timestamp(), statement_timestamp(), false,
        false
    );

insert into public.organizations (id, name)
values
    ('10000000-0000-4000-8000-000000000001', 'Workflow Test Organization'),
    ('10000000-0000-4000-8000-000000000002', 'External Test Organization');

insert into public.organization_memberships (organization_id, user_id, role, active)
values
    (
        '10000000-0000-4000-8000-000000000001',
        '20000000-0000-4000-8000-000000000001', 'requester', true
    ),
    (
        '10000000-0000-4000-8000-000000000001',
        '20000000-0000-4000-8000-000000000002', 'reviewer', true
    ),
    (
        '10000000-0000-4000-8000-000000000001',
        '20000000-0000-4000-8000-000000000003', 'administrator', true
    ),
    (
        '10000000-0000-4000-8000-000000000001',
        '20000000-0000-4000-8000-000000000004', 'requester', true
    ),
    (
        '10000000-0000-4000-8000-000000000002',
        '20000000-0000-4000-8000-000000000005', 'requester', true
    ),
    (
        '10000000-0000-4000-8000-000000000001',
        '20000000-0000-4000-8000-000000000006', 'reviewer', false
    );

insert into public.vendor_requests (
    id, organization_id, owner_user_id, reviewer_user_id, vendor_legal_name,
    vendor_website, service_category, business_justification, annual_spend_minor_units,
    currency_code, receives_confidential_data, supports_critical_process, state, revision
)
values
    (
        '30000000-0000-4000-8000-000000000001',
        '10000000-0000-4000-8000-000000000001',
        '20000000-0000-4000-8000-000000000001', null,
        null, null, null, null, null, null, null, null, 'draft', 1
    ),
    (
        '30000000-0000-4000-8000-000000000002',
        '10000000-0000-4000-8000-000000000001',
        '20000000-0000-4000-8000-000000000001', null,
        'Assigned Later Inc.', 'https://assigned-later.example', 'software',
        'Provide a complete submitted fixture for assignment validation.',
        100000, 'USD', false, false, 'submitted', 2
    ),
    (
        '30000000-0000-4000-8000-000000000003',
        '10000000-0000-4000-8000-000000000001',
        '20000000-0000-4000-8000-000000000004',
        '20000000-0000-4000-8000-000000000002',
        'Rejectable Inc.', 'https://rejectable.example', 'professional_services',
        'Provide a complete in-review fixture for rejection validation.',
        200000, 'USD', true, false, 'in_review', 3
    ),
    (
        '30000000-0000-4000-8000-000000000004',
        '10000000-0000-4000-8000-000000000001',
        '20000000-0000-4000-8000-000000000001',
        '20000000-0000-4000-8000-000000000002',
        'Correction Fixture Inc.', 'https://correction-fixture.example', 'facilities',
        'Provide a complete changes-requested fixture for visibility validation.',
        300000, 'USD', false, true, 'changes_requested', 4
    ),
    (
        '30000000-0000-4000-8000-000000000005',
        '10000000-0000-4000-8000-000000000002',
        '20000000-0000-4000-8000-000000000005', null,
        null, null, null, null, null, null, null, null, 'draft', 1
    ),
    (
        '30000000-0000-4000-8000-000000000006',
        '10000000-0000-4000-8000-000000000001',
        '20000000-0000-4000-8000-000000000004', null,
        null, null, null, null, null, null, null, null, 'draft', 1
    );

select extensions.plan(86);

-- Schema and grants establish fail-closed boundaries before behavior tests run.
select extensions.has_table('public', 'organizations', 'organizations table exists');
select extensions.has_table(
    'public', 'organization_memberships', 'organization memberships table exists'
);
select extensions.has_table('public', 'vendor_requests', 'vendor requests table exists');
select extensions.has_table(
    'public', 'vendor_request_audit_events', 'vendor request audit events table exists'
);
select extensions.is(
    (select count(*) from pg_policies where schemaname = 'public'),
    4::bigint,
    'all four public tables have select policies'
);
select extensions.ok(
    has_function_privilege(
        'authenticated',
        'public.create_vendor_request(public.vendor_request_draft_input)',
        'execute'
    ),
    'authenticated users can execute the draft creation function'
);
select extensions.ok(
    not has_table_privilege('authenticated', 'public.vendor_requests', 'insert'),
    'authenticated users cannot insert request rows directly'
);
select extensions.ok(
    not has_table_privilege('authenticated', 'public.vendor_request_audit_events', 'update'),
    'authenticated users cannot update audit events'
);
select extensions.ok(
    not has_table_privilege('authenticated', 'public.vendor_request_audit_events', 'delete'),
    'authenticated users cannot delete audit events'
);
select extensions.ok(
    not has_function_privilege(
        'anon',
        'public.create_vendor_request(public.vendor_request_draft_input)',
        'execute'
    ),
    'anonymous users cannot execute the draft creation function'
);

select set_config(
    'request.jwt.claim.sub', '20000000-0000-4000-8000-000000000001', true
);
set local role authenticated;

select extensions.is(
    (select count(*) from public.vendor_requests),
    3::bigint,
    'a requester sees only their three organization requests'
);
select extensions.is(
    (
        select count(*) from public.vendor_requests
        where id = '30000000-0000-4000-8000-000000000006'
    ),
    0::bigint,
    'a requester cannot see another requester private draft'
);
select extensions.is(
    (
        select count(*) from public.vendor_requests
        where organization_id = '10000000-0000-4000-8000-000000000002'
    ),
    0::bigint,
    'a requester cannot see another organization request'
);
select extensions.is(
    (select count(*) from public.organizations),
    1::bigint,
    'a requester sees only their organization'
);
select extensions.is(
    (select count(*) from public.organization_memberships),
    1::bigint,
    'a requester sees only their own membership'
);
select extensions.lives_ok(
    $test$
        select public.create_vendor_request(row(
            'Test Supply Inc.', 'https://test-supply.example', 'software',
            'Provide a complete request used by the workflow transition tests.',
            500000, 'USD', true, false
        ))
    $test$,
    'a requester can create a complete draft'
);
select extensions.is(
    (
        select owner_user_id from public.vendor_requests
        where vendor_legal_name = 'Test Supply Inc.'
    ),
    '20000000-0000-4000-8000-000000000001'::uuid,
    'draft ownership comes from the authenticated identity'
);
select extensions.is(
    (
        select state from public.vendor_requests
        where vendor_legal_name = 'Test Supply Inc.'
    ),
    'draft'::public.vendor_request_state,
    'new requests start as drafts'
);
select extensions.is(
    (
        select count(*) from public.vendor_request_audit_events
        where request_id = (
            select id from public.vendor_requests where vendor_legal_name = 'Test Supply Inc.'
        )
    ),
    1::bigint,
    'draft creation adds one immutable audit event'
);
select extensions.lives_ok(
    $test$
        select public.create_vendor_request(
            row(null, null, null, null, null, null, null, null)
        )
    $test$,
    'an incomplete draft is allowed'
);
select extensions.throws_ok(
    $test$
        select public.create_vendor_request(null::public.vendor_request_draft_input)
    $test$,
    'P0001', 'VALIDATION_FAILED', 'a missing draft input is rejected'
);
select extensions.throws_ok(
    $test$
        select public.submit_vendor_request(
            (
                select id from public.vendor_requests
                where vendor_legal_name is null
                  and id <> '30000000-0000-4000-8000-000000000001'
                limit 1
            ),
            1
        )
    $test$,
    'P0001',
    'VALIDATION_FAILED',
    'an incomplete draft cannot be submitted'
);
select extensions.is(
    (
        select count(*) from public.vendor_request_audit_events
        where request_id = (
            select id from public.vendor_requests
            where vendor_legal_name is null
              and id <> '30000000-0000-4000-8000-000000000001'
            limit 1
        )
    ),
    1::bigint,
    'failed submission does not append an audit event'
);
select extensions.throws_ok(
    $test$
        select public.create_vendor_request(row(
            '', 'https://name-empty.example', 'other',
            'This justification is long enough for the validation boundary.',
            1, 'USD', false, false
        ))
    $test$,
    'P0001', 'VALIDATION_FAILED', 'an empty legal name is rejected'
);
select extensions.throws_ok(
    $test$
        select public.create_vendor_request(row(
            repeat('n', 161), 'https://name-too-long.example', 'other',
            'This justification is long enough for the validation boundary.',
            1, 'USD', false, false
        ))
    $test$,
    'P0001', 'VALIDATION_FAILED', 'a name above 160 characters is rejected'
);
select extensions.throws_ok(
    $test$
        select public.create_vendor_request(row(
            'HTTP Vendor', 'http://insecure.example', 'other',
            'This justification is long enough for the validation boundary.',
            1, 'USD', false, false
        ))
    $test$,
    'P0001', 'VALIDATION_FAILED', 'a non-HTTPS website is rejected'
);
select extensions.throws_ok(
    $test$
        select public.create_vendor_request(row(
            'Long Website', 'https://' || repeat('a', 2041), 'other',
            'This justification is long enough for the validation boundary.',
            1, 'USD', false, false
        ))
    $test$,
    'P0001', 'VALIDATION_FAILED', 'a website above 2,048 characters is rejected'
);
select extensions.throws_ok(
    $test$
        select public.create_vendor_request(row(
            'Invalid Category', 'https://invalid-category.example', 'unknown',
            'This justification is long enough for the validation boundary.',
            1, 'USD', false, false
        ))
    $test$,
    'P0001', 'VALIDATION_FAILED', 'an unsupported category is rejected'
);
select extensions.throws_ok(
    $test$
        select public.create_vendor_request(row(
            'Short Reason', 'https://short-reason.example', 'other', repeat('j', 19),
            1, 'USD', false, false
        ))
    $test$,
    'P0001', 'VALIDATION_FAILED', 'a justification below 20 characters is rejected'
);
select extensions.throws_ok(
    $test$
        select public.create_vendor_request(row(
            'Long Justification', 'https://long-justification.example', 'other',
            repeat('j', 2001), 1, 'USD', false, false
        ))
    $test$,
    'P0001', 'VALIDATION_FAILED', 'a justification above 2,000 characters is rejected'
);
select extensions.throws_ok(
    $test$
        select public.create_vendor_request(row(
            'Negative Spend', 'https://negative-spend.example', 'other',
            'This justification is long enough for the validation boundary.',
            -1, 'USD', false, false
        ))
    $test$,
    'P0001', 'VALIDATION_FAILED', 'negative spend is rejected'
);
select extensions.throws_ok(
    $test$
        select public.create_vendor_request(row(
            'Excess Spend', 'https://excess-spend.example', 'other',
            'This justification is long enough for the validation boundary.',
            1000000001, 'USD', false, false
        ))
    $test$,
    'P0001', 'VALIDATION_FAILED', 'spend above the declared maximum is rejected'
);
select extensions.throws_ok(
    $test$
        select public.create_vendor_request(row(
            'Euro Vendor', 'https://euro-vendor.example', 'other',
            'This justification is long enough for the validation boundary.',
            1, 'EUR', false, false
        ))
    $test$,
    'P0001', 'VALIDATION_FAILED', 'an unsupported currency is rejected'
);
select extensions.lives_ok(
    $test$
        select public.create_vendor_request(row(
            'N', 'https://boundary.example', 'other', '12345678901234567890',
            1000000000, 'USD', false, false
        ))
    $test$,
    'declared inclusive field maxima are accepted'
);
select extensions.lives_ok(
    $test$
        select public.update_vendor_request(
            (select id from public.vendor_requests where vendor_legal_name = 'N'), 1,
            row(
                'N', 'https://boundary.example', 'other', '12345678901234567890',
                0, 'USD', false, false
            )
        )
    $test$,
    'zero spend and minimum text lengths are accepted'
);
select extensions.throws_ok(
    $test$
        select public.update_vendor_request(
            (select id from public.vendor_requests where vendor_legal_name = 'N'), 2,
            null::public.vendor_request_draft_input
        )
    $test$,
    'P0001', 'VALIDATION_FAILED', 'a missing replacement draft input is rejected'
);
select extensions.throws_ok(
    $test$
        select public.assign_vendor_request(
            '30000000-0000-4000-8000-000000000002', 2,
            '20000000-0000-4000-8000-000000000002'
        )
    $test$,
    'P0001', 'PERMISSION_DENIED', 'a requester cannot assign a reviewer'
);
select extensions.throws_ok(
    $test$
        select public.submit_vendor_request(
            (select id from public.vendor_requests where vendor_legal_name = 'Test Supply Inc.'), 0
        )
    $test$,
    'P0001', 'VALIDATION_FAILED', 'a revision below 1 is rejected'
);
select extensions.lives_ok(
    $test$
        select public.submit_vendor_request(
            (select id from public.vendor_requests where vendor_legal_name = 'Test Supply Inc.'), 1
        )
    $test$,
    'a requester can submit a complete owned draft'
);
select extensions.is(
    (select state from public.vendor_requests where vendor_legal_name = 'Test Supply Inc.'),
    'submitted'::public.vendor_request_state,
    'submission changes state to submitted'
);
select extensions.is(
    (select revision from public.vendor_requests where vendor_legal_name = 'Test Supply Inc.'),
    2,
    'submission increments the revision once'
);
select extensions.is(
    (
        select count(*) from public.vendor_request_audit_events
        where request_id = (
            select id from public.vendor_requests where vendor_legal_name = 'Test Supply Inc.'
        )
    ),
    2::bigint,
    'submission and creation each have one audit event'
);
select extensions.throws_ok(
    $test$
        select public.submit_vendor_request(
            (select id from public.vendor_requests where vendor_legal_name = 'Test Supply Inc.'), 1
        )
    $test$,
    'P0001', 'STALE_REVISION', 'a stale submission is rejected before mutation'
);
select extensions.throws_ok(
    $test$
        select public.submit_vendor_request(
            (select id from public.vendor_requests where vendor_legal_name = 'Test Supply Inc.'), 2
        )
    $test$,
    'P0001', 'INVALID_TRANSITION', 'a submitted request cannot be submitted again'
);

reset role;
select set_config(
    'request.jwt.claim.sub', '20000000-0000-4000-8000-000000000003', true
);
set local role authenticated;

select extensions.is(
    (select count(*) from public.vendor_requests),
    8::bigint,
    'an administrator sees every request in their organization'
);
select extensions.is(
    (select count(*) from public.organization_memberships),
    5::bigint,
    'an administrator sees every membership in their organization'
);
select extensions.lives_ok(
    $test$
        select public.assign_vendor_request(
            (select id from public.vendor_requests where vendor_legal_name = 'Test Supply Inc.'), 2,
            '20000000-0000-4000-8000-000000000002'
        )
    $test$,
    'an administrator can assign an active same-organization reviewer'
);
select extensions.is(
    (select state from public.vendor_requests where vendor_legal_name = 'Test Supply Inc.'),
    'in_review'::public.vendor_request_state,
    'assignment starts review'
);
select extensions.is(
    (select revision from public.vendor_requests where vendor_legal_name = 'Test Supply Inc.'),
    3,
    'assignment increments the revision once'
);
select extensions.throws_ok(
    $test$
        select public.assign_vendor_request(
            '30000000-0000-4000-8000-000000000002', 2,
            '20000000-0000-4000-8000-000000000005'
        )
    $test$,
    'P0001', 'VALIDATION_FAILED', 'a cross-organization non-reviewer cannot be assigned'
);
select extensions.throws_ok(
    $test$
        select public.review_vendor_request(
            (select id from public.vendor_requests where vendor_legal_name = 'Test Supply Inc.'),
            3, 'approve', null
        )
    $test$,
    'P0001', 'PERMISSION_DENIED', 'an administrator cannot make a review decision'
);

reset role;
select set_config(
    'request.jwt.claim.sub', '20000000-0000-4000-8000-000000000002', true
);
set local role authenticated;

select extensions.is(
    (select count(*) from public.vendor_requests),
    3::bigint,
    'a reviewer sees only their three assigned requests'
);
select extensions.is(
    (
        select count(*) from public.vendor_requests
        where id = '30000000-0000-4000-8000-000000000002'
    ),
    0::bigint,
    'a reviewer cannot see an unassigned submitted request'
);
select extensions.throws_ok(
    $test$
        select public.review_vendor_request(
            '30000000-0000-4000-8000-000000000002', 2, 'approve', null
        )
    $test$,
    'P0001', 'PERMISSION_DENIED', 'a reviewer cannot act on an unassigned request'
);
select extensions.lives_ok(
    $test$
        select public.review_vendor_request(
            (select id from public.vendor_requests where vendor_legal_name = 'Test Supply Inc.'),
            3, 'request_changes', 'Attach the current data-processing agreement.'
        )
    $test$,
    'an assigned reviewer can request changes'
);
select extensions.is(
    (select state from public.vendor_requests where vendor_legal_name = 'Test Supply Inc.'),
    'changes_requested'::public.vendor_request_state,
    'requesting changes updates the workflow state'
);
select extensions.is(
    (select revision from public.vendor_requests where vendor_legal_name = 'Test Supply Inc.'),
    4,
    'requesting changes increments the revision once'
);
select extensions.is(
    (
        select reason from public.vendor_request_audit_events
        where request_id = (
            select id from public.vendor_requests where vendor_legal_name = 'Test Supply Inc.'
        ) and action = 'requested_changes'
    ),
    'Attach the current data-processing agreement.'::text,
    'the change reason is recorded in the audit event'
);
select extensions.throws_ok(
    $test$
        select public.review_vendor_request(
            '30000000-0000-4000-8000-000000000003', 3, 'reject', null
        )
    $test$,
    'P0001', 'VALIDATION_FAILED', 'rejection requires a reason'
);
select extensions.throws_ok(
    $test$
        select public.review_vendor_request(
            '30000000-0000-4000-8000-000000000003', 3, 'reject', ''
        )
    $test$,
    'P0001', 'VALIDATION_FAILED', 'an empty rejection reason is rejected'
);
select extensions.lives_ok(
    $test$
        select public.review_vendor_request(
            '30000000-0000-4000-8000-000000000003', 3, 'reject',
            'The service duplicates an existing agreement.'
        )
    $test$,
    'an assigned reviewer can reject with a reason'
);
select extensions.is(
    (
        select state from public.vendor_requests
        where id = '30000000-0000-4000-8000-000000000003'
    ),
    'rejected'::public.vendor_request_state,
    'rejection produces a terminal rejected state'
);
select extensions.throws_ok(
    $test$
        select public.review_vendor_request(
            (select id from public.vendor_requests where vendor_legal_name = 'Test Supply Inc.'),
            4, 'approve', repeat('r', 1001)
        )
    $test$,
    'P0001', 'VALIDATION_FAILED', 'a review reason above 1,000 characters is rejected'
);

reset role;
select set_config(
    'request.jwt.claim.sub', '20000000-0000-4000-8000-000000000001', true
);
set local role authenticated;

select extensions.lives_ok(
    $test$
        select public.update_vendor_request(
            (select id from public.vendor_requests where vendor_legal_name = 'Test Supply Inc.'), 4,
            row(
                'Test Supply Inc.', 'https://test-supply.example', 'software',
                'Provide the updated agreement and complete the workflow transition tests.',
                500000, 'USD', true, false
            )
        )
    $test$,
    'the owner can edit a request when changes are requested'
);
select extensions.is(
    (select revision from public.vendor_requests where vendor_legal_name = 'Test Supply Inc.'),
    5,
    'editing increments the revision once'
);
select extensions.is(
    (select state from public.vendor_requests where vendor_legal_name = 'Test Supply Inc.'),
    'changes_requested'::public.vendor_request_state,
    'editing does not bypass the changes-requested state'
);
select extensions.throws_ok(
    $test$
        select public.update_vendor_request(
            (select id from public.vendor_requests where vendor_legal_name = 'Test Supply Inc.'), 4,
            row(
                'Test Supply Inc.', 'https://test-supply.example', 'software',
                'This stale update must not overwrite the current request revision.',
                500000, 'USD', true, false
            )
        )
    $test$,
    'P0001', 'STALE_REVISION', 'a stale edit cannot overwrite a newer revision'
);
select extensions.lives_ok(
    $test$
        select public.submit_vendor_request(
            (select id from public.vendor_requests where vendor_legal_name = 'Test Supply Inc.'), 5
        )
    $test$,
    'the owner can resubmit a corrected request'
);
select extensions.is(
    (select state from public.vendor_requests where vendor_legal_name = 'Test Supply Inc.'),
    'submitted'::public.vendor_request_state,
    'resubmission returns the request to submitted'
);
select extensions.is(
    (
        select reviewer_user_id from public.vendor_requests
        where vendor_legal_name = 'Test Supply Inc.'
    ),
    null::uuid,
    'resubmission clears the prior reviewer assignment'
);
select extensions.is(
    (select revision from public.vendor_requests where vendor_legal_name = 'Test Supply Inc.'),
    6,
    'resubmission increments the revision once'
);
select extensions.throws_ok(
    $test$
        update public.vendor_requests
           set vendor_legal_name = 'Direct write'
         where id = '30000000-0000-4000-8000-000000000001'
    $test$,
    '42501', 'permission denied for table vendor_requests',
    'direct request updates are denied'
);
select extensions.throws_ok(
    $test$
        insert into public.vendor_request_audit_events (
            request_id, organization_id, actor_user_id, actor_role, action,
            previous_state, current_state, resulting_revision
        ) values (
            '30000000-0000-4000-8000-000000000001',
            '10000000-0000-4000-8000-000000000001',
            '20000000-0000-4000-8000-000000000001',
            'requester', 'submitted', 'draft', 'submitted', 2
        )
    $test$,
    '42501', 'permission denied for table vendor_request_audit_events',
    'direct audit insertion is denied'
);
select extensions.throws_ok(
    $test$
        update public.vendor_request_audit_events set reason = 'Changed'
    $test$,
    '42501', 'permission denied for table vendor_request_audit_events',
    'direct audit updates are denied'
);
select extensions.throws_ok(
    $test$
        select public.update_vendor_request(
            '30000000-0000-4000-8000-000000000005', 1,
            row(null, null, null, null, null, null, null, null)
        )
    $test$,
    'P0001', 'REQUEST_NOT_FOUND', 'cross-organization mutation hides resource existence'
);
select extensions.throws_ok(
    $test$
        select public.update_vendor_request(
            '30000000-0000-4000-8000-000000000006', 1,
            row(null, null, null, null, null, null, null, null)
        )
    $test$,
    'P0001', 'PERMISSION_DENIED', 'a requester cannot edit another owner private draft'
);

reset role;
select set_config(
    'request.jwt.claim.sub', '20000000-0000-4000-8000-000000000003', true
);
set local role authenticated;
select extensions.lives_ok(
    $test$
        select public.assign_vendor_request(
            (select id from public.vendor_requests where vendor_legal_name = 'Test Supply Inc.'), 6,
            '20000000-0000-4000-8000-000000000002'
        )
    $test$,
    'an administrator can reassign a corrected submission'
);
select extensions.is(
    (select revision from public.vendor_requests where vendor_legal_name = 'Test Supply Inc.'),
    7,
    'reassignment increments the revision once'
);

reset role;
select set_config(
    'request.jwt.claim.sub', '20000000-0000-4000-8000-000000000002', true
);
set local role authenticated;
select extensions.lives_ok(
    $test$
        select public.review_vendor_request(
            (select id from public.vendor_requests where vendor_legal_name = 'Test Supply Inc.'),
            7, 'approve', repeat('a', 1000)
        )
    $test$,
    'an assigned reviewer can approve with a reason at the maximum length'
);
select extensions.is(
    (select state from public.vendor_requests where vendor_legal_name = 'Test Supply Inc.'),
    'approved'::public.vendor_request_state,
    'approval produces a terminal approved state'
);
select extensions.is(
    (select revision from public.vendor_requests where vendor_legal_name = 'Test Supply Inc.'),
    8,
    'approval increments the revision once'
);
select extensions.throws_ok(
    $test$
        select public.review_vendor_request(
            (select id from public.vendor_requests where vendor_legal_name = 'Test Supply Inc.'),
            8, 'approve', null
        )
    $test$,
    'P0001', 'INVALID_TRANSITION', 'an approved request cannot be approved again'
);
select extensions.is(
    (
        select count(*) from public.vendor_request_audit_events
        where request_id = (
            select id from public.vendor_requests where vendor_legal_name = 'Test Supply Inc.'
        )
    ),
    7::bigint,
    'valid transitions create exactly one event and failed actions create none'
);
select extensions.results_eq(
    $test$
        select resulting_revision from public.vendor_request_audit_events
        where request_id = (
            select id from public.vendor_requests where vendor_legal_name = 'Test Supply Inc.'
        ) order by resulting_revision
    $test$,
    $expected$ values (1), (2), (3), (4), (6), (7), (8) $expected$,
    'audit revisions show every transition and omit the non-transition edit'
);

reset role;
select set_config(
    'request.jwt.claim.sub', '20000000-0000-4000-8000-000000000006', true
);
set local role authenticated;
select extensions.throws_ok(
    $test$
        select public.review_vendor_request(
            '30000000-0000-4000-8000-000000000002', 2, 'approve', null
        )
    $test$,
    'P0001', 'PERMISSION_DENIED', 'an inactive reviewer fails closed'
);

reset role;
select set_config('request.jwt.claim.sub', '', true);
set local role authenticated;
select extensions.throws_ok(
    $test$
        select public.create_vendor_request(row(
            'Unauthenticated Vendor', 'https://unauthenticated.example', 'other',
            'This operation must fail without an authenticated identity.',
            1, 'USD', false, false
        ))
    $test$,
    'P0001', 'AUTHENTICATION_REQUIRED', 'missing authentication fails closed'
);

reset role;
select * from extensions.finish();
rollback;
