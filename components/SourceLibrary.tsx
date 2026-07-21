import React, { useState } from 'react';
import { Source, SourceType, SourceStatus } from '@/lib/types';
import { ViewState } from '@/app/page';

interface SourceLibraryProps {
  sources: Source[];
  setSources: React.Dispatch<React.SetStateAction<Source[]>>;
  onNavigate: (view: ViewState, sourceId?: string) => void;
}

export function SourceLibrary({ sources, setSources, onNavigate }: SourceLibraryProps) {
  const [isAdding, setIsAdding] = useState(false);
  
  // New source form state
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [type, setType] = useState<SourceType>('YouTube');
  const [rawNotes, setRawNotes] = useState('');

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    
    const newSource: Source = {
      id: `s_new_${Date.now()}`,
      title,
      url,
      type,
      rawNotes,
      topicCluster: '',
      painPoint: '',
      audienceSignal: '',
      businessRelevance: '',
      proofNeeded: '',
      salesTrigger: '',
      offerAngle: '',
      status: 'Inbox',
      createdAt: new Date().toISOString()
    };

    setSources([newSource, ...sources]);
    setIsAdding(false);
    setTitle('');
    setUrl('');
    setRawNotes('');
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <header className="h-[78px] border-b border-ed-border flex items-center justify-between -mx-8 px-8 xl:-mx-10 xl:px-10 bg-white -mt-8 xl:-mt-10 mb-8 sticky top-0 z-10">
        <div>
          <h2 className="text-2xl font-bold text-ed-ink tracking-tight">소스 라이브러리</h2>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className="min-h-11 px-5 py-2.5 bg-ed-ink text-white font-semibold text-[15px] border-none rounded-none hover:bg-black transition-colors"
          >
            {isAdding ? '취소' : '+ 소스 추가'}
          </button>
        </div>
      </header>

      {isAdding && (
        <div className="bg-white p-6 border border-ed-border animate-in fade-in zoom-in-95 rounded-none">
          <h3 className="text-sm font-semibold mb-4 text-ed-ink uppercase tracking-widest">새로운 소스 기록</h3>
          <form onSubmit={handleAddSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-ed-muted uppercase tracking-widest mb-2">제목</label>
                <input required value={title} onChange={e => setTitle(e.target.value)} className="w-full min-h-11 border border-ed-border px-4 py-2.5 text-base focus:outline-none focus:border-ed-ink rounded-none text-ed-ink" placeholder="e.g., AI-native 서비스 트렌드" />
              </div>
              <div>
                <label className="block text-xs text-ed-muted uppercase tracking-widest mb-2">URL (선택)</label>
                <input value={url} onChange={e => setUrl(e.target.value)} className="w-full min-h-11 border border-ed-border px-4 py-2.5 text-base focus:outline-none focus:border-ed-ink rounded-none text-ed-ink" placeholder="https://..." />
              </div>
            </div>
            <div>
              <label className="block text-xs text-ed-muted uppercase tracking-widest mb-2">유형</label>
              <select value={type} onChange={e => setType(e.target.value as SourceType)} className="w-full min-h-11 border border-ed-border px-4 py-2.5 text-base focus:outline-none focus:border-ed-ink rounded-none bg-white text-ed-ink">
                <option value="YouTube">YouTube</option>
                <option value="X/Twitter">X/Twitter</option>
                <option value="Blog">Blog</option>
                <option value="Newsletter">Newsletter</option>
                <option value="Internal note">Internal note</option>
                <option value="Customer call">Customer call</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-ed-muted uppercase tracking-widest mb-2">Raw Notes / Transcript</label>
              <textarea required value={rawNotes} onChange={e => setRawNotes(e.target.value)} rows={4} className="w-full border border-ed-border px-4 py-3 text-base leading-relaxed focus:outline-none focus:border-ed-ink rounded-none text-ed-ink" placeholder="해당 콘텐츠에서 발견한 인사이트나 중요한 문장을 메모하세요..."></textarea>
            </div>
            <div className="flex justify-end pt-2">
              <button type="submit" className="min-h-11 px-5 py-2.5 bg-ed-ink text-white font-semibold text-[15px] border-none rounded-none hover:bg-black transition-colors">
                저장하기
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white border border-ed-border overflow-hidden rounded-none">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-[#fafafa] border-b border-ed-border text-ed-muted">
            <tr>
              <th className="px-5 py-4 font-normal text-xs uppercase tracking-widest">상태</th>
              <th className="px-5 py-4 font-normal text-xs uppercase tracking-widest">유형</th>
              <th className="px-5 py-4 font-normal text-xs uppercase tracking-widest w-full">제목</th>
              <th className="px-5 py-4 font-normal text-xs uppercase tracking-widest">액션</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ed-border text-ed-ink">
            {sources.map(source => (
              <tr key={source.id} className="hover:bg-[#fafafa] transition-colors border-transparent hover:border-ed-ink">
                <td className="px-5 py-4">
                  <span className={`px-2 py-1 text-xs font-semibold uppercase rounded-sm ${
                    source.status === 'Promoted' ? 'bg-[#e6f4ea] text-[#2d6a4f]' :
                    source.status === 'Inbox' ? 'bg-[#eee] text-[#666]' :
                    source.status === 'Scored' ? 'bg-[#e0f2fe] text-[#0369a1]' :
                    'bg-[#f3e8ff] text-[#7e22ce]'
                  }`}>
                    {source.status}
                  </span>
                </td>
                <td className="px-5 py-4 text-[15px] text-ed-muted">{source.type}</td>
                <td className="px-5 py-4 text-base font-semibold text-ed-ink truncate max-w-xs">{source.title}</td>
                <td className="px-5 py-4 text-right">
                  <button 
                    onClick={() => onNavigate('scoring', source.id)}
                    className="text-xs text-ed-ink uppercase tracking-widest font-semibold hover:underline"
                  >
                    스코어링 &rarr;
                  </button>
                </td>
              </tr>
            ))}
            {sources.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-ed-muted font-serif italic">
                  아직 수집된 소스가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
