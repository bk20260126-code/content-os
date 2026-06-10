import React from 'react';
import { ViewState } from '@/app/page';

interface SidebarProps {
  currentView: ViewState;
  setCurrentView: (view: ViewState) => void;
}

export function Sidebar({ currentView, setCurrentView }: SidebarProps) {
  const navItems = [
    { id: 'dashboard', step: '', label: '대시보드', desc: '다음 할 일 확인' },
    { id: 'library', step: '1', label: '수집', desc: '소스 라이브러리' },
    { id: 'scoring', step: '2', label: '채점 · 승급', desc: 'AI 채점 → 승급 확정' },
    { id: 'repurpose', step: '3', label: '제작', desc: 'AI 초안 + 보이스 게이트' },
    { id: 'pipeline', step: '4', label: '발행 관리', desc: '리뷰 → 예약 → 발행' },
  ] as const;

  return (
    <aside className="w-[240px] bg-white border-r border-ed-border flex flex-col h-screen pt-8 px-6 pb-8">
      <div className="mb-10 flex flex-col items-start gap-0">
        <h1 className="text-2xl font-serif font-bold italic tracking-tight text-ed-ink text-left leading-none">Content OS</h1>
      </div>
      <nav className="flex-1 flex flex-col space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setCurrentView(item.id)}
            className={`w-full flex items-start gap-3 py-3 px-0 border-b transition-colors text-left ${
              currentView === item.id
                ? 'text-ed-ink border-ed-ink'
                : 'text-ed-muted border-transparent hover:text-ed-ink'
            }`}
          >
            <span className={`shrink-0 w-5 h-5 mt-[1px] flex items-center justify-center text-[10px] font-semibold border rounded-full ${
              currentView === item.id ? 'border-ed-ink text-ed-ink' : 'border-ed-border text-ed-muted'
            } ${item.step ? '' : 'opacity-0'}`}>{item.step || '·'}</span>
            <span className="flex flex-col">
              <span className="font-medium text-[0.9rem] leading-tight">{item.label}</span>
              <span className="text-[10px] text-ed-muted mt-0.5">{item.desc}</span>
            </span>
          </button>
        ))}
      </nav>
      <div className="mt-auto">
        <div className="bg-[#fafafa] border text-left border-ed-border p-4">
          <span className="text-[10px] text-ed-muted uppercase tracking-widest font-sans block mb-2">작동 흐름</span>
          <p className="text-[11px] text-ed-ink leading-relaxed">
            수집 → 채점 → 제작 → 발행.<br />
            증거 없는 글은 발행되지 않습니다.
          </p>
        </div>
      </div>
    </aside>
  );
}
