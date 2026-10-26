-- Felencho Mundial guest intake: deploy only after review in intended Supabase project.
create table if not exists public.podcast_guest_registrations (
 id uuid primary key default gen_random_uuid(),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 full_name text not null,
 artistic_name text,
 email text not null,
 phone text,
 language text not null default 'es',
 participation_mode text not null check (participation_mode in ('virtual','presencial')),
 interview_topic text,
 biography text,
 website text,
 music_titles text,
 music_permission_details text,
 consent_release_version text not null,
 consent_publication boolean not null check (consent_publication = true),
 consent_ai_interaction boolean not null check (consent_ai_interaction = true),
 consent_ai_memory boolean not null default false,
 consent_community_contact boolean not null default false,
 consent_music_use boolean not null default false,
 accepted_at timestamptz not null default now(),
 status text not null default 'pending_review' check (status in ('pending_review','approved','rejected')),
 memory_imported_at timestamptz,
 notes_private text
);
create index if not exists podcast_guest_registrations_email_idx on public.podcast_guest_registrations (lower(email));
alter table public.podcast_guest_registrations enable row level security;
-- No public direct table policies. Server-side intake endpoint uses service role with rate limits.
revoke all on public.podcast_guest_registrations from anon, authenticated;
comment on table public.podcast_guest_registrations is 'Guest releases and opt-in permissions. Do not automatically copy into avatar memories before host review.';

create table if not exists public.podcast_guest_invitations (
 id uuid primary key default gen_random_uuid(),
 token_hash text not null unique,
 invited_email text,
 interview_date timestamptz,
 expires_at timestamptz not null,
 used_at timestamptz,
 created_at timestamptz not null default now()
);
alter table public.podcast_guest_invitations enable row level security;
revoke all on public.podcast_guest_invitations from anon, authenticated;
alter table public.podcast_guest_registrations add column if not exists invitation_id uuid references public.podcast_guest_invitations(id);
create unique index if not exists podcast_guest_registrations_invitation_unique on public.podcast_guest_registrations(invitation_id) where invitation_id is not null;
