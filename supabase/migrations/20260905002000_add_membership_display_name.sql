alter table public.organization_memberships
    add column display_name text;

-- Existing pre-release databases derive presentation names without changing membership authority.
update public.organization_memberships as membership
set display_name = left(
    coalesce(
        nullif(btrim(users.raw_user_meta_data ->> 'full_name'), ''),
        'Organization member'
    ),
    100
)
from auth.users as users
where users.id = membership.user_id;

update public.organization_memberships
set display_name = 'Organization member'
where display_name is null;

alter table public.organization_memberships
    alter column display_name set not null,
    add constraint memberships_display_name_not_empty check (char_length(display_name) >= 1),
    add constraint memberships_display_name_maximum_length check (char_length(display_name) <= 100),
    add constraint memberships_display_name_trimmed check (display_name = btrim(display_name));
