import { AppState } from './types';

function object(v: unknown): Record<string, unknown> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error('데이터 항목 형식이 올바르지 않습니다.');
  return v as Record<string, unknown>;
}
function strings(v: Record<string, unknown>, keys: string[]) {
  for (const k of keys) if (typeof v[k] !== 'string') throw new Error(`${k}: 문자열이 필요합니다.`);
}
function optionalStrings(v: Record<string, unknown>, keys: string[]) {
  for (const k of keys) if (v[k] !== undefined && typeof v[k] !== 'string') throw new Error(`${k}: 문자열이 필요합니다.`);
}
function oneOf(v: unknown, values: string[]) { if (!values.includes(v as string)) throw new Error('알 수 없는 상태 또는 유형입니다.'); }
const proofTypes = ['screenshot','workflow map','system diagram','customer quote','before/after metric','source document','demo clip','validation loop','operating checklist'];
export function parseState(input: unknown): AppState {
  const s = object(input);
  if (s.schemaVersion !== 1) throw new Error('지원하지 않는 데이터 버전입니다. 원본을 보존하고 호환되는 앱에서 여세요.');
  for (const k of ['sources', 'drafts', 'proofs', 'runs']) {
    if (!Array.isArray(s[k])) throw new Error(`${k}: 목록이 필요합니다.`);
    const ids = new Set<string>();
    for (const item of s[k] as unknown[]) {
      const row = object(item); strings(row, ['id']);
      if (!row.id || ids.has(row.id as string)) throw new Error(`${k}: 비어 있거나 중복된 식별자입니다.`);
      ids.add(row.id as string);
    }
  }
  for (const v of s.sources as unknown[]) {
    const x = object(v); strings(x, ['title','url','rawNotes','topicCluster','painPoint','audienceSignal','businessRelevance','proofNeeded','salesTrigger','offerAngle','createdAt']);
    oneOf(x.type, ['YouTube','X/Twitter','Blog','Newsletter','Internal note','Customer call','Other']);
    oneOf(x.status, ['Inbox','Scored','Promoted','Drafted','Archived']);
    if (x.brief) strings(object(x.brief), ['claim','author','observedAt','excerpt','unknowns']);
    if (x.score) { const score = object(x.score); for (const k of ['totalScore','brandVoiceScore','proofDensityScore','founderAuthorityScore']) if (typeof score[k] !== 'number' || !Number.isFinite(score[k])) throw new Error('점수가 올바르지 않습니다.'); }
  }
  for (const v of s.proofs as unknown[]) {
    const x = object(v); strings(x, ['title','description','createdAt']); optionalStrings(x, ['sourceId','url']); oneOf(x.type, proofTypes);
  }
  for (const v of s.drafts as unknown[]) {
    const x = object(v); strings(x, ['sourceId','updatedAt']);
    oneOf(x.platform, ['LinkedIn','Instagram','Threads','X','YouTube Shorts']);
    oneOf(x.status, ['Idea','Draft','Review','Scheduled','Published','Recycle']);
    const content = object(x.content); strings(content, ['hook','mainPoint','proofArtifactNeeded','cta']); optionalStrings(content, ['claim']);
    const proof = object(x.proof); strings(proof, ['description']); optionalStrings(proof, ['proofId']); oneOf(proof.type, proofTypes);
    if (typeof proof.exists !== 'boolean') throw new Error('증명 연결 상태가 올바르지 않습니다.');
    const gate = object(x.brandVoiceGate); strings(gate, ['result']);
    for (const k of ['founderAuthority','businessTension','categoryOwnership','proofDensity','specificity','antiGenericness','conversionIntent']) if (typeof gate[k] !== 'boolean') throw new Error('검토 항목이 올바르지 않습니다.');
    if (x.workflow) {
      const w = object(x.workflow); if (!Number.isSafeInteger(w.revision) || (w.revision as number) < 1) throw new Error('초안 버전이 올바르지 않습니다.');
      optionalStrings(w, ['supersedes','lesson']);
      for (const key of ['reviewed','verifiedProof']) if (w[key]) { const r = object(w[key]); if (!Number.isSafeInteger(r.revision)) throw new Error('검토 버전이 올바르지 않습니다.'); strings(r, key === 'reviewed' ? ['at'] : ['proofId','fingerprint']); }
      if (w.publication) strings(object(w.publication), ['at','url']);
    }
  }
  const sourceIds = new Set((s.sources as { id: string }[]).map(x => x.id));
  for (const d of s.drafts as { sourceId: string }[]) if (!sourceIds.has(d.sourceId)) throw new Error('초안이 참조하는 소스가 없습니다. 원본 백업을 확인하세요.');
  if (s.profile !== null) {
    const p = object(s.profile); strings(p, ['name','positioning','primaryCta']); optionalStrings(p, ['audience','goal']);
    for (const key of ['voice','avoid']) if (!Array.isArray(p[key]) || !(p[key] as unknown[]).every(v => typeof v === 'string')) throw new Error('작성자 설정이 올바르지 않습니다.');
  }
  return s as unknown as AppState;
}
export function parseJson(text: string): unknown {
  try { return JSON.parse(text); } catch { throw new Error('파일 내용이 손상되었거나 올바른 JSON 백업이 아닙니다. 원본은 변경하지 않았습니다.'); }
}
export function parseBackup(text: string): AppState {
  const v = object(parseJson(text));
  return parseState(v.format === 'content-os-backup' ? v.state : v);
}
export const serializeBackup = (state: AppState) => JSON.stringify({ format: 'content-os-backup', exportedAt: new Date().toISOString(), state }, null, 2);
