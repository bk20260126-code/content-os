'use client'

import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Dashboard } from '@/components/Dashboard';
import { SourceLibrary } from '@/components/SourceLibrary';
import { Scoring } from '@/components/Scoring';
import { RepurposeStudio } from '@/components/RepurposeStudio';
import { Pipeline } from '@/components/Pipeline';
import { mockSources, mockDrafts } from '@/lib/mock-data';
import { Source, Draft, ProofAsset, AppState } from '@/lib/types';
import { store, emptyState } from '@/lib/storage';
import { shouldSeedMockData } from '@/lib/state-policy';

export type ViewState = 'dashboard' | 'library' | 'scoring' | 'repurpose' | 'pipeline';

export default function Page() {
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [sources, setSources] = useState<Source[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [proofs, setProofs] = useState<ProofAsset[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const hydratedRef = useRef(false);
  // Slices this UI doesn't edit yet (runs/profile — deep-authoring mode). We
  // round-trip whatever we loaded so saves preserve the complete state.
  const extrasRef = useRef<Pick<AppState, 'runs' | 'profile'>>({
    runs: [],
    profile: null,
  });

  // Hydrate from persistence. Demo data is local-development-only and is never
  // written into an empty cloud database.
  useEffect(() => {
    store.load().then((saved) => {
      if (saved) {
        setSources(saved.sources);
        setDrafts(saved.drafts);
        setProofs(saved.proofs);
        extrasRef.current = { runs: saved.runs, profile: saved.profile };
      } else if (shouldSeedMockData(process.env.NODE_ENV, process.env.NEXT_PUBLIC_STORE_BACKEND)) {
        setSources(mockSources);
        setDrafts(mockDrafts);
      }
      hydratedRef.current = true;
      setHydrated(true);
    });
  }, []);

  // Persist on change after hydration — debounced so typing doesn't hammer the network.
  // Preserve the not-yet-edited slices (extrasRef) so persistence round-trips full state.
  useEffect(() => {
    if (!hydratedRef.current) return;
    const timer = setTimeout(() => {
      store.save({ ...emptyState(), ...extrasRef.current, sources, drafts, proofs });
    }, 800);
    return () => clearTimeout(timer);
  }, [sources, drafts, proofs]);

  const navigateTo = (view: ViewState, sourceId?: string) => {
    if (sourceId) {
      setSelectedSourceId(sourceId);
    }
    setCurrentView(view);
  };

  if (!hydrated) {
    return <div className="flex h-screen w-full items-center justify-center bg-nf-paper text-nf-muted font-sans text-sm">Loading…</div>;
  }

  return (
    <div className="flex h-screen w-full bg-nf-paper text-nf-ink font-sans">
      <Sidebar currentView={currentView} setCurrentView={setCurrentView} />
      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        <div className="flex-1 w-full max-w-[1440px] mx-auto p-8 xl:p-10 relative">
          {currentView === 'dashboard' && <Dashboard sources={sources} drafts={drafts} onNavigate={navigateTo} />}
          {currentView === 'library' && <SourceLibrary sources={sources} setSources={setSources} onNavigate={navigateTo} />}
          {currentView === 'scoring' && <Scoring sources={sources} setSources={setSources} selectedSourceId={selectedSourceId} onNavigate={navigateTo} />}
          {currentView === 'repurpose' && <RepurposeStudio sources={sources} drafts={drafts} setDrafts={setDrafts} proofs={proofs} setProofs={setProofs} selectedSourceId={selectedSourceId} onNavigate={navigateTo} />}
          {currentView === 'pipeline' && <Pipeline drafts={drafts} setDrafts={setDrafts} onNavigate={navigateTo} />}
        </div>
      </main>
    </div>
  );
}
