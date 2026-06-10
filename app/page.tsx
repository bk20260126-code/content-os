'use client'

import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Dashboard } from '@/components/Dashboard';
import { SourceLibrary } from '@/components/SourceLibrary';
import { Scoring } from '@/components/Scoring';
import { RepurposeStudio } from '@/components/RepurposeStudio';
import { Pipeline } from '@/components/Pipeline';
import { mockSources, mockDrafts } from '@/lib/mock-data';
import { Source, Draft } from '@/lib/types';
import { store, emptyState } from '@/lib/storage';

export type ViewState = 'dashboard' | 'library' | 'scoring' | 'repurpose' | 'pipeline';

export default function Page() {
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [sources, setSources] = useState<Source[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const hydratedRef = useRef(false);

  // Hydrate from persistence; seed with mock data on first run.
  useEffect(() => {
    store.load().then((saved) => {
      if (saved) {
        setSources(saved.sources);
        setDrafts(saved.drafts);
      } else {
        setSources(mockSources);
        setDrafts(mockDrafts);
      }
      hydratedRef.current = true;
      setHydrated(true);
    });
  }, []);

  // Persist on every change after hydration.
  useEffect(() => {
    if (!hydratedRef.current) return;
    store.save({ ...emptyState(), sources, drafts });
  }, [sources, drafts]);

  const navigateTo = (view: ViewState, sourceId?: string) => {
    if (sourceId) {
      setSelectedSourceId(sourceId);
    }
    setCurrentView(view);
  };

  if (!hydrated) {
    return <div className="flex h-screen w-full items-center justify-center bg-ed-bg text-ed-muted font-sans text-sm">Loading…</div>;
  }

  return (
    <div className="flex h-screen w-full bg-ed-bg text-ed-ink font-sans">
      <Sidebar currentView={currentView} setCurrentView={setCurrentView} />
      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        <div className="flex-1 w-full max-w-6xl mx-auto p-8 relative">
          {currentView === 'dashboard' && <Dashboard sources={sources} drafts={drafts} onNavigate={navigateTo} />}
          {currentView === 'library' && <SourceLibrary sources={sources} setSources={setSources} onNavigate={navigateTo} />}
          {currentView === 'scoring' && <Scoring sources={sources} setSources={setSources} selectedSourceId={selectedSourceId} onNavigate={navigateTo} />}
          {currentView === 'repurpose' && <RepurposeStudio sources={sources} drafts={drafts} setDrafts={setDrafts} selectedSourceId={selectedSourceId} onNavigate={navigateTo} />}
          {currentView === 'pipeline' && <Pipeline drafts={drafts} setDrafts={setDrafts} onNavigate={navigateTo} />}
        </div>
      </main>
    </div>
  );
}
