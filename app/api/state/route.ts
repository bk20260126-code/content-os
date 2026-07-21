import { NextRequest, NextResponse } from 'next/server';
import { AppState } from '@/lib/types';
import {
  db, supabaseConfigured,
  sourceToRow, rowToSource, draftToRow, rowToDraft,
  proofToRow, rowToProof, runToRow, rowToRun,
  profileToRow, rowToProfile,
} from '@/lib/db';

/**
 * GET  /api/state — load full AppState from Supabase (null if DB is empty: first run)
 * PUT  /api/state — persist full AppState (upsert all rows, delete removed rows)
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

    const empty = (sources.data?.length ?? 0) === 0 && (drafts.data?.length ?? 0) === 0;
    if (empty) return NextResponse.json({ state: null });

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

    // 1. Upsert parents first (FK order), then children.
    if (state.sources.length) {
      const { error } = await client.from('sources').upsert(state.sources.map(sourceToRow));
      if (error) throw new Error(`sources upsert: ${error.message}`);
    }
    if (state.drafts.length) {
      const { error } = await client.from('drafts').upsert(state.drafts.map(draftToRow));
      if (error) throw new Error(`drafts upsert: ${error.message}`);
    }
    if (state.proofs.length) {
      const { error } = await client.from('proofs').upsert(state.proofs.map(proofToRow));
      if (error) throw new Error(`proofs upsert: ${error.message}`);
    }
    if (state.runs.length) {
      const { error } = await client.from('runs').upsert(state.runs.map(runToRow));
      if (error) throw new Error(`runs upsert: ${error.message}`);
    }
    if (state.profile) {
      const { error } = await client.from('creator_profile').upsert(profileToRow(state.profile));
      if (error) throw new Error(`profile upsert: ${error.message}`);
    }

    // 2. Delete rows that no longer exist in the payload (children first, then parents).
    const deleteRemoved = async (table: string, keepIds: string[]) => {
      const { data, error } = await client.from(table).select('id');
      if (error) throw new Error(`${table} select: ${error.message}`);
      const removed = (data ?? []).map((r: { id: string }) => r.id).filter(id => !keepIds.includes(id));
      if (removed.length) {
        const { error: delError } = await client.from(table).delete().in('id', removed);
        if (delError) throw new Error(`${table} delete: ${delError.message}`);
      }
    };
    await deleteRemoved('runs', state.runs.map(r => r.id));
    await deleteRemoved('proofs', state.proofs.map(p => p.id));
    await deleteRemoved('drafts', state.drafts.map(d => d.id));
    await deleteRemoved('sources', state.sources.map(s => s.id));

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'DB write failed' }, { status: 500 });
  }
}
