import { NextRequest, NextResponse } from 'next/server';
import { AppState } from '@/lib/types';
import {
  db, supabaseConfigured,
  rowToSource, rowToDraft, rowToProof, rowToRun, rowToProfile,
} from '@/lib/db';
import { clearAppState, upsertAppState } from '@/lib/state-persistence';
import { hasPersistedState } from '@/lib/state-policy';

/**
 * GET  /api/state — load full AppState from Supabase (null if DB is empty: first run)
 * PUT  /api/state — upsert AppState without inferring destructive deletes
 * DELETE /api/state — explicitly clear all persisted state
 *
 * The browser never talks to Supabase directly — keys stay server-side.
 */

export async function GET() {
  if (!supabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 501 });
  }
  try {
    const client = db();
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
      return NextResponse.json({ state: null });
    }

    const state: AppState = {
      schemaVersion: 1,
      sources: (sources.data ?? []).map(rowToSource),
      drafts: (drafts.data ?? []).map(rowToDraft),
      proofs: (proofs.data ?? []).map(rowToProof),
      runs: (runs.data ?? []).map(rowToRun),
      profile: profile.data ? rowToProfile(profile.data) : null,
    };
    return NextResponse.json({ state });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'DB read failed' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  if (!supabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 501 });
  }
  try {
    const state = (await req.json()) as AppState;
    const client = db();

    await upsertAppState(client, state);

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'DB write failed' }, { status: 500 });
  }
}

export async function DELETE() {
  if (!supabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 501 });
  }
  try {
    await clearAppState(db());
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'DB clear failed' }, { status: 500 });
  }
}
