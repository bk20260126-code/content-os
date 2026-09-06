import React, { useState } from 'react';
import { Draft, DraftStatus, ProofAsset } from '@/lib/types';
import { ViewState } from '@/app/page';
import { gateProblems, reviewCurrent, revisionOf, safeWebUrl, transitionDraft } from '@/lib/workflow';
const columns: { id: DraftStatus; label: string }[] = [
  { id: 'Idea', label: '아이디어' }, { id: 'Draft', label: '초안' }, { id: 'Review', label: '검토 완료' },
  { id: 'Scheduled', label: '발행 예정' }, { id: 'Published', label: '발행 기록' }, { id: 'Recycle', label: '재활용 대기' },
];
interface Props { drafts: Draft[]; proofs: ProofAsset[]; setDrafts: React.Dispatch<React.SetStateAction<Draft[]>>; onNavigate: (view: ViewState, sourceId?: string, draftId?: string) => void }
export function Pipeline({ drafts, proofs, setDrafts, onNavigate }: Props) {
  const [publishing, setPublishing] = useState<string | null>(null);
  const [url, setUrl] = useState(''), [confirmed, setConfirmed] = useState(false), [notice, setNotice] = useState('');
  function move(draft: Draft, status: DraftStatus) {
    const result = transitionDraft(draft, status, proofs, { published: confirmed, url });
    if (result.error) { setNotice(result.error); return; }
    setDrafts(prev => prev.map(d => d.id === draft.id ? transitionDraft(d, status, proofs, { published: confirmed, url }).draft : d));
    setPublishing(null); setNotice('');
  }
  return <div className="space-y-6"><header><h2 className="text-2xl font-bold">발행 관리</h2><p className="mt-2 text-nf-muted">게시물은 각 채널에서 직접 올립니다. 이곳에는 검토와 실제 발행 기록을 남깁니다.</p></header>
    {notice && <p role="alert" className="notice">{notice}</p>}
    {!drafts.length && <button className="action" onClick={() => onNavigate('repurpose')}>첫 초안 만들기</button>}
    <div className="flex gap-4 overflow-x-auto pb-6">{columns.map(col => <section key={col.id} className="w-[300px] shrink-0 bg-white border border-nf-border p-4 space-y-4"><h3 className="font-semibold">{col.label} · {drafts.filter(d => d.status === col.id).length}</h3>
      {drafts.filter(d => d.status === col.id).map(d => <article className="border border-nf-border p-4 space-y-3" key={d.id}>
        <p className="text-sm text-nf-muted">{d.platform} · 버전 {revisionOf(d)}</p><h4 className="font-semibold break-words">{d.content.hook || '제목 없는 초안'}</h4>
        {d.status !== 'Published' && !reviewCurrent(d, proofs) && <p className="text-sm text-amber-800">{gateProblems(d, proofs)[0] ?? '현재 버전의 최종 검토가 필요합니다.'}</p>}
        <button className="action-secondary w-full" onClick={() => onNavigate('repurpose', d.sourceId, d.id)}>{d.status === 'Published' ? '발행 당시 내용·수정본 보기' : '작성·최종 검토하기'}</button>
        {d.status !== 'Published' && <><label className="block text-sm">작업 상태<select aria-label={`${d.content.hook || '초안'} 작업 상태`} className="field" value={d.status} onChange={e => move(d, e.target.value as DraftStatus)}>{columns.filter(c => c.id !== 'Published').map(c => <option key={c.id} value={c.id} disabled={c.id === 'Review' || (c.id === 'Scheduled' && !reviewCurrent(d, proofs))}>{c.label}</option>)}</select></label>
        <button className="action w-full" disabled={!reviewCurrent(d, proofs)} onClick={() => { setPublishing(d.id); setUrl(''); setConfirmed(false); setNotice(''); }}>실제 발행 기록하기</button></>}
        {publishing === d.id && <div className="space-y-3"><label>게시물 링크<input className="field" type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…" /></label><label className="flex gap-2"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />해당 채널에 실제로 게시했음을 확인했습니다.</label><button className="action" disabled={!confirmed || !safeWebUrl(url)} onClick={() => move(d, 'Published')}>발행 완료로 기록</button><button className="action-secondary" onClick={() => setPublishing(null)}>취소</button></div>}
        {d.status === 'Published' && <>{d.workflow?.publication ? <><a className="underline break-all" href={safeWebUrl(d.workflow.publication.url) ?? undefined} target="_blank" rel="noreferrer">게시물 열기</a><p className="text-sm text-nf-muted">기록 시각: {new Date(d.workflow.publication.at).toLocaleString('ko-KR')}</p></> : <p className="text-sm text-amber-800">이전 버전의 발행 기록 · 당시 검토와 게시 링크는 미확인</p>}
        <label className="block text-sm">다음 글에 반영할 교훈<textarea className="field" rows={3} value={d.workflow?.lesson ?? ''} onChange={e => { const lesson = e.target.value; setDrafts(prev => prev.map(x => x.id === d.id ? { ...x, workflow: { ...x.workflow, revision: revisionOf(x), lesson } } : x)); }} placeholder="다음 글에서는 무엇을 유지하거나 바꿀까요?" /></label></>}
      </article>)}
    </section>)}</div>
  </div>;
}
