'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Dashboard } from '@/components/Dashboard';
import { SourceLibrary } from '@/components/SourceLibrary';
import { Scoring } from '@/components/Scoring';
import { RepurposeStudio } from '@/components/RepurposeStudio';
import { Pipeline } from '@/components/Pipeline';
import { Settings } from '@/components/Settings';
import { mockSources, mockDrafts } from '@/lib/mock-data';
import { AppState } from '@/lib/types';
import { store, emptyState, subscribeStorage, SaveStatus, ApiStore, CloudSnapshot } from '@/lib/storage';
import { shouldSeedMockData } from '@/lib/state-policy';
export type ViewState = 'dashboard' | 'library' | 'scoring' | 'repurpose' | 'pipeline' | 'settings';
export default function Page() {
  const [view, setView] = useState<ViewState>('dashboard');
  const [state, setState] = useState<AppState>(emptyState);
  const [sourceId, setSourceId] = useState<string | null>(null), [draftId, setDraftId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false), [loadError, setLoadError] = useState('');
  const [status, setStatus] = useState<SaveStatus>({ kind: 'local', message: '불러오는 중' });
  const lastSaved = useRef('');
  useEffect(() => subscribeStorage(setStatus), []);
  useEffect(() => {
    let live = true;
    store.load().then(saved => {
      if (!live) return;
      const initial = saved ?? (shouldSeedMockData(process.env.NODE_ENV, process.env.NEXT_PUBLIC_STORE_BACKEND) ? { ...emptyState(), sources: mockSources, drafts: mockDrafts } : emptyState());
      lastSaved.current = JSON.stringify(initial); setState(initial); setHydrated(true);
    }).catch(e => { if (live) setLoadError(e instanceof Error ? e.message : '저장된 데이터를 읽지 못했습니다.'); });
    return () => { live = false; };
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    const serialized = JSON.stringify(state);
    if (serialized === lastSaved.current) return;
    lastSaved.current = serialized;
    // Local checkpoint happens immediately; the store serializes cloud writes.
    store.save(state).catch(e => setStatus({ kind: 'error', message: `저장 실패 · 백업을 내려받으세요 (${e instanceof Error ? e.message : '오류'})` }));
  }, [state, hydrated]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (status.kind === 'error') { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [status.kind]);
  function slice<K extends 'sources' | 'drafts' | 'proofs'>(key: K): React.Dispatch<React.SetStateAction<AppState[K]>> {
    return action => setState(prev => ({ ...prev, [key]: typeof action === 'function' ? (action as (value: AppState[K]) => AppState[K])(prev[key]) : action }));
  }
  function navigate(view: ViewState, source?: string, draft?: string) { setSourceId(source ?? null); setDraftId(draft ?? null); setView(view); }
  async function restore(next: AppState) {
    await store.replaceLocal(next);
    lastSaved.current = JSON.stringify(next); setState(next); setHydrated(true); setLoadError('');
  }
  async function acceptCloud(snapshot: CloudSnapshot, choice: 'local' | 'cloud') {
    if (!(store instanceof ApiStore)) return;
    const next = await store.resolve(snapshot, choice, state);
    lastSaved.current = JSON.stringify(next); setState(next);
  }
  const settings = <Settings state={state} recovery={!!loadError} setProfile={profile => setState(prev => ({ ...prev, profile }))} restore={restore} acceptCloud={acceptCloud} />;
  if (loadError) return <main className="max-w-4xl mx-auto p-8 space-y-6"><h1 className="text-2xl font-bold">기존 데이터를 보존하고 복구를 기다립니다</h1><p role="alert" className="notice">{loadError} 자동 저장을 중단했습니다.</p><button className="action-secondary" onClick={() => window.location.reload()}>다시 불러오기</button>{settings}</main>;
  if (!hydrated) return <div className="p-12">저장된 작업을 불러오는 중…</div>;
  return <div className="flex w-full h-screen bg-nf-paper text-nf-ink"><Sidebar currentView={view} setCurrentView={v => navigate(v)} /><main className="flex-1 min-w-0 flex flex-col h-screen overflow-y-auto">
    <div className="sticky top-0 z-30 px-6 py-3 bg-white border-b border-nf-border flex flex-wrap justify-between gap-3"><p role="status" className={['error','conflict','pending'].includes(status.kind) ? 'text-amber-800' : 'text-nf-muted'}>{status.message}</p><button className="underline text-sm" onClick={() => navigate('settings')}>설정 · 백업 · 복원</button></div>
    <div className="flex-1 w-full max-w-[1440px] mx-auto p-8 xl:p-10 relative">
      {view === 'dashboard' && <Dashboard sources={state.sources} drafts={state.drafts} proofs={state.proofs} onNavigate={navigate} />}
      {view === 'library' && <SourceLibrary sources={state.sources} setSources={slice('sources')} selectedSourceId={sourceId} onNavigate={navigate} />}
      {view === 'scoring' && <Scoring sources={state.sources} setSources={slice('sources')} profile={state.profile} selectedSourceId={sourceId} onNavigate={navigate} />}
      {view === 'repurpose' && <RepurposeStudio key={`${sourceId ?? ''}:${draftId ?? ''}`} sources={state.sources} drafts={state.drafts} proofs={state.proofs} profile={state.profile} setDrafts={slice('drafts')} setProofs={slice('proofs')} selectedSourceId={sourceId} selectedDraftId={draftId} onNavigate={navigate} />}
      {view === 'pipeline' && <Pipeline drafts={state.drafts} proofs={state.proofs} setDrafts={slice('drafts')} onNavigate={navigate} />}
      {view === 'settings' && settings}
    </div>
  </main></div>;
}
