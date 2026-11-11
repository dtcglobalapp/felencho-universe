-- FELENCHO MUNDIAL — MEMBER IDENTITY & PRIVATE MEMORY V1
-- REVIEW-ONLY / NOT APPLIED TO PRODUCTION.
-- Existing audience_profiles must be retained, not replaced. Roll out after
-- authorization audit; enabling RLS can change existing client behavior.
-- Confirm provider OAuth accounts at SERVER, never trusting a username/email
-- typed into the frontend as evidence of a social account.

begin;

alter table public.audience_profiles
  add column if not exists auth_user_id uuid references auth.users(id) on delete set null;

create unique index if not exists audience_profiles_auth_user_unique
  on public.audience_profiles(auth_user_id) where auth_user_id is not null;

-- No access to other audience members. Existing unclaimed profiles require a
-- one-time verified server-side claim flow; never match automatically by email.
alter table public.audience_profiles enable row level security;

drop policy if exists audience_profile_owner_select_v1 on public.audience_profiles;
create policy audience_profile_owner_select_v1 on public.audience_profiles
  for select to authenticated using (auth_user_id = (select auth.uid()));

drop policy if exists audience_profile_owner_insert_v1 on public.audience_profiles;
create policy audience_profile_owner_insert_v1 on public.audience_profiles
  for insert to authenticated with check (auth_user_id = (select auth.uid()));

drop policy if exists audience_profile_owner_update_v1 on public.audience_profiles;
create policy audience_profile_owner_update_v1 on public.audience_profiles
  for update to authenticated
  using (auth_user_id = (select auth.uid()))
  with check (auth_user_id = (select auth.uid()));

-- Verified external provider identifiers live in a restricted table. The
-- application backend, after OAuth/webhook verification, owns these links.
create table if not exists public.member_verified_identities (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('google','facebook','youtube','instagram','tiktok','email','apple','other')),
  provider_subject text not null,
  verified_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(provider, provider_subject),
  unique(auth_user_id, provider, provider_subject)
);

alter table public.member_verified_identities enable row level security;
-- NO public/authenticated policies: linked identities may only be accessed via
-- narrowly authorized server operations using secure credentials.
revoke all on public.member_verified_identities from anon, authenticated;

-- Separate privacy boundary for members' own consented summaries.
-- Not joined into global felencho_memories or podcast editorial memory.
create table if not exists public.member_private_memories (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  created_with_character text not null check (created_with_character in ('lina','bob','felencho_virtual','other')),
  title text not null check (char_length(title) between 1 and 200),
  summary text not null check (char_length(summary) between 1 and 3000),
  category text not null default 'personal',
  source_session_id uuid,
  consent_recorded_at timestamptz not null,
  updated_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  is_active boolean not null default true
);

create index if not exists member_private_memories_owner_created_idx
  on public.member_private_memories(owner_user_id, created_at desc);

alter table public.member_private_memories enable row level security;

drop policy if exists member_private_memories_owner_select_v1 on public.member_private_memories;
create policy member_private_memories_owner_select_v1 on public.member_private_memories
  for select to authenticated using (owner_user_id = (select auth.uid()));

drop policy if exists member_private_memories_owner_insert_v1 on public.member_private_memories;
create policy member_private_memories_owner_insert_v1 on public.member_private_memories
  for insert to authenticated with check (owner_user_id = (select auth.uid()));

drop policy if exists member_private_memories_owner_update_v1 on public.member_private_memories;
create policy member_private_memories_owner_update_v1 on public.member_private_memories
  for update to authenticated
  using (owner_user_id = (select auth.uid()))
  with check (owner_user_id = (select auth.uid()));

drop policy if exists member_private_memories_owner_delete_v1 on public.member_private_memories;
create policy member_private_memories_owner_delete_v1 on public.member_private_memories
  for delete to authenticated using (owner_user_id = (select auth.uid()));

-- Must test cross-account isolation with two distinct authenticated JWTs,
-- plus anonymous requests, before enabling public feature.
commit;
