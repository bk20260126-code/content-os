-- Content OS schema v2 — RLS lockdown (issue 3)
--
-- The server API route (app/api/state) now authenticates with the service_role key,
-- which bypasses RLS. Direct anon access is therefore no longer needed, so we drop the
-- permissive "mvp_anon_all_*" policies from v1. After this, a leaked anon key can read
-- or write NOTHING — with RLS enabled and no policies, the anon/authenticated roles are
-- denied by default; only service_role (bypasses RLS) and the table owner have access.
--
-- ⚠️ SEQUENCING: apply this ONLY after the server is confirmed to use
-- SUPABASE_SERVICE_ROLE_KEY and /api/state GET/PUT return 200. If applied while the
-- server still authenticates as anon, every request 500s and the app silently degrades
-- to localStorage (cloud persistence goes dark without an obvious error).

drop policy if exists "mvp_anon_all_sources" on public.sources;
drop policy if exists "mvp_anon_all_drafts" on public.drafts;
drop policy if exists "mvp_anon_all_proofs" on public.proofs;
drop policy if exists "mvp_anon_all_runs" on public.runs;
drop policy if exists "mvp_anon_all_profile" on public.creator_profile;

-- RLS stays ENABLED on all five tables (unchanged from v1). No policies == deny-all for
-- every role except service_role and the owner. This is server-only access, not per-user
-- auth — scoping to auth.uid() is the separate Supabase Auth work (Sprint 3).
