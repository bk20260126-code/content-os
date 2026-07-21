import { SupabaseClient } from '@supabase/supabase-js';
import { AppState } from './types';
import { sourceToRow, draftToRow, proofToRow, runToRow, profileToRow } from './db';

export async function upsertAppState(client: SupabaseClient, state: AppState): Promise<void> {
  // Upsert parents first to satisfy foreign keys. Deliberately do not infer deletion
  // from an omitted ID: a stale browser snapshot must never delete newer rows.
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
}

export async function clearAppState(client: SupabaseClient): Promise<void> {
  // Explicit destructive operation, children first to respect foreign keys.
  for (const table of ['runs', 'proofs', 'drafts', 'sources'] as const) {
    const { error } = await client.from(table).delete().not('id', 'is', null);
    if (error) throw new Error(`${table} clear: ${error.message}`);
  }
  const { error } = await client.from('creator_profile').delete().eq('id', 'singleton');
  if (error) throw new Error(`profile clear: ${error.message}`);
}
