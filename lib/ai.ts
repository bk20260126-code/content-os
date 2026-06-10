/**
 * Server-side AI provider — Gemini via @google/genai.
 * Used only from app/api routes. Never import in client components.
 *
 * Tasks (Phase 1 scope):
 *  - scoreSource:  source → SourceScore recommendation (0-30 + sub-scores + next action)
 *  - evaluateGate: draft → 7-criteria brand voice gate recommendation
 *  - generateDraft: source + platform → hook/mainPoint/cta draft
 *
 * Principle: AI output is a RECOMMENDATION. Final confirmation is always human.
 */

import { GoogleGenAI } from '@google/genai';
import { Source, Draft, Platform } from './types';

const MODEL = 'gemini-2.5-flash';

function client(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');
  return new GoogleGenAI({ apiKey });
}

async function generateJSON(prompt: string): Promise<unknown> {
  const ai = client();
  const res = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: { responseMimeType: 'application/json' },
  });
  return JSON.parse(res.text ?? '{}');
}

export async function scoreSource(source: Source): Promise<unknown> {
  return generateJSON(`You are a content scoring engine for a founder-brand content OS.
Score this source for repurposing value. Return JSON:
{"totalScore": 0-30, "brandVoiceScore": 0-100, "proofDensityScore": 0-15, "founderAuthorityScore": 0-15, "nextAction": "promote|enrich|rewrite|hold|archive", "rationale": "one paragraph"}

Scoring rules:
- proofDensityScore: does this enable concrete proof artifacts (screenshots, metrics, workflows)?
- founderAuthorityScore: can the founder add a first-person operator take?
- Penalize generic AI commentary heavily.

Source:
${JSON.stringify({ title: source.title, type: source.type, rawNotes: source.rawNotes, painPoint: source.painPoint, audienceSignal: source.audienceSignal, businessRelevance: source.businessRelevance, salesTrigger: source.salesTrigger, offerAngle: source.offerAngle }, null, 2)}`);
}

export async function evaluateGate(draft: Draft): Promise<unknown> {
  return generateJSON(`You are a brand voice gate for founder content. Evaluate this draft on 7 binary criteria. Return JSON:
{"founderAuthority": bool, "businessTension": bool, "categoryOwnership": bool, "proofDensity": bool, "specificity": bool, "antiGenericness": bool, "conversionIntent": bool, "result": "Ready for review|Needs proof|Needs stronger founder take|Too generic|Rewrite needed", "rationale": "one paragraph"}

Logo-swap test: if a generic AI consultant could publish this unchanged, antiGenericness = false.

Draft (${draft.platform}):
${JSON.stringify(draft.content, null, 2)}
Proof attached: ${draft.proof.exists} (${draft.proof.type})`);
}

export async function generateDraft(source: Source, platform: Platform): Promise<unknown> {
  return generateJSON(`You are a content drafter for a solo founder brand. Create a ${platform} draft from this source. Return JSON:
{"hook": "first line, pattern-interrupt, no clickbait", "mainPoint": "body, short sentences, one thought per line", "proofArtifactNeeded": "what concrete proof should accompany this", "cta": "one clear CTA"}

Rules: no generic AI commentary, founder first-person operator voice, concrete details over abstractions.

Source:
${JSON.stringify({ title: source.title, rawNotes: source.rawNotes, painPoint: source.painPoint, offerAngle: source.offerAngle }, null, 2)}`);
}
