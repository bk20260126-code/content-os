import React, { useRef, useState, useEffect } from 'react';
import { Source, Draft, ProofAsset, CreatorProfile, Platform } from '@/lib/types';
import { ViewState } from '@/app/page';
import { requestAI } from '@/lib/ai-client';
import { ProofAttach } from './ProofAttach';
import { requiredChecks, advisoryChecks, draftRequestKey, editDraft, evidenceFor, evidenceVerified, gateProblems, newDraft, revisionOf, transitionDraft, verifyEvidence } from '@/lib/workflow';

interface Props {
  sources: Source[]; drafts: Draft[]; proofs: ProofAsset[]; profile: CreatorProfile | null;
  setDrafts: React.Dispatch<React.SetStateAction<Draft[]>>;
  setProofs: React.Dispatch<React.SetStateAction<ProofAsset[]>>;
  selectedSourceId: string | null; selectedDraftId?: string | null;
  onNavigate: (view: ViewState, sourceId?: string, draftId?: string) => void;
}
type GateRec = Pick<Draft['brandVoiceGate'], 'founderAuthority' | 'specificity' | 'antiGenericness' | 'businessTension' | 'categoryOwnership' | 'conversionIntent'> & { rationale: string };
export function RepurposeStudio({ sources, drafts, proofs, profile, setDrafts, setProofs, selectedSourceId, selectedDraftId, onNavigate }: Props) {
  const initialDraft = drafts.find(d => d.id === selectedDraftId);
  const candidates = sources.filter(s => s.status !== 'Archived');
  const [sourceId, setSourceId] = useState(initialDraft?.sourceId ?? selectedSourceId ?? candidates[0]?.id ?? '');
  const [platform, setPlatform] = useState<Platform>(initialDraft?.platform ?? 'LinkedIn');
  const [draftId, setDraftId] = useState(initialDraft?.id ?? '');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [rec, setRec] = useState<{ key: string; value: GateRec } | null>(null);
  const source = sources.find(s => s.id === sourceId);
  const versions = drafts.filter(d => d.sourceId === sourceId && d.platform === platform);
  const draft = versions.find(d => d.id === draftId) ?? versions.find(d => d.status !== 'Published') ?? versions[0];
  const activeKey = draft ? draftRequestKey(draft) : '';
  const activeKeyRef = useRef(activeKey);
  useEffect(() => { activeKeyRef.current = activeKey; }, [activeKey]);
  const frozen = draft?.status === 'Published';
  const problems = draft ? gateProblems(draft, proofs) : [];
  const validRec = rec?.key === activeKey ? rec.value : null;
  function update(fn: (d: Draft) => Draft) {
    if (!draft) return;
    setDrafts(prev => prev.map(d => d.id === draft.id ? fn(d) : d));
    setRec(null); setNotice('');
  }
  const switchSource = (id: string) => { setSourceId(id); setDraftId(''); setRec(null); setNotice(''); };
  async function create(ai: boolean) {
    if (!source || loading) return;
    const capturedSource = source, capturedPlatform = platform;
    setLoading(true); setNotice('');
    try {
      let content: Draft['content'] = { hook: '', mainPoint: '', claim: source.brief?.claim ?? '', proofArtifactNeeded: source.proofNeeded, cta: profile?.primaryCta ?? '' };
      if (ai) {
        const result = await requestAI<Draft['content']>('draft', { source: capturedSource, platform: capturedPlatform, profile });
        if (!result || !['hook','mainPoint','cta','proofArtifactNeeded'].every(k => typeof result[k as keyof typeof result] === 'string')) throw new Error('AI 응답 형식이 올바르지 않습니다. 직접 작성으로 시작할 수 있습니다.');
        content = { ...content, hook: result.hook, mainPoint: result.mainPoint, cta: result.cta, proofArtifactNeeded: result.proofArtifactNeeded };
      }
      const created = newDraft(capturedSource.id, capturedPlatform, content);
      setDrafts(prev => [...prev, created]);
      setSourceId(capturedSource.id); setPlatform(capturedPlatform); setDraftId(created.id); setRec(null);
    } catch (e) { setNotice(e instanceof Error ? e.message : 'AI 요청 실패'); }
    finally { setLoading(false); }
  }
  async function evaluate() {
    if (!draft || loading) return;
    const key = draftRequestKey(draft); setLoading(true); setRec(null); setNotice('');
    try {
      const value = await requestAI<GateRec>('gate', { draft, proof: evidenceFor(draft, proofs), source, profile });
      if (!value || ![...requiredChecks, ...advisoryChecks].every(c => typeof value[c.key] === 'boolean') || typeof value.rationale !== 'string') throw new Error('AI 평가 형식이 올바르지 않습니다. 직접 검토해 주세요.');
      if (activeKeyRef.current === key) setRec({ key, value });
      else setNotice('평가 중 초안이 바뀌어 이전 결과를 적용하지 않았습니다.');
    } catch (e) { setNotice(e instanceof Error ? e.message : 'AI 평가 실패'); }
    finally { setLoading(false); }
  }
  function apply() {
    if (!draft || !validRec) return;
    const key = activeKey;
    setDrafts(prev => prev.map(d => d.id === draft.id && draftRequestKey(d) === key ? editDraft(d, { brandVoiceGate: { ...d.brandVoiceGate, ...validRec } }) : d));
    setRec(null);
  }
  function review() {
    if (!draft) return;
    const result = transitionDraft(draft, 'Review', proofs, { reviewed: true });
    if (result.error) { setNotice(result.error); return; }
    setDrafts(prev => prev.map(d => d.id === draft.id && draftRequestKey(d) === activeKey ? result.draft : d));
    onNavigate('pipeline');
  }
  function fork() {
    if (!draft) return;
    const created = newDraft(draft.sourceId, draft.platform, { ...draft.content }, draft.id);
    setDrafts(prev => [...prev, created]); setDraftId(created.id); setNotice('발행 당시 기록은 보존하고 새 수정본을 만들었습니다.');
  }
  if (!source) return <div className="space-y-4"><h2 className="text-2xl font-bold">첫 소재를 등록하세요</h2><p>내 경험이나 참고한 자료를 적으면 직접 작성을 시작할 수 있습니다.</p><button className="action" onClick={() => onNavigate('library')}>소스 추가하기</button></div>;
  return <div className="space-y-6 workspace-readable">
    <header><h2 className="text-2xl font-bold">콘텐츠 제작</h2><p className="text-nf-muted mt-2">직접 작성하고 근거를 확인하세요. AI는 선택해서 쓰는 초안·평가 도우미입니다.</p></header>
    <div className="grid md:grid-cols-3 gap-4">
      <label>소스<select className="field" value={sourceId} onChange={e => switchSource(e.target.value)}>{candidates.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}</select></label>
      <label>게시할 채널<select className="field" value={platform} onChange={e => { setPlatform(e.target.value as Platform); setDraftId(''); setRec(null); setNotice(''); }}>{(['LinkedIn','Instagram','Threads','X','YouTube Shorts'] as Platform[]).map(p => <option key={p}>{p}</option>)}</select></label>
      <label>초안·발행 기록<select className="field" value={draft?.id ?? ''} onChange={e => { setDraftId(e.target.value); setRec(null); setNotice(''); }}><option value="" disabled>새 초안을 만드세요</option>{versions.map(d => <option key={d.id} value={d.id}>{d.status === 'Published' ? '발행 기록' : '작업 중'} · {d.content.hook || '제목 없는 초안'}</option>)}</select></label>
    </div>
    <details className="panel"><summary className="cursor-pointer font-semibold">소스의 주장과 근거 보기</summary><dl className="space-y-2 mt-4"><dt>핵심 주장</dt><dd>{source.brief?.claim || '아직 정리하지 않았습니다'}</dd><dt>출처·날짜</dt><dd>{source.brief?.author || source.title} · {source.brief?.observedAt || '날짜 미기록'}</dd><dt>직접 인용·관찰</dt><dd className="whitespace-pre-wrap">{source.brief?.excerpt || source.rawNotes}</dd><dt>미확인 사항</dt><dd>{source.brief?.unknowns || '미기록'}</dd></dl><button className="action-secondary mt-4" onClick={() => onNavigate('library', source.id)}>소스 정리하기</button></details>
    {notice && <p role="status" className="notice">{notice}</p>}
    {!draft ? <div className="panel space-y-4"><h3 className="text-xl font-semibold">이 소재로 어떤 이야기를 하고 싶나요?</h3><p>직접 작성은 계정과 API 키 없이 시작할 수 있습니다.</p><div className="flex gap-3"><button className="action" disabled={loading} onClick={() => create(false)}>직접 작성</button><button className="action-secondary" disabled={loading} onClick={() => create(true)}>{loading ? '요청 중…' : 'AI로 초안 만들기'}</button></div></div> : <>
      <div className="flex flex-wrap items-center gap-4"><p>버전 {revisionOf(draft)} · {frozen ? '발행 당시 기록' : draft.workflow?.reviewed ? '최종 검토 완료' : '검토 필요'}</p>{frozen && <button className="action" onClick={fork}>수정본 만들기</button>}</div>
      <div className="grid xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)] gap-6">
        <div className="panel space-y-5">
          <fieldset disabled={frozen} className="space-y-5">
            <label className="block">도입부<textarea className="field" rows={2} value={draft.content.hook} placeholder="독자가 처음 읽을 한 문장은 무엇인가요?" onChange={e => update(d => editDraft(d, { content: { ...d.content, hook: e.target.value } }))} /></label>
            <label className="block">본문<textarea className="field" rows={10} value={draft.content.mainPoint} placeholder="직접 겪거나 확인한 사례와 독자에게 도움이 될 내용을 적으세요." onChange={e => update(d => editDraft(d, { content: { ...d.content, mainPoint: e.target.value } }))} /></label>
            <label className="block">독자의 다음 행동<input className="field" value={draft.content.cta} placeholder="읽고 나서 무엇을 해보면 좋을까요?" onChange={e => update(d => editDraft(d, { content: { ...d.content, cta: e.target.value } }))} /></label>
            <label className="block">근거로 뒷받침할 핵심 주장<textarea className="field" rows={2} value={draft.content.claim ?? ''} placeholder="자료를 통해 확인할 수 있는 주장 한 가지" onChange={e => update(d => editDraft(d, { content: { ...d.content, claim: e.target.value } }))} /></label>
            <ProofAttach key={draft.id} draft={draft} proofs={proofs} onRegister={p => setProofs(prev => [p, ...prev])}
              onAttach={(id, registered) => { const p = registered ?? proofs.find(p => p.id === id); if (p) update(d => editDraft(d, { proof: { proofId: p.id, exists: true, type: p.type, description: p.description } })); }}
              onDetach={() => update(d => editDraft(d, { proof: { ...d.proof, proofId: undefined, exists: false } }))} />
            <label className="flex gap-3 items-start"><input type="checkbox" className="mt-1" checked={evidenceVerified(draft, proofs)} disabled={!evidenceFor(draft, proofs) || !draft.content.claim?.trim() || frozen} onChange={e => update(d => verifyEvidence(d, proofs, e.target.checked))} /><span>자료 원문을 직접 확인했고, 위 핵심 주장을 뒷받침함을 확인했습니다.</span></label>
          </fieldset>
        </div>
        <aside className="panel space-y-5">
          <h3 className="text-xl font-semibold">검토</h3><p className="text-nf-muted">본문·주장·자료를 바꾸면 근거와 최종 검토를 다시 확인합니다.</p>
          <fieldset disabled={frozen} className="space-y-4"><legend className="font-semibold mb-3">필수 조건</legend>{requiredChecks.map(c => <label className="flex gap-3" key={c.key}><input type="checkbox" checked={draft.brandVoiceGate[c.key]} onChange={e => update(d => editDraft(d, { brandVoiceGate: { ...d.brandVoiceGate, [c.key]: e.target.checked } }))} />{c.label}</label>)}</fieldset>
          <fieldset disabled={frozen} className="space-y-4"><legend className="font-semibold mb-3">개선 권고 · 통과 조건에는 미포함</legend>{advisoryChecks.map(c => <label className="flex gap-3" key={c.key}><input type="checkbox" checked={draft.brandVoiceGate[c.key]} onChange={e => update(d => editDraft(d, { brandVoiceGate: { ...d.brandVoiceGate, [c.key]: e.target.checked } }))} />{c.label}</label>)}</fieldset>
          {!frozen && <><button className="action-secondary w-full" disabled={loading} onClick={evaluate}>{loading ? '평가 중…' : 'AI 평가 요청 (선택)'}</button>{validRec && <div className="notice space-y-3"><p>{validRec.rationale}</p><p>AI 추천은 근거 확인·최종 검토를 대신하지 않습니다.</p><button className="action-secondary" onClick={apply}>추천 항목 적용</button></div>}
          {problems.length ? <div className="notice"><p className="font-semibold">다음 확인이 필요합니다</p><ul className="list-disc pl-5 mt-2 space-y-2">{problems.map(p => <li key={p}>{p}</li>)}</ul></div> : <p className="notice">필수 조건을 충족했습니다. 내용을 최종 확인해 주세요.</p>}
          <button className="action w-full" disabled={problems.length > 0} onClick={review}>내용·근거 최종 확인하고 리뷰로 이동</button></>}
          {frozen && <p>발행 기록은 편집되지 않습니다. 수정본에서 새 검토를 진행하세요.</p>}
        </aside>
      </div>
    </>}
  </div>;
}
