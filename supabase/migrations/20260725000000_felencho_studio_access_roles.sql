begin;

alter table public.studio_members
  drop constraint if exists studio_members_role_check;

alter table public.studio_invitations
  drop constraint if exists studio_invitations_role_check;

alter table public.studio_access_sessions
  drop constraint if exists studio_access_sessions_role_check;

alter table public.studio_access_requests
  drop constraint if exists studio_access_requests_requested_role_check;

update public.studio_members
set role = case role
  when 'admin' then 'developer'
  when 'producer' then 'artist'
  when 'viewer' then 'tester'
  else role
end;

update public.studio_invitations
set role = case role
  when 'admin' then 'developer'
  when 'producer' then 'artist'
  when 'viewer' then 'tester'
  else role
end;

update public.studio_access_sessions
set role = case role
  when 'admin' then 'developer'
  when 'producer' then 'artist'
  when 'viewer' then 'tester'
  else role
end;

update public.studio_access_requests
set requested_role = case requested_role
  when 'admin' then 'developer'
  when 'producer' then 'artist'
  when 'viewer' then 'tester'
  else requested_role
end;

alter table public.studio_members
  add column if not exists permissions text[] not null default '{}';

alter table public.studio_invitations
  add column if not exists permissions text[] not null default '{}';

alter table public.studio_access_sessions
  add column if not exists permissions text[] not null default '{}';

alter table public.studio_members
  add constraint studio_members_role_check
  check (
    role = any (
      array[
        'owner',
        'developer',
        'artist',
        'tester',
        'guest'
      ]::text[]
    )
  );

alter table public.studio_invitations
  add constraint studio_invitations_role_check
  check (
    role = any (
      array[
        'owner',
        'developer',
        'artist',
        'tester',
        'guest'
      ]::text[]
    )
  );

alter table public.studio_access_sessions
  add constraint studio_access_sessions_role_check
  check (
    role = any (
      array[
        'owner',
        'developer',
        'artist',
        'tester',
        'guest'
      ]::text[]
    )
  );

alter table public.studio_access_requests
  alter column requested_role set default 'guest';

alter table public.studio_access_requests
  add constraint studio_access_requests_requested_role_check
  check (
    requested_role = any (
      array[
        'owner',
        'developer',
        'artist',
        'tester',
        'guest'
      ]::text[]
    )
  );

comment on column public.studio_members.permissions is
  'Explicit Felencho Studio permissions granted to this member.';

comment on column public.studio_invitations.permissions is
  'Explicit permissions copied into sessions created from this invitation.';

comment on column public.studio_access_sessions.permissions is
  'Permission snapshot established when the temporary session was created.';

commit;
