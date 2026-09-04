create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create type public.membership_role as enum (
    'requester',
    'reviewer',
    'administrator'
);

create type public.vendor_request_state as enum (
    'draft',
    'submitted',
    'in_review',
    'changes_requested',
    'approved',
    'rejected'
);

create type public.vendor_service_category as enum (
    'software',
    'professional_services',
    'facilities',
    'logistics',
    'other'
);

create type public.workflow_action as enum (
    'created',
    'submitted',
    'assigned',
    'approved',
    'rejected',
    'requested_changes',
    'resubmitted'
);

create type public.vendor_request_draft_input as (
    vendor_legal_name text,
    vendor_website text,
    service_category text,
    business_justification text,
    annual_spend_minor_units bigint,
    currency_code text,
    receives_confidential_data boolean,
    supports_critical_process boolean
);

create type public.vendor_request_transition_result as (
    request_id uuid,
    previous_state public.vendor_request_state,
    current_state public.vendor_request_state,
    new_revision integer,
    audit_event_id uuid,
    transitioned_at timestamp with time zone
);

create table public.organizations (
    id uuid primary key default extensions.gen_random_uuid(),
    name text not null,
    created_at timestamp with time zone not null default statement_timestamp(),
    constraint organizations_name_not_empty check (char_length(name) >= 1),
    constraint organizations_name_maximum_length check (char_length(name) <= 120),
    constraint organizations_name_trimmed check (name = btrim(name))
);

create table public.organization_memberships (
    organization_id uuid not null references public.organizations(id) on delete restrict,
    user_id uuid not null references auth.users(id) on delete restrict,
    role public.membership_role not null,
    active boolean not null default true,
    created_at timestamp with time zone not null default statement_timestamp(),
    primary key (organization_id, user_id),
    unique (user_id)
);

create table public.vendor_requests (
    id uuid primary key default extensions.gen_random_uuid(),
    organization_id uuid not null,
    owner_user_id uuid not null,
    reviewer_user_id uuid,
    vendor_legal_name text,
    vendor_website text,
    service_category public.vendor_service_category,
    business_justification text,
    annual_spend_minor_units bigint,
    currency_code text,
    receives_confidential_data boolean,
    supports_critical_process boolean,
    state public.vendor_request_state not null default 'draft',
    revision integer not null default 1,
    created_at timestamp with time zone not null default statement_timestamp(),
    updated_at timestamp with time zone not null default statement_timestamp(),
    foreign key (organization_id, owner_user_id)
        references public.organization_memberships(organization_id, user_id) on delete restrict,
    foreign key (organization_id, reviewer_user_id)
        references public.organization_memberships(organization_id, user_id) on delete restrict,
    constraint vendor_requests_name_minimum_length check (
        vendor_legal_name is null or char_length(vendor_legal_name) >= 1
    ),
    constraint vendor_requests_name_maximum_length check (
        vendor_legal_name is null or char_length(vendor_legal_name) <= 160
    ),
    constraint vendor_requests_name_trimmed check (
        vendor_legal_name is null or vendor_legal_name = btrim(vendor_legal_name)
    ),
    constraint vendor_requests_website_maximum_length check (
        vendor_website is null or char_length(vendor_website) <= 2048
    ),
    constraint vendor_requests_website_https check (
        vendor_website is null
        or vendor_website ~ '^https://[^[:space:]/?#]+(?:[/?#].*)?$'
    ),
    constraint vendor_requests_justification_minimum_length check (
        business_justification is null or char_length(business_justification) >= 20
    ),
    constraint vendor_requests_justification_maximum_length check (
        business_justification is null or char_length(business_justification) <= 2000
    ),
    constraint vendor_requests_justification_trimmed check (
        business_justification is null
        or business_justification = btrim(business_justification)
    ),
    constraint vendor_requests_spend_minimum check (
        annual_spend_minor_units is null or annual_spend_minor_units >= 0
    ),
    constraint vendor_requests_spend_maximum check (
        annual_spend_minor_units is null or annual_spend_minor_units <= 1000000000
    ),
    constraint vendor_requests_currency_supported check (
        currency_code is null or currency_code = 'USD'
    ),
    constraint vendor_requests_revision_positive check (revision >= 1),
    constraint vendor_requests_assignment_matches_state check (
        (state in ('draft', 'submitted') and reviewer_user_id is null)
        or
        (state in ('in_review', 'changes_requested', 'approved', 'rejected')
            and reviewer_user_id is not null)
    ),
    constraint vendor_requests_timestamps_ordered check (updated_at >= created_at)
);

create table public.vendor_request_audit_events (
    id uuid primary key default extensions.gen_random_uuid(),
    request_id uuid not null references public.vendor_requests(id) on delete restrict,
    organization_id uuid not null references public.organizations(id) on delete restrict,
    actor_user_id uuid not null references auth.users(id) on delete restrict,
    actor_role public.membership_role not null,
    action public.workflow_action not null,
    previous_state public.vendor_request_state,
    current_state public.vendor_request_state not null,
    reason text,
    resulting_revision integer not null,
    created_at timestamp with time zone not null default statement_timestamp(),
    constraint audit_events_reason_maximum_length check (
        reason is null or char_length(reason) <= 1000
    ),
    constraint audit_events_reason_trimmed check (reason is null or reason = btrim(reason)),
    constraint audit_events_revision_positive check (resulting_revision >= 1),
    constraint audit_events_actor_matches_action check (
        (action in ('created', 'submitted', 'resubmitted') and actor_role = 'requester')
        or (action = 'assigned' and actor_role = 'administrator')
        or (action in ('approved', 'rejected', 'requested_changes') and actor_role = 'reviewer')
    ),
    constraint audit_events_reason_matches_action check (
        (action in ('rejected', 'requested_changes') and reason is not null)
        or (action not in ('rejected', 'requested_changes'))
    ),
    constraint audit_events_transition_valid check (
        (action = 'created' and previous_state is null and current_state = 'draft')
        or (action = 'submitted' and previous_state = 'draft' and current_state = 'submitted')
        or (action = 'assigned' and previous_state = 'submitted' and current_state = 'in_review')
        or (action = 'approved' and previous_state = 'in_review' and current_state = 'approved')
        or (action = 'rejected' and previous_state = 'in_review' and current_state = 'rejected')
        or (action = 'requested_changes'
            and previous_state = 'in_review'
            and current_state = 'changes_requested')
        or (action = 'resubmitted'
            and previous_state = 'changes_requested'
            and current_state = 'submitted')
    )
);

create index vendor_requests_organization_state_updated_idx
    on public.vendor_requests (organization_id, state, updated_at desc);
create index vendor_requests_owner_updated_idx
    on public.vendor_requests (owner_user_id, updated_at desc);
create index vendor_requests_reviewer_updated_idx
    on public.vendor_requests (reviewer_user_id, updated_at desc)
    where reviewer_user_id is not null;
create index audit_events_request_created_idx
    on public.vendor_request_audit_events (request_id, created_at, id);

create function private.is_active_member(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.organization_memberships as membership
        where membership.organization_id = p_organization_id
          and membership.user_id = auth.uid()
          and membership.active
    );
$$;

create function private.user_has_role(
    p_organization_id uuid,
    p_role public.membership_role
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.organization_memberships as membership
        where membership.organization_id = p_organization_id
          and membership.user_id = auth.uid()
          and membership.role = p_role
          and membership.active
    );
$$;

create function private.can_read_vendor_request(p_request_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.vendor_requests as request
        join public.organization_memberships as membership
          on membership.organization_id = request.organization_id
         and membership.user_id = auth.uid()
         and membership.active
        where request.id = p_request_id
          and (
              request.owner_user_id = auth.uid()
              or membership.role = 'administrator'
              or (
                  membership.role = 'reviewer'
                  and request.reviewer_user_id = auth.uid()
              )
          )
    );
$$;

create function private.assert_actor_role(p_role public.membership_role)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
    v_organization_id uuid;
begin
    if auth.uid() is null then
        raise exception using errcode = 'P0001', message = 'AUTHENTICATION_REQUIRED';
    end if;

    select membership.organization_id
      into v_organization_id
      from public.organization_memberships as membership
     where membership.user_id = auth.uid()
       and membership.role = p_role
       and membership.active;

    if v_organization_id is null then
        raise exception using errcode = 'P0001', message = 'PERMISSION_DENIED';
    end if;

    return v_organization_id;
end;
$$;

create function private.assert_request_revision_input(
    p_request_id uuid,
    p_expected_revision integer
)
returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
    if p_request_id is null then
        raise exception using errcode = 'P0001', message = 'VALIDATION_FAILED';
    end if;
    if p_expected_revision is null then
        raise exception using errcode = 'P0001', message = 'VALIDATION_FAILED';
    end if;
    if p_expected_revision < 1 then
        raise exception using errcode = 'P0001', message = 'VALIDATION_FAILED';
    end if;
end;
$$;

create function public.create_vendor_request(
    p_draft public.vendor_request_draft_input
)
returns public.vendor_requests
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
    v_actor_user_id uuid := auth.uid();
    v_organization_id uuid;
    v_request public.vendor_requests;
begin
    if p_draft::text is null then
        raise exception using errcode = 'P0001', message = 'VALIDATION_FAILED';
    end if;

    v_organization_id := private.assert_actor_role('requester');

    begin
        insert into public.vendor_requests (
            organization_id, owner_user_id, reviewer_user_id, vendor_legal_name,
            vendor_website, service_category, business_justification,
            annual_spend_minor_units, currency_code, receives_confidential_data,
            supports_critical_process, state, revision
        ) values (
            v_organization_id, v_actor_user_id, null, p_draft.vendor_legal_name,
            p_draft.vendor_website,
            p_draft.service_category::public.vendor_service_category,
            p_draft.business_justification, p_draft.annual_spend_minor_units,
            p_draft.currency_code, p_draft.receives_confidential_data,
            p_draft.supports_critical_process, 'draft', 1
        ) returning * into v_request;
    exception
        when check_violation or invalid_text_representation or numeric_value_out_of_range then
            raise exception using errcode = 'P0001', message = 'VALIDATION_FAILED';
    end;

    insert into public.vendor_request_audit_events (
        request_id, organization_id, actor_user_id, actor_role, action,
        previous_state, current_state, reason, resulting_revision
    ) values (
        v_request.id, v_request.organization_id, v_actor_user_id, 'requester', 'created',
        null, 'draft', null, v_request.revision
    );

    return v_request;
end;
$$;

create function public.update_vendor_request(
    p_request_id uuid,
    p_expected_revision integer,
    p_draft public.vendor_request_draft_input
)
returns public.vendor_requests
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
    v_actor_user_id uuid := auth.uid();
    v_organization_id uuid;
    v_request public.vendor_requests;
begin
    perform private.assert_request_revision_input(p_request_id, p_expected_revision);
    if p_draft::text is null then
        raise exception using errcode = 'P0001', message = 'VALIDATION_FAILED';
    end if;

    v_organization_id := private.assert_actor_role('requester');
    select * into v_request from public.vendor_requests
     where id = p_request_id and organization_id = v_organization_id for update;

    if v_request.id is null then
        raise exception using errcode = 'P0001', message = 'REQUEST_NOT_FOUND';
    end if;
    if v_request.owner_user_id <> v_actor_user_id then
        raise exception using errcode = 'P0001', message = 'PERMISSION_DENIED';
    end if;
    if v_request.revision <> p_expected_revision then
        raise exception using errcode = 'P0001', message = 'STALE_REVISION';
    end if;
    if v_request.state not in ('draft', 'changes_requested') then
        raise exception using errcode = 'P0001', message = 'INVALID_TRANSITION';
    end if;

    begin
        update public.vendor_requests set
            vendor_legal_name = p_draft.vendor_legal_name,
            vendor_website = p_draft.vendor_website,
            service_category = p_draft.service_category::public.vendor_service_category,
            business_justification = p_draft.business_justification,
            annual_spend_minor_units = p_draft.annual_spend_minor_units,
            currency_code = p_draft.currency_code,
            receives_confidential_data = p_draft.receives_confidential_data,
            supports_critical_process = p_draft.supports_critical_process,
            revision = revision + 1,
            updated_at = statement_timestamp()
        where id = p_request_id returning * into v_request;
    exception
        when check_violation or invalid_text_representation or numeric_value_out_of_range then
            raise exception using errcode = 'P0001', message = 'VALIDATION_FAILED';
    end;

    return v_request;
end;
$$;

create function public.submit_vendor_request(
    p_request_id uuid,
    p_expected_revision integer
)
returns public.vendor_request_transition_result
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
    v_action public.workflow_action;
    v_actor_user_id uuid := auth.uid();
    v_audit_event_id uuid := extensions.gen_random_uuid();
    v_organization_id uuid;
    v_previous_state public.vendor_request_state;
    v_request public.vendor_requests;
    v_transitioned_at timestamp with time zone := statement_timestamp();
begin
    perform private.assert_request_revision_input(p_request_id, p_expected_revision);
    v_organization_id := private.assert_actor_role('requester');
    select * into v_request from public.vendor_requests
     where id = p_request_id and organization_id = v_organization_id for update;
    if v_request.id is null then
        raise exception using errcode = 'P0001', message = 'REQUEST_NOT_FOUND';
    end if;
    if v_request.owner_user_id <> v_actor_user_id then
        raise exception using errcode = 'P0001', message = 'PERMISSION_DENIED';
    end if;
    if v_request.revision <> p_expected_revision then
        raise exception using errcode = 'P0001', message = 'STALE_REVISION';
    end if;
    if v_request.state = 'draft' then
        v_action := 'submitted';
    elsif v_request.state = 'changes_requested' then
        v_action := 'resubmitted';
    else
        raise exception using errcode = 'P0001', message = 'INVALID_TRANSITION';
    end if;
    if v_request.vendor_legal_name is null then
        raise exception using errcode = 'P0001', message = 'VALIDATION_FAILED';
    end if;
    if v_request.vendor_website is null then
        raise exception using errcode = 'P0001', message = 'VALIDATION_FAILED';
    end if;
    if v_request.service_category is null then
        raise exception using errcode = 'P0001', message = 'VALIDATION_FAILED';
    end if;
    if v_request.business_justification is null then
        raise exception using errcode = 'P0001', message = 'VALIDATION_FAILED';
    end if;
    if v_request.annual_spend_minor_units is null then
        raise exception using errcode = 'P0001', message = 'VALIDATION_FAILED';
    end if;
    if v_request.currency_code is null then
        raise exception using errcode = 'P0001', message = 'VALIDATION_FAILED';
    end if;
    if v_request.receives_confidential_data is null then
        raise exception using errcode = 'P0001', message = 'VALIDATION_FAILED';
    end if;
    if v_request.supports_critical_process is null then
        raise exception using errcode = 'P0001', message = 'VALIDATION_FAILED';
    end if;

    v_previous_state := v_request.state;
    update public.vendor_requests set state = 'submitted', reviewer_user_id = null,
        revision = revision + 1, updated_at = v_transitioned_at
     where id = p_request_id returning * into v_request;
    insert into public.vendor_request_audit_events (
        id, request_id, organization_id, actor_user_id, actor_role, action,
        previous_state, current_state, reason, resulting_revision, created_at
    ) values (
        v_audit_event_id, v_request.id, v_request.organization_id, v_actor_user_id,
        'requester', v_action, v_previous_state, 'submitted', null,
        v_request.revision, v_transitioned_at
    );

    return (v_request.id, v_previous_state, v_request.state, v_request.revision,
        v_audit_event_id, v_transitioned_at);
end;
$$;

create function public.assign_vendor_request(
    p_request_id uuid,
    p_expected_revision integer,
    p_reviewer_user_id uuid
)
returns public.vendor_request_transition_result
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
    v_actor_user_id uuid := auth.uid();
    v_audit_event_id uuid := extensions.gen_random_uuid();
    v_organization_id uuid;
    v_request public.vendor_requests;
    v_transitioned_at timestamp with time zone := statement_timestamp();
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
       and membership.user_id = p_reviewer_user_id
       and membership.role = 'reviewer'
       and membership.active;
    if not found then
        raise exception using errcode = 'P0001', message = 'VALIDATION_FAILED';
    end if;

    update public.vendor_requests set state = 'in_review',
        reviewer_user_id = p_reviewer_user_id, revision = revision + 1,
        updated_at = v_transitioned_at
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

create function public.review_vendor_request(
    p_request_id uuid,
    p_expected_revision integer,
    p_decision text,
    p_reason text default null
)
returns public.vendor_request_transition_result
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
    v_action public.workflow_action;
    v_actor_user_id uuid := auth.uid();
    v_audit_event_id uuid := extensions.gen_random_uuid();
    v_current_state public.vendor_request_state;
    v_organization_id uuid;
    v_request public.vendor_requests;
    v_transitioned_at timestamp with time zone := statement_timestamp();
begin
    perform private.assert_request_revision_input(p_request_id, p_expected_revision);
    if p_decision = 'approve' then
        v_action := 'approved';
        v_current_state := 'approved';
    elsif p_decision = 'reject' then
        if p_reason is null then
            raise exception using errcode = 'P0001', message = 'VALIDATION_FAILED';
        end if;
        v_action := 'rejected';
        v_current_state := 'rejected';
    elsif p_decision = 'request_changes' then
        if p_reason is null then
            raise exception using errcode = 'P0001', message = 'VALIDATION_FAILED';
        end if;
        v_action := 'requested_changes';
        v_current_state := 'changes_requested';
    else
        raise exception using errcode = 'P0001', message = 'VALIDATION_FAILED';
    end if;

    if p_reason is not null then
        if char_length(p_reason) < 1 then
            raise exception using errcode = 'P0001', message = 'VALIDATION_FAILED';
        end if;
        if char_length(p_reason) > 1000 then
            raise exception using errcode = 'P0001', message = 'VALIDATION_FAILED';
        end if;
        if p_reason <> btrim(p_reason) then
            raise exception using errcode = 'P0001', message = 'VALIDATION_FAILED';
        end if;
    end if;
    v_organization_id := private.assert_actor_role('reviewer');
    select * into v_request from public.vendor_requests
     where id = p_request_id and organization_id = v_organization_id for update;
    if v_request.id is null then
        raise exception using errcode = 'P0001', message = 'REQUEST_NOT_FOUND';
    end if;
    if v_request.reviewer_user_id is distinct from v_actor_user_id then
        raise exception using errcode = 'P0001', message = 'PERMISSION_DENIED';
    end if;
    if v_request.revision <> p_expected_revision then
        raise exception using errcode = 'P0001', message = 'STALE_REVISION';
    end if;
    if v_request.state <> 'in_review' then
        raise exception using errcode = 'P0001', message = 'INVALID_TRANSITION';
    end if;
    update public.vendor_requests set state = v_current_state,
        revision = revision + 1, updated_at = v_transitioned_at
     where id = p_request_id returning * into v_request;
    insert into public.vendor_request_audit_events (
        id, request_id, organization_id, actor_user_id, actor_role, action,
        previous_state, current_state, reason, resulting_revision, created_at
    ) values (
        v_audit_event_id, v_request.id, v_request.organization_id, v_actor_user_id,
        'reviewer', v_action, 'in_review', v_current_state, p_reason,
        v_request.revision, v_transitioned_at
    );

    return (v_request.id, 'in_review'::public.vendor_request_state,
        v_request.state, v_request.revision, v_audit_event_id, v_transitioned_at);
end;
$$;

comment on function private.assert_actor_role(public.membership_role) is
    'Derives organization authority from the authenticated identity instead of client input.';
comment on function private.assert_request_revision_input(uuid, integer) is
    'Rejects malformed mutation identifiers before any row lock or state change.';
comment on function public.create_vendor_request(public.vendor_request_draft_input) is
    'Creates a requester-owned draft and its immutable creation event in one transaction.';
comment on function public.update_vendor_request(
    uuid, integer, public.vendor_request_draft_input
) is
    'Updates only an owned editable draft at the caller-provided revision.';
comment on function public.submit_vendor_request(uuid, integer) is
    'Validates completeness and atomically submits or resubmits an owned request.';
comment on function public.assign_vendor_request(uuid, integer, uuid) is
    'Atomically assigns an active same-organization reviewer and starts review.';
comment on function public.review_vendor_request(uuid, integer, text, text) is
    'Atomically records an assigned reviewer decision and immutable audit event.';

alter table public.organizations enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.vendor_requests enable row level security;
alter table public.vendor_request_audit_events enable row level security;

create policy organizations_select_active_members
on public.organizations
for select
to authenticated
using (private.is_active_member(id));

create policy memberships_select_self_or_administrator
on public.organization_memberships
for select
to authenticated
using (
    user_id = auth.uid()
    or private.user_has_role(organization_id, 'administrator')
);

create policy vendor_requests_select_authorized
on public.vendor_requests
for select
to authenticated
using (private.can_read_vendor_request(id));

create policy audit_events_select_authorized
on public.vendor_request_audit_events
for select
to authenticated
using (private.can_read_vendor_request(request_id));

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;
revoke all on all functions in schema private from public, anon, authenticated;

alter default privileges in schema public revoke execute on functions from public;
alter default privileges in schema private revoke execute on functions from public;

grant usage on schema public to authenticated, service_role;
grant select on public.organizations to authenticated;
grant select on public.organization_memberships to authenticated;
grant select on public.vendor_requests to authenticated;
grant select on public.vendor_request_audit_events to authenticated;

grant execute on function private.is_active_member(uuid) to authenticated;
grant execute on function private.user_has_role(uuid, public.membership_role) to authenticated;
grant execute on function private.can_read_vendor_request(uuid) to authenticated;
grant execute on function public.create_vendor_request(
    public.vendor_request_draft_input
) to authenticated;
grant execute on function public.update_vendor_request(
    uuid, integer, public.vendor_request_draft_input
) to authenticated;
grant execute on function public.submit_vendor_request(uuid, integer) to authenticated;
grant execute on function public.assign_vendor_request(uuid, integer, uuid) to authenticated;
grant execute on function public.review_vendor_request(uuid, integer, text, text) to authenticated;

grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;
