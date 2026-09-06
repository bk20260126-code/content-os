import assert from 'node:assert/strict';
import test from 'node:test';
import { newDraft, editDraft, verifyEvidence, transitionDraft, gateProblems, revisionOf, draftRequestKey, proofFingerprint } from '../lib/workflow';
import { ProofAsset } from '../lib/types';
const proof: ProofAsset = { id: 'p', type: 'source document', title: '실험 기록', description: '2026-09-06 세 차례 측정한 시간', createdAt: '2026-09-06', url: 'https://example.org/evidence' };
function ready() {
  let d = newDraft('s', 'Threads', { hook: '직접 해봤습니다', mainPoint: '세 번 측정했습니다', cta: '', proofArtifactNeeded: '', claim: '처리 시간을 줄였습니다' });
  d = editDraft(d, { proof: { proofId: proof.id, exists: true, type: proof.type, description: proof.description }, brandVoiceGate: { ...d.brandVoiceGate, antiGenericness: true, founderAuthority: true, specificity: true } });
  return verifyEvidence(d, [proof], true);
}
test('registered evidence alone is insufficient; exact claim requires human evidence verification', () => {
  const d = ready(); assert.deepEqual(gateProblems(d, [proof]), []);
  assert.ok(gateProblems(verifyEvidence(d, [proof], false), [proof]).length);
  assert.ok(gateProblems(d, []).length);
  assert.ok(gateProblems(d, [{ ...proof, description: '원문 변경' }]).length);
});
test('every gated transition rejects an unreviewed draft and a forged exists flag', () => {
  const d = newDraft('s', 'X', { hook: 'h', mainPoint: 'm', cta: '', proofArtifactNeeded: '' }); d.proof.exists = true;
  for (const status of ['Review','Scheduled','Published'] as const) assert.ok(transitionDraft(d, status, [proof], { reviewed: true, published: true, url: 'https://example.org/post' }).error);
});
test('specificity is required, editorial recommendations are optional', () => {
  const d = ready(); assert.equal(d.brandVoiceGate.businessTension, false); assert.equal(gateProblems(d, [proof]).length, 0);
  assert.ok(gateProblems(editDraft(d, { brandVoiceGate: { ...d.brandVoiceGate, specificity: false } }), [proof]).length);
});
test('human final review precedes scheduling and actual publication', () => {
  const d = ready(); assert.ok(transitionDraft(d, 'Review', [proof]).error);
  assert.ok(transitionDraft(d, 'Scheduled', [proof]).error);
  const reviewed = transitionDraft(d, 'Review', [proof], { reviewed: true }).draft;
  assert.equal(transitionDraft(reviewed, 'Scheduled', [proof]).error, undefined);
  assert.ok(transitionDraft(reviewed, 'Published', [proof], { url: 'https://example.org/post' }).error);
  assert.ok(transitionDraft(reviewed, 'Published', [proof], { published: true, url: 'javascript:alert(1)' }).error);
  const published = transitionDraft(reviewed, 'Published', [proof], { published: true, url: 'https://example.org/post' }).draft;
  assert.equal(published.workflow?.publication?.url, 'https://example.org/post');
  assert.equal(published.status, 'Published');
});
test('editing content invalidates evidence and review, and changes AI request identity', () => {
  const d = transitionDraft(ready(), 'Review', [proof], { reviewed: true }).draft;
  const changed = editDraft(d, { content: { ...d.content, mainPoint: '다른 주장' } });
  assert.equal(changed.status, 'Draft'); assert.equal(changed.workflow?.reviewed, undefined); assert.equal(changed.workflow?.verifiedProof, undefined);
  assert.equal(revisionOf(changed), revisionOf(d) + 1); assert.notEqual(draftRequestKey(changed), draftRequestKey(d));
  assert.ok(transitionDraft(changed, 'Scheduled', [proof]).error);
});
test('detaching evidence invalidates a scheduled draft', () => {
  const d = transitionDraft(transitionDraft(ready(), 'Review', [proof], { reviewed: true }).draft, 'Scheduled', [proof]).draft;
  const changed = editDraft(d, { proof: { ...d.proof, proofId: undefined, exists: false } });
  assert.equal(changed.status, 'Draft'); assert.ok(transitionDraft(changed, 'Published', [proof], { published: true, url: 'https://example.org' }).error);
});
test('published content is immutable and new revisions retain an origin link', () => {
  const d = transitionDraft(transitionDraft(ready(), 'Review', [proof], { reviewed: true }).draft, 'Published', [proof], { published: true, url: 'https://example.org/post' }).draft;
  assert.deepEqual(editDraft(d, { content: { ...d.content, hook: 'overwrite' } }), d);
  assert.ok(transitionDraft(d, 'Draft', [proof]).error);
  const copy = newDraft(d.sourceId, d.platform, { ...d.content }, d.id);
  assert.notEqual(copy.id, d.id); assert.equal(copy.workflow?.supersedes, d.id); assert.equal(copy.workflow?.reviewed, undefined);
});
test('proof verification is bound to material, including the original link', () => {
  assert.notEqual(proofFingerprint(proof), proofFingerprint({ ...proof, url: 'https://example.org/other' }));
});
