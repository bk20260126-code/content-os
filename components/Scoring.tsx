import React, { useState, useEffect } from 'react';
import { Source, SourceScore } from '@/lib/types';
import { ViewState } from '@/app/page';
import { requestAI } from '@/lib/ai-client';

interface AiScoreRec {
  totalScore: number;
  brandVoiceScore: number;
  proofDensityScore: number;
  founderAuthorityScore: number;
  nextAction: string;
  rationale: string;
}

// Single source of truth for next-action rules (shared by manual + AI-applied scoring)
function deriveAction(score: { totalScore: number; brandVoiceScore: number; proofDensityScore: number; founderAuthorityScore: number }): string {
  let action = 'evaluating';
  if (score.brandVoiceScore < 80) action = 'rewrite';
  if (score.proofDensityScore < 8) action = 'hold'; // "Proof needed"
  if (score.founderAuthorityScore < 10) action = 'enrich'; // "Founder take weak"
  if (score.totalScore >= 21 && score.brandVoiceScore >= 80 && score.proofDensityScore >= 8) {
    action = 'promote';
  }
  return action;
}

interface ScoringProps {
  sources: Source[];
  setSources: React.Dispatch<React.SetStateAction<Source[]>>;
  selectedSourceId: string | null;
  onNavigate: (view: ViewState, sourceId?: string) => void;
}

export function Scoring({ sources, setSources, selectedSourceId, onNavigate }: ScoringProps) {
  const [activeId, setActiveId] = useState<string | null>(selectedSourceId || (sources[0]?.id || null));
  const [prevSelectedSourceId, setPrevSelectedSourceId] = useState<string | null>(selectedSourceId);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiRec, setAiRec] = useState<AiScoreRec | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  if (selectedSourceId !== prevSelectedSourceId) {
    setPrevSelectedSourceId(selectedSourceId);
    if (selectedSourceId) {
      setActiveId(selectedSourceId);
    }
  }

  const activeSource = sources.find(s => s.id === activeId);

  if (!activeSource) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <div className="font-serif text-[2rem] text-ed-muted opacity-40 italic mb-3">채점할 소스가 없습니다</div>
        <p className="text-[13px] text-ed-muted leading-relaxed max-w-[320px] mb-6">
          1단계 수집에서 소스를 먼저 등록하세요. 등록된 소스가 이곳에 나타나면 AI 채점을 요청할 수 있습니다.
        </p>
        <button onClick={() => onNavigate('library')} className="px-6 py-3 bg-ed-ink text-white font-semibold text-[0.85rem] hover:bg-black transition-colors">
          ← 1단계 — 소스 추가하러 가기
        </button>
      </div>
    );
  }

  const handleScoreChange = (field: keyof SourceScore, value: number) => {
    const currentScore = activeSource.score || {
      totalScore: 0, brandVoiceScore: 0, proofDensityScore: 0, founderAuthorityScore: 0, nextAction: 'evaluating' as any
    };
    
    const newScore = { ...currentScore, [field]: value };
    newScore.nextAction = deriveAction(newScore) as any;

    setSources(sources.map(s => {
      if (s.id === activeSource.id) return { ...s, score: newScore };
      return s;
    }));
  };

  const handleFieldChange = (field: keyof Source, value: string) => {
    setSources(sources.map(s => s.id === activeSource.id ? { ...s, [field]: value } : s));
  };

  const promoteSource = () => {
    setSources(sources.map(s => s.id === activeSource.id ? { ...s, status: 'Promoted' } : s));
    onNavigate('repurpose', activeSource.id);
  };

  const requestAiScore = async () => {
    setAiLoading(true);
    setAiError(null);
    setAiRec(null);
    try {
      const rec = await requestAI<AiScoreRec>('score', { source: activeSource });
      setAiRec(rec);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'AI 요청 실패');
    } finally {
      setAiLoading(false);
    }
  };

  // Apply AI numbers as a STARTING POINT — human adjusts sliders and confirms promote.
  const applyAiRec = () => {
    if (!aiRec) return;
    const newScore: SourceScore = {
      totalScore: Math.min(30, Math.max(0, Math.round(aiRec.totalScore))),
      brandVoiceScore: Math.min(100, Math.max(0, Math.round(aiRec.brandVoiceScore))),
      proofDensityScore: Math.min(15, Math.max(0, Math.round(aiRec.proofDensityScore))),
      founderAuthorityScore: Math.min(15, Math.max(0, Math.round(aiRec.founderAuthorityScore))),
      nextAction: 'evaluating' as any,
    };
    newScore.nextAction = deriveAction(newScore) as any;
    setSources(sources.map(s => s.id === activeSource.id ? { ...s, score: newScore } : s));
    setAiRec(null);
  };

  const s = activeSource;
  const sc = s.score;

  return (
    <div className="flex gap-0 h-[calc(100vh-6rem)] animate-in fade-in slide-in-from-bottom-2 duration-500 -mt-8 -mx-8 relative -top-8 h-[calc(100vh)]">
      {/* Left List */}
      <div className="w-[320px] bg-[#fafafa] border-r border-ed-border flex flex-col overflow-hidden h-[100vh] pt-8">
        <div className="px-6 mb-4">
          <h3 className="text-[10px] text-ed-muted uppercase tracking-widest">최근 수집된 소스</h3>
        </div>
        <div className="flex-1 overflow-y-auto px-4 space-y-2 pb-8">
          {sources.filter(src => src.status !== 'Archived').map(src => (
            <div 
              key={src.id}
              onClick={() => setActiveId(src.id)}
              className={`p-4 bg-white cursor-pointer transition-colors border-b border-ed-border hover:border-ed-ink group ${activeId === src.id ? 'border-ed-ink' : 'border-transparent'}`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className={`px-2 py-0.5 text-[11px] font-semibold uppercase rounded-sm ${src.status === 'Promoted' ? 'bg-[#e6f4ea] text-[#2d6a4f]' : 'bg-[#eee] text-[#666]'}`}>{src.status}</span>
              </div>
              <p className="text-[14px] font-semibold text-ed-ink leading-[1.4] mb-1 group-hover:text-ed-accent transition-colors">{src.title}</p>
              <p className="text-[11px] text-ed-muted">{src.type}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right Details */}
      <div className="flex-1 flex flex-col bg-white overflow-y-auto h-[100vh] pt-8 p-12">
        <div className="mb-8">
          <h2 className="font-serif text-3xl font-semibold mb-2">{s.title}</h2>
          <p className="text-[14px] text-ed-muted">{s.type} • <a href={s.url} target="_blank" rel="noreferrer" className="text-ed-ink hover:underline border-b border-ed-muted pb-[1px]">{s.url || 'URL 없음'}</a></p>
        </div>
        
        <div className="flex gap-4 border-y border-ed-border py-6 mb-8">
            <div className="flex-1">
              <div className="text-[10px] text-ed-muted uppercase tracking-widest mb-1">총점</div>
              <div className="font-serif text-[1.5rem] font-semibold">{sc?.totalScore || 0} <span className="text-[12px] font-sans font-normal opacity-50">/ 30</span></div>
            </div>
            <div className="flex-1">
              <div className="text-[10px] text-ed-muted uppercase tracking-widest mb-1">브랜드 보이스</div>
              <div className="font-serif text-[1.5rem] font-semibold">{sc?.brandVoiceScore || 0}%</div>
            </div>
            <div className="flex-1">
              <div className="text-[10px] text-ed-muted uppercase tracking-widest mb-1">증명 밀도</div>
              <div className="font-serif text-[1.5rem] font-semibold">{sc?.proofDensityScore || 0} <span className="text-[12px] font-sans font-normal opacity-50">/ 15</span></div>
            </div>
            <div className="flex-1">
              <div className="text-[10px] text-ed-muted uppercase tracking-widest mb-1">창업자 권위</div>
              <div className="font-serif text-[1.5rem] font-semibold">{sc?.founderAuthorityScore || 0} <span className="text-[12px] font-sans font-normal opacity-50">/ 15</span></div>
            </div>
            <div className="flex-1 text-right">
              <div className="text-[10px] text-ed-muted uppercase tracking-widest mb-1">상태</div>
              <div className={`font-bold text-[1.1rem] mt-1 ${sc?.nextAction === 'promote' ? 'text-[#2D6A4F]' : sc?.nextAction === 'rewrite' ? 'text-[#E55C25]' : 'text-ed-ink'}`}>
                {sc?.nextAction === 'promote' ? '승인 가능 (Promotable)' : sc?.nextAction?.toUpperCase()}
              </div>
            </div>
        </div>
        
        <div className="space-y-8 max-w-3xl">
          <div>
            <h4 className="text-[10px] text-ed-muted uppercase tracking-widest border-b border-ed-border pb-1 mb-2">Raw Notes</h4>
            <p className="text-[14px] leading-relaxed text-ed-ink bg-[#fafafa] p-4 whitespace-pre-wrap rounded-none">{s.rawNotes}</p>
          </div>

          <div className="grid grid-cols-2 gap-8">
            <div>
              <label className="block text-[10px] text-ed-muted uppercase tracking-widest mb-1">Pain Point (고객 문제)</label>
              <input value={s.painPoint} onChange={e => handleFieldChange('painPoint', e.target.value)} className="w-full text-sm border-b border-ed-border pb-1 focus:outline-none focus:border-ed-ink text-ed-ink" placeholder="입력하세요..." />
            </div>
            <div>
              <label className="block text-[10px] text-ed-muted uppercase tracking-widest mb-1">Audience Signal (청중 반응)</label>
              <input value={s.audienceSignal} onChange={e => handleFieldChange('audienceSignal', e.target.value)} className="w-full text-sm border-b border-ed-border pb-1 focus:outline-none focus:border-ed-ink text-ed-ink" placeholder="입력하세요..." />
            </div>
            <div>
              <label className="block text-[10px] text-ed-muted uppercase tracking-widest mb-1">Offer Angle (제안 앵글)</label>
              <input value={s.offerAngle} onChange={e => handleFieldChange('offerAngle', e.target.value)} className="w-full text-sm border-b border-ed-border pb-1 focus:outline-none focus:border-ed-ink text-ed-ink" placeholder="입력하세요..." />
            </div>
            <div>
              <label className="block text-[10px] text-ed-muted uppercase tracking-widest mb-1">Proof Needed (필요 증명 자료)</label>
              <input value={s.proofNeeded} onChange={e => handleFieldChange('proofNeeded', e.target.value)} className="w-full text-sm border-b border-ed-border pb-1 focus:outline-none focus:border-ed-ink text-ed-ink" placeholder="입력하세요..." />
            </div>
          </div>

          {/* AI 채점 추천 — 추천일 뿐, 확정은 사람 */}
          <div className="border border-ed-border p-6">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-[10px] text-ed-muted uppercase tracking-widest">AI 채점 추천</h4>
              <button
                onClick={requestAiScore}
                disabled={aiLoading}
                className="px-4 py-2 bg-ed-ink text-white text-[0.8rem] font-semibold rounded-none hover:bg-black transition-colors disabled:bg-ed-border disabled:text-ed-muted disabled:cursor-wait"
              >
                {aiLoading ? '분석 중…' : 'AI 채점 요청'}
              </button>
            </div>
            <p className="text-[11px] text-ed-muted mb-4">AI는 추천만 합니다. 적용 후에도 슬라이더로 수정하고 직접 승급을 확정하세요.</p>
            {aiError && <p className="text-[12px] text-ed-accent">{aiError}</p>}
            {aiRec && (
              <div className="bg-[#fafafa] border border-ed-border p-4 space-y-3">
                <div className="flex gap-6 text-[13px]">
                  <span>총점 <strong className="font-serif">{aiRec.totalScore}</strong>/30</span>
                  <span>보이스 <strong className="font-serif">{aiRec.brandVoiceScore}</strong>%</span>
                  <span>증명 <strong className="font-serif">{aiRec.proofDensityScore}</strong>/15</span>
                  <span>권위 <strong className="font-serif">{aiRec.founderAuthorityScore}</strong>/15</span>
                </div>
                <p className="text-[12px] leading-relaxed text-ed-ink">{aiRec.rationale}</p>
                <div className="flex gap-2 pt-1">
                  <button onClick={applyAiRec} className="px-4 py-2 bg-ed-ink text-white text-[0.8rem] font-semibold hover:bg-black transition-colors">추천 적용 (수정 가능)</button>
                  <button onClick={() => setAiRec(null)} className="px-4 py-2 border border-ed-border text-ed-muted text-[0.8rem] font-semibold hover:text-ed-ink transition-colors">무시</button>
                </div>
              </div>
            )}
          </div>

          <div className="bg-[#fafafa] p-6 border border-ed-border">
            <h4 className="text-[10px] text-ed-muted uppercase tracking-widest mb-6">수동 평가 패널</h4>
            <div className="grid grid-cols-2 gap-x-8 gap-y-6">
              <div>
                <label className="flex justify-between text-[11px] font-semibold text-ed-ink mb-1">
                  <span>총점 (Overall Fit) <span className="font-normal text-ed-muted">0-30</span></span>
                  <span className="font-serif">{sc?.totalScore || 0}</span>
                </label>
                <input type="range" min="0" max="30" value={sc?.totalScore || 0} onChange={e => handleScoreChange('totalScore', parseInt(e.target.value))} className="w-full accent-ed-ink" />
              </div>
              <div>
                <label className="flex justify-between text-[11px] font-semibold text-ed-ink mb-1">
                  <span>브랜드 보이스 <span className="font-normal text-ed-muted">0-100</span></span>
                  <span className="font-serif">{sc?.brandVoiceScore || 0}</span>
                </label>
                <input type="range" min="0" max="100" value={sc?.brandVoiceScore || 0} onChange={e => handleScoreChange('brandVoiceScore', parseInt(e.target.value))} className="w-full accent-ed-ink" />
              </div>
              <div>
                <label className="flex justify-between text-[11px] font-semibold text-ed-ink mb-1">
                  <span>파운더 권위 <span className="font-normal text-ed-muted">0-15</span></span>
                  <span className="font-serif">{sc?.founderAuthorityScore || 0}</span>
                </label>
                <input type="range" min="0" max="15" value={sc?.founderAuthorityScore || 0} onChange={e => handleScoreChange('founderAuthorityScore', parseInt(e.target.value))} className="w-full accent-ed-ink" />
              </div>
              <div>
                <label className="flex justify-between text-[11px] font-semibold text-ed-ink mb-1">
                  <span>증명 밀도 <span className="font-normal text-ed-muted">0-15</span></span>
                  <span className="font-serif">{sc?.proofDensityScore || 0}</span>
                </label>
                <input type="range" min="0" max="15" value={sc?.proofDensityScore || 0} onChange={e => handleScoreChange('proofDensityScore', parseInt(e.target.value))} className="w-full accent-ed-ink" />
              </div>
            </div>
            
            <div className="mt-8 pt-6 border-t border-ed-border">
              {sc?.nextAction === 'promote' ? (
                <button onClick={promoteSource} className="px-6 py-3 bg-ed-ink text-white font-semibold text-[0.85rem] border-none rounded-none hover:bg-black transition-colors w-full">
                  리퍼포즈 스튜디오로 승급하기 (Promote)
                </button>
              ) : (
                <button disabled className="px-6 py-3 bg-ed-border text-ed-muted font-semibold text-[0.85rem] border-none rounded-none cursor-not-allowed w-full">
                  조건 미달 (승급 불가)
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
