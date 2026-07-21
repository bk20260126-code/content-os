-- Content OS schema v1 — mirrors lib/types.ts (TYPES_UNIFIED_v1)
-- IDs are app-generated text keys (e.g. 'd_1765...') to stay compatible with the client.
--
-- This file is the source of truth for the Supabase schema behind /api/state.
-- It matches the migration applied to the live project (version 20260611005237).
-- To recreate the database from scratch:  supabase db reset   (or apply this file once).

create table public.sources (
  id text primary key,
  title text not null default '',
  url text not null default '',
  type text not null default 'Other',
  raw_notes text not null default '',
  topic_cluster text not null default '',
  pain_point text not null default '',
  audience_signal text not null default '',
  business_relevance text not null default '',
  proof_needed text not null default '',
  sales_trigger text not null default '',
  offer_angle text not null default '',
  status text not null default 'Inbox',
  score jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.drafts (
  id text primary key,
  source_id text not null references public.sources(id) on delete cascade,
  platform text not null,
  status text not null default 'Idea',
  content jsonb not null default '{}'::jsonb,
  proof jsonb not null default '{}'::jsonb,
  brand_voice_gate jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create index drafts_source_id_idx on public.drafts(source_id);

create table public.proofs (
  id text primary key,
  source_id text references public.sources(id) on delete set null,
  type text not null default 'screenshot',
  title text not null default '',
  description text not null default '',
  url text,
  created_at timestamptz not null default now()
);
create index proofs_source_id_idx on public.proofs(source_id);

create table public.runs (
  id text primary key,
  source_id text not null references public.sources(id) on delete cascade,
  draft_id text references public.drafts(id) on delete set null,
  stage text not null default 'source_intake',
  interview jsonb not null default '[]'::jsonb,
  anchor_draft text not null default '',
  review jsonb,
  derivatives jsonb not null default '[]'::jsonb,
  lessons jsonb not null default '[]'::jsonb,
  status text not null default 'idle',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index runs_source_id_idx on public.runs(source_id);

create table public.creator_profile (
  id text primary key default 'singleton',
  name text not null default '',
  positioning text not null default '',
  voice jsonb not null default '[]'::jsonb,
  avoid jsonb not null default '[]'::jsonb,
  primary_cta text not null default ''
);

-- RLS: enabled on all tables.
-- MVP policy: server-side API routes are the only intended access path (keys live in
-- .env.local, never shipped to the browser). The permissive anon policies below are a
-- STOPGAP — anyone with the anon key can read/write every row. Do NOT treat as
-- production-safe. Scope to auth.uid() once Supabase Auth lands (Sprint 3).
alter table public.sources enable row level security;
alter table public.drafts enable row level security;
alter table public.proofs enable row level security;
alter table public.runs enable row level security;
alter table public.creator_profile enable row level security;

create policy "mvp_anon_all_sources" on public.sources for all to anon using (true) with check (true);
create policy "mvp_anon_all_drafts" on public.drafts for all to anon using (true) with check (true);
create policy "mvp_anon_all_proofs" on public.proofs for all to anon using (true) with check (true);
create policy "mvp_anon_all_runs" on public.runs for all to anon using (true) with check (true);
create policy "mvp_anon_all_profile" on public.creator_profile for all to anon using (true) with check (true);
