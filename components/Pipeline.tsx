import React from 'react';
import { Draft, DraftStatus } from '@/lib/types';
import { ViewState } from '@/app/page';

interface PipelineProps {
  drafts: Draft[];
  setDrafts: React.Dispatch<React.SetStateAction<Draft[]>>;
  onNavigate: (view: ViewState, sourceId?: string) => void;
}

const columns: { id: DraftStatus; label: string; color: string }[] = [
  { id: 'Idea', label: '아이디어', color: 'bg-gray-100 text-gray-800' },
  { id: 'Draft', label: '초안 작성 중', color: 'bg-blue-100 text-blue-800' },
  { id: 'Review', label: '리뷰 대기', color: 'bg-purple-100 text-purple-800' },
  { id: 'Scheduled', label: '발행 예정', color: 'bg-amber-100 text-amber-800' },
  { id: 'Published', label: '발행 완료', color: 'bg-emerald-100 text-emerald-800' },
];

export function Pipeline({ drafts, setDrafts, onNavigate }: PipelineProps) {
  
  const handleStatusChange = (draftId: string, newStatus: DraftStatus) => {
    setDrafts(drafts.map(d => d.id === draftId ? { ...d, status: newStatus } : d));
  };

  if (drafts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <div className="font-display text-[2rem] text-nf-muted opacity-40 mb-3">파이프라인이 비어 있습니다</div>
        <p className="text-base text-nf-muted leading-relaxed max-w-md mb-6">
          발행 관리는 초안에서 시작합니다. 3단계 제작에서 AI 초안을 생성하고 게이트를 통과시키세요.
        </p>
        <button onClick={() => onNavigate('repurpose')} className="min-h-11 px-6 py-3 bg-nf-ink text-white font-semibold text-[15px] hover:bg-black transition-colors">
          ← 3단계 — 초안 만들러 가기
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] animate-in fade-in slide-in-from-bottom-2 duration-500">
      <header className="h-[78px] border-b border-nf-border flex items-center justify-between -mx-8 px-8 xl:-mx-10 xl:px-10 bg-white -mt-8 xl:-mt-10 mb-8 sticky top-0 z-10">
        <div>
          <h2 className="text-2xl font-bold text-nf-ink tracking-tight">콘텐츠 파이프라인</h2>
        </div>
      </header>

      <div className="flex-1 overflow-x-auto pb-4">
        <div className="flex gap-4 h-full min-w-max">
          {columns.map(col => {
            const columnDrafts = drafts.filter(d => d.status === col.id);
            return (
              <div key={col.id} className="w-[300px] flex flex-col bg-[#fafafa] border border-nf-border rounded-none">
                <div className="p-4 border-b border-nf-border flex justify-between items-center bg-white rounded-none">
                  <span className="text-[13px] font-semibold text-nf-ink uppercase tracking-widest">{col.label}</span>
                  <span className="text-[13px] font-display font-bold text-nf-muted">{columnDrafts.length}</span>
                </div>
                
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {columnDrafts.map(draft => {
                    const isBlocked = !draft.proof.exists && (draft.status === 'Draft' || draft.status === 'Review');
                    return (
                      <div key={draft.id} className="bg-white p-4 border border-nf-border hover:border-nf-ink transition-colors group relative rounded-none">
                        <div className="flex justify-between items-start mb-3">
                          <span className="text-xs font-mono text-nf-muted bg-[#eee] px-2 py-1 rounded-sm uppercase">{draft.platform}</span>
                          <select 
                            value={draft.status} 
                            onChange={(e) => handleStatusChange(draft.id, e.target.value as DraftStatus)}
                            className="text-xs bg-transparent text-nf-muted hover:text-nf-ink focus:outline-none cursor-pointer outline-none border-none opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-widest"
                          >
                            {columns.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                          </select>
                        </div>
                        
                        <p className="text-[15px] font-semibold text-nf-ink line-clamp-3 mb-2 leading-relaxed" title={draft.content.hook}>{draft.content.hook || '내용 없음'}</p>
                        
                        {isBlocked && (
                          <div className="mt-3 text-xs text-[#b45309] bg-[#fef3c7] px-2 py-1 rounded-sm inline-flex font-semibold uppercase tracking-widest">
                            Proof Needed
                          </div>
                        )}
                        
                        <div className="mt-4 pt-3 border-t border-nf-border flex justify-between items-center">
                          <button 
                            onClick={() => onNavigate('repurpose', draft.sourceId)}
                            className="text-xs text-nf-ink font-semibold uppercase tracking-widest hover:underline"
                          >
                            스튜디오 &rarr;
                          </button>
                          <span className="text-[11px] text-nf-muted font-mono">{new Date(draft.updatedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    )
                  })}
                  {columnDrafts.length === 0 && (
                    <div className="py-8 text-center text-sm text-nf-muted font-display">
                      Empty
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  );
}
