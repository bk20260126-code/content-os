import React, { useState, useEffect } from 'react';
import { Source, Draft, Platform, DraftStatus, GateResult, ProofAsset } from '@/lib/types';
import { ViewState } from '@/app/page';
import { requestAI } from '@/lib/ai-client';
import { ProofAttach } from '@/components/ProofAttach';

interface AiDraftRec {
  hook: string;
  mainPoint: string;
  proofArtifactNeeded: string;
  cta: string;
}

interface AiGateRec {
  founderAuthority: boolean;
  businessTension: boolean;
  categoryOwnership: boolean;
  proofDensity: boolean;
  specificity: boolean;
  antiGenericness: boolean;
  conversionIntent: boolean;
  result: string;
  rationale: string;
}

// Single source of truth for gate result rules (manual toggle + AI-applied share this)
//
// Proof density is deliberately NOT read from the checklist here. It used to be,
// and because `proofDensity` has no checkbox in the UI, the gate could never reach
// 'Ready for review' by hand — only an AI evaluation could set it. Now that a draft
// carries a real ProofAsset link, the attached artifact answers the question the
// checkbox was asking, so `proofExists` is the honest single condition.
function deriveGateResult(gate: Omit<Draft['brandVoiceGate'], 'result'>, proofExists: boolean): GateResult {
  if (!gate.antiGenericness) return 'Too generic';
  if (!gate.founderAuthority) return 'Needs stronger founder take';
  if (!proofExists) return 'Needs proof';
  return 'Ready for review';
}

interface RepurposeStudioProps {
  sources: Source[];
  drafts: Draft[];
  setDrafts: React.Dispatch<React.SetStateAction<Draft[]>>;
  proofs: ProofAsset[];
  setProofs: React.Dispatch<React.SetStateAction<ProofAsset[]>>;
  selectedSourceId: string | null;
  onNavigate: (view: ViewState, sourceId?: string) => void;
}

const platforms: Platform[] = ['LinkedIn', 'Instagram', 'Threads', 'X', 'YouTube Shorts'];

export function RepurposeStudio({ sources, drafts, setDrafts, proofs, setProofs, selectedSourceId, onNavigate }: RepurposeStudioProps) {
  const promotedSources = sources.filter(s => s.status === 'Promoted' || s.status === 'Drafted');
  
  const [activeSourceId, setActiveSourceId] = useState<string | null>(
    selectedSourceId && promotedSources.find(s => s.id === selectedSourceId) ? selectedSourceId : (promotedSources[0]?.id || null)
  );
  const [prevSelectedSourceId, setPrevSelectedSourceId] = useState<string | null>(selectedSourceId);
  const [activePlatform, setActivePlatform] = useState<Platform>('LinkedIn');
  
  if (selectedSourceId !== prevSelectedSourceId) {
    setPrevSelectedSourceId(selectedSourceId);
    if (selectedSourceId && promotedSources.find(s => s.id === selectedSourceId)) {
      setActiveSourceId(selectedSourceId);
    }
  }

  const activeSource = sources.find(s => s.id === activeSourceId);
  const activeDraft = drafts.find(d => d.sourceId === activeSourceId && d.platform === activePlatform);

  const [draftLoading, setDraftLoading] = useState(false);
  const [gateLoading, setGateLoading] = useState(false);
  const [gateRec, setGateRec] = useState<AiGateRec | null>(null);
  const [aiNotice, setAiNotice] = useState<string | null>(null);

  const buildDraft = (content: Draft['content']): Draft => ({
    id: `d_${Date.now()}`,
    sourceId: activeSource!.id,
    platform: activePlatform,
    status: 'Draft',
    content,
    proof: {
      type: 'screenshot',
      exists: false,
      description: ''
    },
    brandVoiceGate: {
      founderAuthority: false,
      businessTension: false,
      categoryOwnership: false,
      proofDensity: false,
      specificity: false,
      antiGenericness: false,
      conversionIntent: false,
      result: 'Too generic' // gate starts closed — must be evaluated, never pre-passed
    },
    updatedAt: new Date().toISOString()
  });

  const handleGenerateDraft = async () => {
    if (!activeSource || draftLoading) return;
    setDraftLoading(true);
    setAiNotice(null);
    try {
      // Real AI draft via /api/ai
      const rec = await requestAI<AiDraftRec>('draft', { source: activeSource, platform: activePlatform });
      setDrafts([...drafts, buildDraft({
        hook: rec.hook || '',
        mainPoint: rec.mainPoint || '',
        proofArtifactNeeded: rec.proofArtifactNeeded || activeSource.proofNeeded || '',
        cta: rec.cta || ''
      })]);
    } catch (e) {
      // Fallback: template stub so the workflow never blocks (manual mode)
      setAiNotice(`AI 생성 실패 — 템플릿 초안으로 대체했습니다. (${e instanceof Error ? e.message : '오류'})`);
      setDrafts([...drafts, buildDraft({
        hook: `[Hook for ${activePlatform}] ${activeSource.title}`,
        mainPoint: activeSource.offerAngle || 'Missing offer angle',
        proofArtifactNeeded: activeSource.proofNeeded || 'Missing proof requirement',
        cta: 'Leave a comment below!'
      })]);
    } finally {
      setDraftLoading(false);
    }
  };

  const requestGateEval = async () => {
    if (!activeDraft || gateLoading) return;
    setGateLoading(true);
    setAiNotice(null);
    setGateRec(null);
    try {
      const rec = await requestAI<AiGateRec>('gate', { draft: activeDraft });
      setGateRec(rec);
    } catch (e) {
      setAiNotice(e instanceof Error ? e.message : 'AI 게이트 평가 실패');
    } finally {
      setGateLoading(false);
    }
  };

  // Apply AI gate booleans as a starting point — human can still toggle each checkbox.
  const applyGateRec = () => {
    if (!activeDraft || !gateRec) return;
    const newGate = {
      founderAuthority: !!gateRec.founderAuthority,
      businessTension: !!gateRec.businessTension,
      categoryOwnership: !!gateRec.categoryOwnership,
      proofDensity: !!gateRec.proofDensity,
      specificity: !!gateRec.specificity,
      antiGenericness: !!gateRec.antiGenericness,
      conversionIntent: !!gateRec.conversionIntent,
    };
    const result = deriveGateResult(newGate, activeDraft.proof.exists);
    setDrafts(drafts.map(d => d.id === activeDraft.id ? { ...d, brandVoiceGate: { ...newGate, result } } : d));
    setGateRec(null);
  };

  const updateDraftField = (field: keyof Draft['content'], value: string) => {
    if (!activeDraft) return;
    setDrafts(drafts.map(d => d.id === activeDraft.id ? { ...d, content: { ...d.content, [field]: value } } : d));
  };
  
  const toggleGate = (field: keyof Draft['brandVoiceGate']) => {
    if (!activeDraft) return;
    const gate = activeDraft.brandVoiceGate;
    const newGate = { ...gate, [field]: !gate[field as keyof typeof gate] };
    newGate.result = deriveGateResult(newGate, activeDraft.proof.exists);
    setDrafts(drafts.map(d => d.id === activeDraft.id ? { ...d, brandVoiceGate: newGate as any } : d));
  };

  const registerProof = (proof: ProofAsset) => setProofs(prev => [proof, ...prev]);

  /**
   * Attaching evidence is the only way proof.exists becomes true.
   * A proof registered this turn is not in `proofs` yet (state updates are async),
   * so the caller passes it through `justRegistered`.
   */
  const attachProof = (proofId: string, justRegistered?: ProofAsset) => {
    if (!activeDraft) return;
    const attached = justRegistered ?? proofs.find(p => p.id === proofId);
    if (!attached) return;
    setDrafts(drafts.map(d => {
      if (d.id !== activeDraft.id) return d;
      const nextProof = {
        ...d.proof,
        proofId,
        exists: true,
        type: attached.type,
        description: attached.description,
      };
      const nextGate = { ...d.brandVoiceGate, proofDensity: true };
      return {
        ...d,
        proof: nextProof,
        brandVoiceGate: { ...nextGate, result: deriveGateResult(nextGate, true) },
      };
    }));
  };

  const detachProof = () => {
    if (!activeDraft) return;
    setDrafts(drafts.map(d => {
      if (d.id !== activeDraft.id) return d;
      const nextProof = { ...d.proof, proofId: undefined, exists: false };
      const nextGate = { ...d.brandVoiceGate, proofDensity: false };
      return { ...d, proof: nextProof, brandVoiceGate: { ...nextGate, result: deriveGateResult(nextGate, false) } };
    }));
  };

  const moveToReview = () => {
    if (!activeDraft) return;
    setDrafts(drafts.map(d => d.id === activeDraft.id ? { ...d, status: 'Review' } : d));
    onNavigate('pipeline');
  };

  if (!activeSource) {
    return (
      <div className="workspace-readable flex flex-col items-center justify-center h-[60vh] text-center">
        <div className="font-display text-[2rem] text-nf-muted opacity-40 mb-3">승급된 소스가 없습니다</div>
        <p className="text-[13px] text-nf-muted leading-relaxed max-w-md mb-6">
          제작은 승급된 소스에서 시작합니다. 2단계 채점에서 소스를 평가하고 기준을 충족하면 승급하세요.
        </p>
        <button onClick={() => onNavigate('scoring')} className="px-6 py-3 bg-nf-ink text-white font-semibold text-[0.85rem] hover:bg-black transition-colors">
          ← 2단계 — 채점하러 가기
        </button>
      </div>
    );
  }

  return (
    <div className="workspace-readable flex gap-0 h-[calc(100vh-6rem)] animate-in fade-in slide-in-from-bottom-2 duration-500 -mt-8 -mx-8 xl:-mt-10 xl:-mx-10 relative -top-8 xl:-top-10 h-[calc(100vh)]">
      <div className="w-[360px] bg-[#fafafa] border-r border-nf-border flex flex-col pt-8">
        <div className="px-6 mb-4">
          <h3 className="text-[10px] text-nf-muted uppercase tracking-widest">승급된 소스 분석 대상</h3>
        </div>
        <div className="flex-1 overflow-y-auto px-4 space-y-2 pb-8">
            {promotedSources.map(src => (
              <div 
                key={src.id}
                onClick={() => setActiveSourceId(src.id)}
                className={`p-4 bg-white cursor-pointer transition-colors border-b border-nf-border hover:border-nf-ink group ${activeSourceId === src.id ? 'border-nf-ink' : 'border-transparent'}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className={`px-2 py-0.5 text-[11px] font-semibold uppercase rounded-sm bg-[#e6f4ea] text-[#2d6a4f]`}>{src.status}</span>
                </div>
                <p className="text-[14px] font-semibold text-nf-ink leading-[1.4] mb-1 group-hover:text-nf-primary transition-colors">{src.title}</p>
                <p className="text-[11px] text-nf-muted">{src.type}</p>
              </div>
            ))}
        </div>
        
        {activeSourceId && (
          <div className="border-t border-nf-border bg-white p-6">
            <h4 className="text-[10px] text-nf-muted uppercase tracking-widest mb-3 border-b border-nf-border pb-2">Target Platform</h4>
            <div className="flex flex-col gap-1">
              {platforms.map(p => {
                const hasDraft = drafts.some(d => d.sourceId === activeSourceId && d.platform === p);
                return (
                  <button
                    key={p}
                    onClick={() => setActivePlatform(p)}
                    className={`text-left px-3 py-2 rounded text-sm flex justify-between items-center transition-colors ${activePlatform === p ? 'bg-nf-ink text-white font-medium' : 'text-nf-ink hover:bg-gray-100'}`}
                  >
                    <span className="text-[13px]">{p}</span>
                    {hasDraft && <span className={`w-2 h-2 rounded-full ${activePlatform === p ? 'bg-white/50' : 'bg-nf-ink'}`} />}
                  </button>
                )
              })}
            </div>
            
            <div className="mt-6 pt-4 border-t border-nf-border">
              <h4 className="text-[10px] text-nf-muted uppercase tracking-widest mb-2">Source Context</h4>
              <p className="text-[11px] text-nf-muted mb-1"><strong className="text-nf-ink font-semibold">Angle:</strong> {activeSource.offerAngle}</p>
              <p className="text-[11px] text-nf-muted"><strong className="text-nf-ink font-semibold">Proof needed:</strong> {activeSource.proofNeeded}</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col h-full bg-white">
        <header className="px-12 py-6 border-b border-nf-border flex justify-between items-center bg-white h-[85px] shrink-0">
          <div>
            <h2 className="font-display text-[1.8rem] font-bold text-nf-ink flex items-center gap-4">
              {activePlatform}
              {activeDraft && <span className={`text-[10px] font-sans px-3 py-1 uppercase tracking-widest ${activeDraft.status === 'Draft' ? 'bg-[#e0f2fe] text-[#0369a1]' : 'bg-[#f3e8ff] text-[#7e22ce]'}`}>{activeDraft.status}</span>}
            </h2>
          </div>
          {!activeDraft && (
            <button onClick={handleGenerateDraft} disabled={draftLoading} className="px-6 py-2 bg-nf-ink text-white font-semibold text-[0.85rem] border-none rounded-none hover:bg-black transition-colors shrink-0 whitespace-nowrap disabled:bg-nf-border disabled:text-nf-muted disabled:cursor-wait">
              {draftLoading ? 'AI 생성 중…' : 'AI 초안 생성'}
            </button>
          )}
        </header>

        {activeDraft ? (
          <div className="flex-1 overflow-y-auto flex">
            <div className="w-2/3 p-12 xl:p-14 border-r border-nf-border space-y-8">
              <div>
                <label className="block text-[10px] text-nf-muted uppercase tracking-widest mb-2 border-b border-nf-border pb-1">Hook (도입부)</label>
                <textarea rows={2} value={activeDraft.content.hook} onChange={e => updateDraftField('hook', e.target.value)} className="w-full border-none p-0 text-[14px] focus:outline-none bg-transparent hover:bg-[#fafafa] transition-colors resize-none leading-relaxed text-nf-ink" />
              </div>
              <div>
                <label className="block text-[10px] text-nf-muted uppercase tracking-widest mb-2 border-b border-nf-border pb-1">Main Point (본문)</label>
                <textarea rows={12} value={activeDraft.content.mainPoint} onChange={e => updateDraftField('mainPoint', e.target.value)} className="w-full border-none p-0 text-[14px] focus:outline-none bg-transparent hover:bg-[#fafafa] transition-colors resize-none leading-relaxed text-nf-ink" />
              </div>
              <div>
                <label className="block text-[10px] text-nf-muted uppercase tracking-widest mb-2 border-b border-nf-border pb-1">Call to Action (행동 유도)</label>
                <input value={activeDraft.content.cta} onChange={e => updateDraftField('cta', e.target.value)} className="w-full border-none p-0 text-[14px] focus:outline-none bg-transparent hover:bg-[#fafafa] transition-colors text-nf-ink py-2" />
              </div>
              <ProofAttach
                draft={activeDraft}
                proofs={proofs}
                onRegister={registerProof}
                onAttach={attachProof}
                onDetach={detachProof}
              />
            </div>
            
            <div className="w-1/3 bg-[#fafafa] p-8 flex flex-col overflow-y-auto">
              <h3 className="text-[10px] text-nf-muted uppercase tracking-widest mb-4">Brand Voice Gate</h3>
              <p className="text-[13px] text-nf-ink mb-6 leading-relaxed font-display border-b border-nf-border pb-6">&quot;이 글이 흔한 AI의 글처럼 보이지 않도록, 브랜드의 실제 경험과 관점이 담겼는지 체크하세요.&quot;</p>

              {/* AI 게이트 평가 — 추천일 뿐, 확정은 사람 */}
              <div className="mb-6">
                <button
                  onClick={requestGateEval}
                  disabled={gateLoading}
                  className="w-full py-2 border border-nf-ink text-nf-ink text-[11px] font-semibold uppercase tracking-widest hover:bg-nf-ink hover:text-white transition-colors disabled:border-nf-border disabled:text-nf-muted disabled:cursor-wait"
                >
                  {gateLoading ? 'AI 평가 중…' : 'AI 게이트 평가 요청'}
                </button>
                {aiNotice && <p className="text-[11px] text-nf-primary mt-2 leading-snug">{aiNotice}</p>}
                {gateRec && (
                  <div className="mt-3 bg-white border border-nf-border p-4 space-y-2">
                    <p className="text-[11px] font-semibold text-nf-ink">AI 추천: {gateRec.result}</p>
                    <p className="text-[11px] text-nf-muted leading-snug">{gateRec.rationale}</p>
                    <div className="flex gap-2 pt-1">
                      <button onClick={applyGateRec} className="px-3 py-1.5 bg-nf-ink text-white text-[10px] font-semibold uppercase tracking-widest hover:bg-black transition-colors">적용 (수정 가능)</button>
                      <button onClick={() => setGateRec(null)} className="px-3 py-1.5 border border-nf-border text-nf-muted text-[10px] font-semibold uppercase tracking-widest hover:text-nf-ink transition-colors">무시</button>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="space-y-4 mb-8 flex-1">
                {[
                  { key: 'founderAuthority', label: '파운더의 실제 경험/권위가 들어갔는가?' },
                  { key: 'businessTension', label: '비즈니스 텐션(갈등/해소가 명확)이 있는가?' },
                  { key: 'categoryOwnership', label: '우리만 할 수 있는 이야기인가?' },
                  { key: 'specificity', label: '구체적인 숫자나 고유 명사가 있는가?' },
                  { key: 'antiGenericness', label: '흔한 자기계발 봇이 쓸 수 없는 내용인가?' },
                ].map(item => (
                  <label key={item.key} className="flex items-start gap-3 p-2 hover:bg-[#eee] transition-colors cursor-pointer group rounded-sm">
                    <input 
                      type="checkbox" 
                      checked={activeDraft.brandVoiceGate[item.key as keyof Draft['brandVoiceGate']] as boolean}
                      onChange={() => toggleGate(item.key as keyof Draft['brandVoiceGate'])}
                      className="mt-[3px] accent-nf-ink w-3 h-3"
                    />
                    <span className={`text-[12px] leading-snug ${activeDraft.brandVoiceGate[item.key as keyof Draft['brandVoiceGate']] ? 'text-nf-ink font-semibold' : 'text-nf-muted group-hover:text-nf-ink'}`}>{item.label}</span>
                  </label>
                ))}
              </div>
              
              <div className={`p-6 border text-center bg-white ${
                activeDraft.brandVoiceGate.result === 'Ready for review' ? 'border-[#2d6a4f]' :
                activeDraft.brandVoiceGate.result.includes('proof') ? 'border-[#b45309]' :
                'border-[#e55c25]'
              }`}>
                <p className="text-[10px] text-nf-muted uppercase tracking-widest mb-2">Gate Status</p>
                <p className={`font-display text-[18px] font-semibold tracking-tight ${
                  activeDraft.brandVoiceGate.result === 'Ready for review' ? 'text-[#2d6a4f]' :
                  activeDraft.brandVoiceGate.result.includes('proof') ? 'text-[#b45309]' :
                  'text-[#e55c25]'
                }`}>
                  {activeDraft.brandVoiceGate.result}
                </p>
                
                <button 
                  onClick={moveToReview}
                  disabled={activeDraft.brandVoiceGate.result !== 'Ready for review'}
                  className={`mt-6 w-full py-3 text-[11px] font-semibold uppercase tracking-widest border transition-all ${
                    activeDraft.brandVoiceGate.result === 'Ready for review' 
                      ? 'bg-nf-ink text-white border-nf-ink hover:bg-black' 
                      : 'bg-transparent text-nf-muted border-nf-border cursor-not-allowed'
                  }`}
                >
                  리뷰 파이프라인으로 이동
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-[#fafafa]">
             <div className="font-display text-[2.5rem] text-nf-muted opacity-30 mb-4">No Draft Yet</div>
             <p className="text-[13px] text-nf-muted leading-relaxed max-w-[280px]">상단의 &quot;AI 초안 생성&quot;을 클릭하면 소스 데이터를 바탕으로 AI가 초안을 작성합니다. (키 미설정 시 템플릿 모드)</p>
          </div>
        )}
      </div>
    </div>
  );
}
