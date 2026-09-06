import { Draft, DraftStatus, ProofAsset, GateResult } from './types';

export const requiredChecks = [
  { key: 'founderAuthority', label: '내 경험 또는 직접 확인한 관점이 담겼습니다', problem: '직접 경험하거나 확인한 관점이 담겼는지 점검하세요.' },
  { key: 'specificity', label: '주장과 사례가 구체적입니다', problem: '주장과 사례를 구체적으로 작성했는지 점검하세요.' },
  { key: 'antiGenericness', label: '누구나 쓸 수 있는 상투적인 글을 걷어냈습니다', problem: '상투적인 표현을 걷어냈는지 점검하세요.' },
] as const;
export const advisoryChecks = [
  { key: 'businessTension', label: '문제와 해결이 선명한가?' },
  { key: 'categoryOwnership', label: '나만의 관점이 드러나는가?' },
  { key: 'conversionIntent', label: '독자의 다음 행동이 적절한가?' },
] as const;
export const revisionOf = (d: Draft) => d.workflow?.revision ?? 1;
export const proofFingerprint = (p: ProofAsset) => JSON.stringify([p.id, p.type, p.title, p.description, p.url ?? '']);
export const evidenceFor = (d: Draft, proofs: ProofAsset[]) => proofs.find(p => p.id === d.proof.proofId);
export function evidenceVerified(d: Draft, proofs: ProofAsset[]): boolean {
  const p = evidenceFor(d, proofs), v = d.workflow?.verifiedProof;
  return !!(p && v && v.revision === revisionOf(d) && v.proofId === p.id && v.fingerprint === proofFingerprint(p));
}
export function gateProblems(d: Draft, proofs: ProofAsset[]): string[] {
  const problems: string[] = [];
  if (!d.content.hook.trim() || !d.content.mainPoint.trim()) problems.push('도입부와 본문을 작성하세요.');
  if (!d.content.claim?.trim()) problems.push('근거로 뒷받침할 핵심 주장을 적으세요.');
  for (const c of requiredChecks) if (!d.brandVoiceGate[c.key]) problems.push(c.problem);
  if (!evidenceFor(d, proofs)) problems.push('핵심 주장을 뒷받침하는 자료를 연결하세요.');
  else if (!evidenceVerified(d, proofs)) problems.push('원문을 확인하고 이 주장에 대한 근거 확인을 표시하세요.');
  return problems;
}
export function gateResult(d: Draft, proofs: ProofAsset[]): GateResult {
  if (!d.brandVoiceGate.antiGenericness) return 'Too generic';
  if (!d.brandVoiceGate.founderAuthority) return 'Needs stronger founder take';
  if (!evidenceVerified(d, proofs)) return 'Needs proof';
  return gateProblems(d, proofs).length ? 'Rewrite needed' : 'Ready for review';
}
export const reviewCurrent = (d: Draft, proofs: ProofAsset[]) => d.workflow?.reviewed?.revision === revisionOf(d) && gateProblems(d, proofs).length === 0;
export function editDraft(d: Draft, changes: Partial<Pick<Draft, 'content' | 'proof' | 'brandVoiceGate'>>): Draft {
  if (d.status === 'Published') return d;
  const substantive = !!(changes.content || changes.proof);
  return { ...d, ...changes, status: 'Draft', updatedAt: new Date().toISOString(),
    brandVoiceGate: { ...(changes.brandVoiceGate ?? d.brandVoiceGate), result: 'Rewrite needed' },
    workflow: { ...d.workflow, revision: revisionOf(d) + (substantive ? 1 : 0),
      reviewed: undefined, verifiedProof: substantive ? undefined : d.workflow?.verifiedProof },
  };
}
export function verifyEvidence(d: Draft, proofs: ProofAsset[], checked: boolean): Draft {
  const p = evidenceFor(d, proofs);
  if (d.status === 'Published') return d;
  return { ...d, status: 'Draft', updatedAt: new Date().toISOString(), workflow: {
    ...d.workflow, revision: revisionOf(d), reviewed: undefined,
    verifiedProof: checked && p ? { revision: revisionOf(d), proofId: p.id, fingerprint: proofFingerprint(p) } : undefined,
  } };
}
export function safeWebUrl(value: string | undefined): string | null {
  try { const u = new URL(value ?? ''); return ['https:', 'http:'].includes(u.protocol) ? u.href : null; } catch { return null; }
}
export function transitionDraft(d: Draft, status: DraftStatus, proofs: ProofAsset[], confirmation?: { reviewed?: boolean; published?: boolean; url?: string }): { draft: Draft; error?: string } {
  const fail = (error: string) => ({ draft: d, error });
  if (d.status === 'Published') return fail('발행 기록은 보존됩니다. 수정본을 만들어 주세요.');
  if (status === 'Published' || status === 'Scheduled' || status === 'Review') {
    const problems = gateProblems(d, proofs);
    if (problems.length) return fail(problems.join(' '));
    if (status === 'Review' && !confirmation?.reviewed) return fail('내용과 근거를 최종 확인해 주세요.');
    if (status !== 'Review' && !reviewCurrent(d, proofs)) return fail('현재 버전의 최종 검토를 먼저 완료하세요.');
  }
  if (status === 'Published' && (!confirmation?.published || !safeWebUrl(confirmation.url))) return fail('실제 게시를 확인하고 게시물 링크를 입력하세요.');
  const now = new Date().toISOString();
  return { draft: { ...d, status, updatedAt: now, brandVoiceGate: { ...d.brandVoiceGate, result: gateResult(d, proofs) }, workflow: {
    ...d.workflow, revision: revisionOf(d),
    reviewed: status === 'Review' ? { revision: revisionOf(d), at: now } : (status === 'Draft' || status === 'Idea' || status === 'Recycle') ? undefined : d.workflow?.reviewed,
    publication: status === 'Published' ? { at: now, url: safeWebUrl(confirmation?.url)! } : d.workflow?.publication,
  } } };
}
export function newDraft(sourceId: string, platform: Draft['platform'], content: Draft['content'], supersedes?: string): Draft {
  return { id: crypto.randomUUID(), sourceId, platform, content, status: 'Draft', proof: { exists: false, type: 'source document', description: '' },
    brandVoiceGate: { founderAuthority: false, businessTension: false, categoryOwnership: false, proofDensity: false, specificity: false, antiGenericness: false, conversionIntent: false, result: 'Rewrite needed' },
    updatedAt: new Date().toISOString(), workflow: { revision: 1, supersedes } };
}
export const draftRequestKey = (d: Draft) => JSON.stringify([d.id, revisionOf(d), d.content, d.proof]);
