-- Additive migration. Existing sources/drafts/proofs/runs/profile remain intact.
-- First explicit save copies the complete legacy state into a versioned snapshot.
create table if not exists public.content_os_snapshot (
  id text primary key check (id = 'singleton'),
  revision bigint not null default 0,
  state jsonb,
  updated_at timestamptz not null default now()
);
alter table public.content_os_snapshot enable row level security;
revoke all on public.content_os_snapshot from anon, authenticated;
grant all on public.content_os_snapshot to service_role;
insert into public.content_os_snapshot(id) values ('singleton') on conflict do nothing;

create or replace function public.save_content_os_snapshot(expected_revision bigint, next_state jsonb)
returns bigint language plpgsql security invoker set search_path = public as $$
declare next_revision bigint;
begin
  update public.content_os_snapshot
    set state = next_state, revision = revision + 1, updated_at = now()
    where id = 'singleton' and revision = expected_revision
    returning revision into next_revision;
  if next_revision is null then raise exception 'CONTENT_OS_CONFLICT' using errcode = '40001'; end if;
  return next_revision;
end;
$$;
revoke all on function public.save_content_os_snapshot(bigint, jsonb) from public, anon, authenticated;
grant execute on function public.save_content_os_snapshot(bigint, jsonb) to service_role;
