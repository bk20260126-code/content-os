/**
 * Server-side Supabase client + row mappers.
 * Used only from app/api routes — keys never reach the browser.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Source, Draft, ProofAsset, ContentRun, CreatorProfile } from './types';

/**
 * Server credential. Prefer the service_role key: the API route is the only, trusted
 * access path (keys never reach the browser), and service_role bypasses RLS. Once the
 * permissive anon policies are dropped (migration v2, rls_lockdown), the service_role
 * key is REQUIRED — a leaked anon key can no longer touch any row.
 * SECRET: service_role grants full DB access — never expose it with a NEXT_PUBLIC_ prefix.
 * There is intentionally no anon-key fallback: migration v2 denies anon access.
 */
function serverKey(): string | undefined {
  return process.env.SUPABASE_SERVICE_ROLE_KEY;
}

export function supabaseConfigured(): boolean {
  return !!(process.env.SUPABASE_URL && serverKey());
}

export function db(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = serverKey();
  if (!url || !key) {
    throw new Error(
      'Supabase is not configured (need SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)',
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

/* ---------- row mappers (snake_case DB ↔ camelCase app) ---------- */

export const sourceToRow = (s: Source) => ({
  id: s.id, title: s.title, url: s.url, type: s.type, raw_notes: s.rawNotes,
  topic_cluster: s.topicCluster, pain_point: s.painPoint, audience_signal: s.audienceSignal,
  business_relevance: s.businessRelevance, proof_needed: s.proofNeeded,
  sales_trigger: s.salesTrigger, offer_angle: s.offerAngle, status: s.status,
  score: s.score ?? null, created_at: s.createdAt, updated_at: new Date().toISOString(),
});

export const rowToSource = (r: any): Source => ({
  id: r.id, title: r.title, url: r.url, type: r.type, rawNotes: r.raw_notes,
  topicCluster: r.topic_cluster, painPoint: r.pain_point, audienceSignal: r.audience_signal,
  businessRelevance: r.business_relevance, proofNeeded: r.proof_needed,
  salesTrigger: r.sales_trigger, offerAngle: r.offer_angle, status: r.status,
  score: r.score ?? undefined, createdAt: r.created_at,
});

export const draftToRow = (d: Draft) => ({
  id: d.id, source_id: d.sourceId, platform: d.platform, status: d.status,
  content: d.content, proof: d.proof, brand_voice_gate: d.brandVoiceGate, updated_at: d.updatedAt,
});

export const rowToDraft = (r: any): Draft => ({
  id: r.id, sourceId: r.source_id, platform: r.platform, status: r.status,
  content: r.content, proof: r.proof, brandVoiceGate: r.brand_voice_gate, updatedAt: r.updated_at,
});

export const proofToRow = (p: ProofAsset) => ({
  id: p.id, source_id: p.sourceId ?? null, type: p.type, title: p.title,
  description: p.description, url: p.url ?? null, created_at: p.createdAt,
});

export const rowToProof = (r: any): ProofAsset => ({
  id: r.id, sourceId: r.source_id ?? undefined, type: r.type, title: r.title,
  description: r.description, url: r.url ?? undefined, createdAt: r.created_at,
});

export const runToRow = (run: ContentRun) => ({
  id: run.id, source_id: run.sourceId, draft_id: run.draftId ?? null, stage: run.stage,
  interview: run.interview, anchor_draft: run.anchorDraft, review: run.review,
  derivatives: run.derivatives, lessons: run.lessons, status: run.status,
  created_at: run.createdAt, updated_at: run.updatedAt,
});

export const rowToRun = (r: any): ContentRun => ({
  id: r.id, sourceId: r.source_id, draftId: r.draft_id ?? undefined, stage: r.stage,
  interview: r.interview, anchorDraft: r.anchor_draft, review: r.review,
  derivatives: r.derivatives, lessons: r.lessons, status: r.status,
  createdAt: r.created_at, updatedAt: r.updated_at,
});

export const profileToRow = (p: CreatorProfile) => ({
  id: 'singleton', name: p.name, positioning: p.positioning,
  voice: p.voice, avoid: p.avoid, primary_cta: p.primaryCta,
});

export const rowToProfile = (r: any): CreatorProfile => ({
  name: r.name, positioning: r.positioning, voice: r.voice ?? [],
  avoid: r.avoid ?? [], primaryCta: r.primary_cta ?? '',
});
