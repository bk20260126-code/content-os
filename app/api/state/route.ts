import { NextRequest, NextResponse } from 'next/server';
import { parseState } from '@/lib/state-validation';
import { AppState } from '@/lib/types';
import {
  db, supabaseConfigured,
  rowToSource, rowToDraft, rowToProof, rowToRun, rowToProfile,
} from '@/lib/db';
import { hasPersistedState } from '@/lib/state-policy';

/**
 * GET  /api/state — load full AppState from Supabase (null if DB is empty: first run)
 * PUT  /api/state — atomically replace a snapshot only at the expected revision
 * DELETE /api/state — disabled; recovery uses explicit backup and snapshot choice
 *
 * The browser never talks to Supabase directly — keys stay server-side.
 */

export async function GET() {
  if (!supabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 501 });
  }
  try {
    const client = db();
    const snapshot = await client.from('content_os_snapshot').select('state, revision').eq('id', 'singleton').single();
    const migrationRequired = !!snapshot.error && ['42P01', 'PGRST205', 'PGRST116'].includes(snapshot.error.code);
    if (snapshot.error && !migrationRequired) throw new Error(snapshot.error.message);
    if (snapshot.data?.state) return NextResponse.json({ state: parseState(snapshot.data.state), revision: snapshot.data?.revision ?? 0, migrationRequired });
    const [sources, drafts, proofs, runs, profile] = await Promise.all([
      client.from('sources').select('*').order('created_at', { ascending: false }),
      client.from('drafts').select('*'),
      client.from('proofs').select('*'),
      client.from('runs').select('*'),
      client.from('creator_profile').select('*').eq('id', 'singleton').maybeSingle(),
    ]);
    for (const r of [sources, drafts, proofs, runs]) {
      if (r.error) throw new Error(r.error.message);
    }
    if (profile.error) throw new Error(profile.error.message);

    if (!hasPersistedState(sources.data, drafts.data, proofs.data, runs.data, profile.data)) {
      return NextResponse.json({ state: null, revision: snapshot.data?.revision ?? 0, migrationRequired });
    }

    const state: AppState = {
      schemaVersion: 1,
      sources: (sources.data ?? []).map(rowToSource),
      drafts: (drafts.data ?? []).map(rowToDraft),
      proofs: (proofs.data ?? []).map(rowToProof),
      runs: (runs.data ?? []).map(rowToRun),
      profile: profile.data ? rowToProfile(profile.data) : null,
    };
    return NextResponse.json({ state, revision: snapshot.data?.revision ?? 0, migrationRequired });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'DB read failed' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  if (!supabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 501 });
  }
  try {
    const body = await req.json();
    if (!Number.isSafeInteger(body.expectedRevision) || body.expectedRevision < 0) return NextResponse.json({ error: '버전 정보가 필요합니다. 새로고침 후 다시 시도하세요.' }, { status: 409 });
    const state = parseState(body.state);
    const { data, error } = await db().rpc('save_content_os_snapshot', { expected_revision: body.expectedRevision, next_state: state });
    if (error) return NextResponse.json({ error: error.message }, { status: error.code === '40001' ? 409 : 500 });
    return NextResponse.json({ ok: true, revision: data });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'DB write failed' }, { status: 500 });
  }
}

export async function DELETE() {
  return NextResponse.json({ error: '일괄 삭제는 지원하지 않습니다. 백업과 사본 선택 기능을 이용하세요.' }, { status: 405 });
}
