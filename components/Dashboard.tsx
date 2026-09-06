import React from 'react';
import { Source, Draft, ProofAsset } from '@/lib/types';
import { gateProblems, reviewCurrent } from '@/lib/workflow';
import { ViewState } from '@/app/page';

interface DashboardProps {
  sources: Source[];
  drafts: Draft[];
  proofs: ProofAsset[];
  onNavigate: (view: ViewState, sourceId?: string, draftId?: string) => void;
}

export function Dashboard({ sources, drafts, proofs, onNavigate }: DashboardProps) {
  const totalSources = sources.length;
  const needsScoring = sources.filter(s => s.status !== 'Archived' && s.status !== 'Promoted' && s.status !== 'Drafted' && !s.score).length;
  const promotedNoDraft = sources.filter(s => (s.status === 'Promoted') && !drafts.some(d => d.sourceId === s.id)).length;
  const gatePending = drafts.filter(d => (d.status === 'Draft' || d.status === 'Idea') && gateProblems(d, proofs).length > 0).length;
  const itemsReadyForReview = drafts.filter(d => reviewCurrent(d, proofs) && d.status !== 'Published').length;
  const inProduction = drafts.filter(d => d.status === 'Draft' || d.status === 'Idea').length;

  // 다음 할 일 — 파이프라인의 가장 앞에서 막힌 지점을 안내
  let nextAction: { title: string; desc: string; cta: string; view: 'library' | 'scoring' | 'repurpose' | 'pipeline' };
  if (totalSources === 0) {
    nextAction = { title: '첫 소스를 수집하세요', desc: '레퍼런스(유튜브·아티클·고객 대화)를 등록하면 파이프라인이 시작됩니다.', cta: '1단계 — 소스 추가하기', view: 'library' };
  } else if (drafts.filter(d => d.status !== 'Published').length === 0) {
    nextAction = { title: '내 소재로 첫 초안을 써보세요', desc: '직접 작성은 AI 키 없이 시작할 수 있습니다. 소재 비교가 필요하면 채점을 선택해서 쓰세요.', cta: '직접 작성하러 가기', view: 'repurpose' };
  } else if (promotedNoDraft > 0) {
    nextAction = { title: `초안이 없는 승급 소스 ${promotedNoDraft}개`, desc: '승급된 소스로 채널별 AI 초안을 생성하세요.', cta: '3단계 — 초안 생성하기', view: 'repurpose' };
  } else if (gatePending > 0) {
    nextAction = { title: `게이트 통과 대기 초안 ${gatePending}개`, desc: '브랜드 보이스 게이트를 평가하고 증거를 첨부하세요. 게이트를 통과해야 발행 단계로 갑니다.', cta: '3단계 — 게이트 평가하기', view: 'repurpose' };
  } else if (itemsReadyForReview > 0) {
    nextAction = { title: `리뷰 대기 콘텐츠 ${itemsReadyForReview}개`, desc: '게이트를 통과한 콘텐츠를 최종 리뷰하고 발행 일정을 정하세요.', cta: '4단계 — 파이프라인 가기', view: 'pipeline' };
  } else {
    nextAction = { title: '다음 콘텐츠를 준비하세요', desc: '새 소스를 수집해 다음 사이클을 시작하세요.', cta: '1단계 — 소스 추가하기', view: 'library' };
  }

  const steps = [
    { n: '1', label: '수집', count: totalSources, unit: '소스', desc: '레퍼런스 등록', view: 'library' as const },
    { n: '2', label: '채점 · 승급', count: needsScoring, unit: '대기', desc: 'AI 채점 → 사람 확정', view: 'scoring' as const },
    { n: '3', label: '제작', count: inProduction, unit: '초안', desc: '직접 작성 · 근거 검토', view: 'repurpose' as const },
    { n: '4', label: '발행 관리', count: itemsReadyForReview, unit: '리뷰 대기', desc: '검토 · 실제 발행 기록', view: 'pipeline' as const },
  ];

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <header className="h-[78px] border-b border-nf-border flex items-center justify-between -mx-8 px-8 xl:-mx-10 xl:px-10 bg-white -mt-8 xl:-mt-10 mb-8 sticky top-0 z-10">
        <div>
          <h2 className="text-2xl font-bold text-nf-ink tracking-tight">대시보드</h2>
        </div>
        <p className="text-sm leading-relaxed text-nf-muted">수집 → 작성 → 근거 확인 → 직접 게시 · 발행 기록</p>
      </header>

      {/* 다음 할 일 — 항상 단 하나의 행동을 안내 */}
      <div className="border-2 border-nf-ink bg-white p-9 flex items-center justify-between gap-8">
        <div>
          <span className="text-xs text-nf-primary uppercase tracking-widest font-semibold">다음 할 일</span>
          <h3 className="font-display text-[2rem] leading-tight font-semibold text-nf-ink mt-3 mb-2">{nextAction.title}</h3>
          <p className="text-base text-nf-muted leading-relaxed max-w-2xl">{nextAction.desc}</p>
        </div>
        <button
          onClick={() => onNavigate(nextAction.view)}
          className="shrink-0 min-h-12 px-8 py-4 bg-nf-ink text-white font-semibold text-base hover:bg-black transition-colors whitespace-nowrap"
        >
          {nextAction.cta} →
        </button>
      </div>

      {/* 워크플로우 단계 스트립 — 각 단계 클릭 시 해당 화면으로 이동 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-0 border border-nf-border divide-y md:divide-y-0 md:divide-x divide-nf-border bg-white">
        {steps.map((step) => (
          <button
            key={step.n}
            onClick={() => onNavigate(step.view)}
            className="p-6 text-left hover:bg-[#fafafa] transition-colors group"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="w-7 h-7 flex items-center justify-center text-xs font-semibold border border-nf-ink rounded-full text-nf-ink">{step.n}</span>
              <span className="text-[15px] font-semibold text-nf-ink group-hover:text-nf-primary transition-colors">{step.label}</span>
            </div>
            <div className="font-display text-4xl font-semibold leading-none text-nf-ink mb-2">{step.count}<span className="text-[13px] font-sans font-normal text-nf-muted ml-2">{step.unit}</span></div>
            <p className="text-[13px] leading-relaxed text-nf-muted">{step.desc}</p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <div className="border border-nf-border bg-white p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm text-nf-muted uppercase tracking-widest">최근 수집된 소스</h3>
            <button onClick={() => onNavigate('library')} className="text-xs text-nf-ink uppercase tracking-widest font-semibold hover:underline">모두 보기→</button>
          </div>
          <div className="space-y-2">
            {sources.slice(0, 3).map(source => (
              <div key={source.id} className="p-4 border-b border-nf-border bg-white cursor-pointer transition-colors hover:border-nf-ink group" onClick={() => onNavigate('scoring', source.id)}>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                     <span className={`px-2 py-1 text-xs font-semibold uppercase rounded-sm ${
                        source.status === 'Promoted' ? 'bg-[#e6f4ea] text-[#2d6a4f]' :
                        source.status === 'Inbox' ? 'bg-[#eee] text-[#666]' :
                        source.status === 'Scored' ? 'bg-[#e0f2fe] text-[#0369a1]' :
                        'bg-[#f3e8ff] text-[#7e22ce]'
                     }`}>{source.status}</span>
                  </div>
                  <p className="text-base font-semibold text-nf-ink leading-relaxed mb-1 group-hover:text-nf-primary transition-colors">{source.title}</p>
                  <p className="text-[13px] text-nf-muted">{source.type}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border border-nf-border bg-white p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm text-nf-muted uppercase tracking-widest">검토가 필요한 초안</h3>
            <button onClick={() => onNavigate('pipeline')} className="text-xs text-nf-ink uppercase tracking-widest font-semibold hover:underline">파이프라인 가기→</button>
          </div>
          <div className="space-y-2">
            {drafts.filter(d => d.status !== 'Published' && !reviewCurrent(d, proofs)).slice(0, 3).map(draft => {
              const src = sources.find(s => s.id === draft.sourceId);
              return (
                <div key={draft.id} className="p-4 border-b border-nf-border bg-white cursor-pointer transition-colors hover:border-nf-ink group" onClick={() => onNavigate('repurpose', draft.sourceId, draft.id)}>
                  <div className="flex justify-between items-start w-full mb-1">
                    <span className="px-2 py-1 text-xs font-semibold uppercase rounded-sm bg-[#fef3c7] text-[#b45309]">검토 필요</span>
                  </div>
                  <p className="text-base font-semibold text-nf-ink leading-relaxed mb-1 group-hover:text-nf-primary transition-colors">{src?.title || 'Unknown Source'}</p>
                  <p className="text-[13px] text-nf-muted">{draft.platform} · 필요: {draft.proof.type}</p>
                </div>
              )
            })}
            {drafts.filter(d => d.status !== 'Published' && !reviewCurrent(d, proofs)).length === 0 && (
              <p className="text-sm text-nf-muted py-8 text-center font-display">검토가 필요한 초안이 없습니다.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
