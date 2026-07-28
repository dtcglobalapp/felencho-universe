begin;

-- Felencho Studio authentication is mediated exclusively by server routes.
-- The service role requires explicit Data API privileges on projects created
-- with restricted default grants. Browser roles must never access these
-- private authorization tables directly.
grant select, insert, update, delete
on table
  public.studio_members,
  public.studio_invitations,
  public.studio_access_sessions,
  public.studio_access_logs,
  public.studio_access_requests
to service_role;

revoke all privileges
on table
  public.studio_members,
  public.studio_invitations,
  public.studio_access_sessions,
  public.studio_access_logs,
  public.studio_access_requests
from anon, authenticated;

create or replace function public.create_studio_invite(
  p_code text,
  p_email text,
  p_role text,
  p_hours integer default 24,
  p_max_uses integer default 1,
  p_created_by text default 'owner'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  new_id uuid;
begin
  insert into public.studio_invitations (
    invite_code_hash,
    email,
    role,
    expires_at,
    max_uses,
    created_by
  )
  values (
    pg_catalog.encode(
      extensions.digest(p_code, 'sha256'),
      'hex'
    ),
    p_email,
    p_role,
    pg_catalog.now() + pg_catalog.make_interval(hours => p_hours),
    p_max_uses,
    p_created_by
  )
  returning id into new_id;

  return new_id;
end;
$function$;

revoke all privileges
on function public.create_studio_invite(
  text,
  text,
  text,
  integer,
  integer,
  text
)
from public, anon, authenticated;

grant execute
on function public.create_studio_invite(
  text,
  text,
  text,
  integer,
  integer,
  text
)
to service_role;

commit;
