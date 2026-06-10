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
        <div className="font-serif text-[2rem] text-ed-muted opacity-40 italic mb-3">파이프라인이 비어 있습니다</div>
        <p className="text-[13px] text-ed-muted leading-relaxed max-w-[340px] mb-6">
          발행 관리는 초안에서 시작합니다. 3단계 제작에서 AI 초안을 생성하고 게이트를 통과시키세요.
        </p>
        <button onClick={() => onNavigate('repurpose')} className="px-6 py-3 bg-ed-ink text-white font-semibold text-[0.85rem] hover:bg-black transition-colors">
          ← 3단계 — 초안 만들러 가기
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] animate-in fade-in slide-in-from-bottom-2 duration-500">
      <header className="h-[70px] border-b border-ed-border flex items-center justify-between -mx-8 px-8 bg-white -mt-8 mb-8 sticky top-0 z-10">
        <div>
          <h2 className="text-[1.2rem] font-bold text-ed-ink tracking-tight">콘텐츠 파이프라인</h2>
        </div>
      </header>

      <div className="flex-1 overflow-x-auto pb-4">
        <div className="flex gap-4 h-full min-w-max">
          {columns.map(col => {
            const columnDrafts = drafts.filter(d => d.status === col.id);
            return (
              <div key={col.id} className="w-[300px] flex flex-col bg-[#fafafa] border border-ed-border rounded-none">
                <div className="p-4 border-b border-ed-border flex justify-between items-center bg-white rounded-none">
                  <span className="text-[11px] font-semibold text-ed-ink uppercase tracking-widest">{col.label}</span>
                  <span className="text-[11px] font-serif font-bold text-ed-muted">{columnDrafts.length}</span>
                </div>
                
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {columnDrafts.map(draft => {
                    const isBlocked = !draft.proof.exists && (draft.status === 'Draft' || draft.status === 'Review');
                    return (
                      <div key={draft.id} className="bg-white p-4 border border-ed-border hover:border-ed-ink transition-colors group relative rounded-none">
                        <div className="flex justify-between items-start mb-3">
                          <span className="text-[10px] font-mono text-ed-muted bg-[#eee] px-2 py-0.5 rounded-sm uppercase">{draft.platform}</span>
                          <select 
                            value={draft.status} 
                            onChange={(e) => handleStatusChange(draft.id, e.target.value as DraftStatus)}
                            className="text-[10px] bg-transparent text-ed-muted hover:text-ed-ink focus:outline-none cursor-pointer outline-none border-none opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-widest"
                          >
                            {columns.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                          </select>
                        </div>
                        
                        <p className="text-[13px] font-semibold text-ed-ink line-clamp-3 mb-2 leading-relaxed" title={draft.content.hook}>{draft.content.hook || '내용 없음'}</p>
                        
                        {isBlocked && (
                          <div className="mt-3 text-[10px] text-[#b45309] bg-[#fef3c7] px-2 py-1 rounded-sm inline-flex font-semibold uppercase tracking-widest">
                            Proof Needed
                          </div>
                        )}
                        
                        <div className="mt-4 pt-3 border-t border-ed-border flex justify-between items-center">
                          <button 
                            onClick={() => onNavigate('repurpose', draft.sourceId)}
                            className="text-[10px] text-ed-ink font-semibold uppercase tracking-widest hover:underline"
                          >
                            스튜디오 &rarr;
                          </button>
                          <span className="text-[9px] text-ed-muted font-mono">{new Date(draft.updatedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    )
                  })}
                  {columnDrafts.length === 0 && (
                    <div className="py-8 text-center text-[12px] text-ed-muted font-serif italic">
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
