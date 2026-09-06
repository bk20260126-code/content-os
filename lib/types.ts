export type SourceType = 'YouTube' | 'X/Twitter' | 'Blog' | 'Newsletter' | 'Internal note' | 'Customer call' | 'Other';
export type SourceStatus = 'Inbox' | 'Scored' | 'Promoted' | 'Drafted' | 'Archived';
export type NextAction = 'promote' | 'enrich' | 'rewrite' | 'hold' | 'archive';

export interface SourceScore {
  totalScore: number; // 0-30
  brandVoiceScore: number; // 0-100
  proofDensityScore: number; // 0-15
  founderAuthorityScore: number; // 0-15
  nextAction: NextAction;
}

export interface Source {
  id: string;
  title: string;
  url: string;
  type: SourceType;
  rawNotes: string;
  topicCluster: string;
  painPoint: string;
  audienceSignal: string;
  businessRelevance: string;
  proofNeeded: string; // What proof is needed
  salesTrigger: string;
  offerAngle: string;
  status: SourceStatus;
  createdAt: string;
  score?: SourceScore;
  brief?: SourceBrief;
}

export type Platform = 'LinkedIn' | 'Instagram' | 'Threads' | 'X' | 'YouTube Shorts';
export type DraftStatus = 'Idea' | 'Draft' | 'Review' | 'Scheduled' | 'Published' | 'Recycle';
export type ProofType = 'screenshot' | 'workflow map' | 'system diagram' | 'customer quote' | 'before/after metric' | 'source document' | 'demo clip' | 'validation loop' | 'operating checklist';
export type GateResult = 'Ready for review' | 'Needs proof' | 'Needs stronger founder take' | 'Too generic' | 'Rewrite needed';

export interface Draft {
  id: string;
  sourceId: string; // link to source
  platform: Platform;
  status: DraftStatus;
  content: {
    hook: string;
    mainPoint: string;
    proofArtifactNeeded: string;
    cta: string;
    claim?: string;
  };
  proof: {
    type: ProofType;
    /**
     * Derived, never toggled by hand: true only while `proofId` points at a
     * ProofAsset still present in AppState.proofs. The publish gate depends on
     * this flag, so letting a user flip it directly would make the gate
     * decorative — the one thing this product must not be.
     */
    exists: boolean;
    description: string;
    /** Links to ProofAsset.id. Attaching real evidence is what opens the gate. */
    proofId?: string;
  };
  brandVoiceGate: {
    founderAuthority: boolean;
    businessTension: boolean;
    categoryOwnership: boolean;
    proofDensity: boolean;
    specificity: boolean;
    antiGenericness: boolean;
    conversionIntent: boolean;
    result: GateResult;
  };
  updatedAt: string;
  workflow?: DraftWorkflow;
}

// ============================================================
// UNIFIED TYPES v1 — 2026-06-10
// Merged from: content-os react (ProofAsset, gate workflow)
//            + 10x_content (ContentRun deep-authoring state machine)
// Design doc: ../TYPES_UNIFIED_v1_2026-06-10.md
// ============================================================

/** Proof asset registry — ported from content-os react ProofManagement */
export interface ProofAsset {
  id: string;
  sourceId?: string; // optional link to originating source
  type: ProofType;
  title: string;
  description: string;
  url?: string; // file path or external link
  createdAt: string;
}

/** Deep-authoring run — ported from 10x_content WorkflowRun */
export type RunStage =
  | 'source_intake'
  | 'idea_queue'
  | 'creator_interview'
  | 'anchor_draft'
  | 'editorial_review'
  | 'derivative_bundle'
  | 'lessons_capture';

export interface InterviewAnswer {
  questionId: string;
  question: string;
  answer: string;
}

export interface EditorialReview {
  overallScore: number;       // 0-100
  specificityScore: number;
  buyerRelevanceScore: number;
  voiceFitScore: number;
  ctaFitScore: number;
  slopWarning: boolean;
  recommendedAction: string;
  needsMoreThinkingQuestions?: string[];
  revisedDraftProposal?: string;
}

export interface DerivativeAsset {
  id: string;
  platform: Platform;
  content: string;
  sourceAnchorExcerpt: string;
}

export interface Lesson {
  id: string;
  type: 'hook' | 'structure' | 'proof' | 'voice' | 'cta' | 'other';
  description: string;
}

export interface ContentRun {
  id: string;
  sourceId: string;
  draftId?: string; // anchor draft produced by this run
  stage: RunStage;
  interview: InterviewAnswer[];
  anchorDraft: string;
  review: EditorialReview | null;
  derivatives: DerivativeAsset[];
  lessons: Lesson[];
  status: 'idle' | 'running' | 'completed';
  createdAt: string;
  updatedAt: string;
}

/** Brand voice settings — hardcoded rules made configurable (SaaS path, Phase 2) */
export interface CreatorProfile {
  name: string;
  positioning: string;
  voice: string[];   // voice anchors
  avoid: string[];   // banned phrases / generic patterns
  primaryCta: string;
  audience?: string;
  goal?: string;
}

/** Single persisted app state — see lib/storage.ts */
export interface AppState {
  schemaVersion: 1;
  sources: Source[];
  drafts: Draft[];
  proofs: ProofAsset[];
  runs: ContentRun[];
  profile: CreatorProfile | null;
}

export interface SourceBrief {
  claim: string;
  author: string;
  observedAt: string;
  excerpt: string;
  unknowns: string;
}

export interface DraftWorkflow {
  revision: number;
  verifiedProof?: { revision: number; proofId: string; fingerprint: string };
  reviewed?: { revision: number; at: string };
  publication?: { at: string; url: string };
  supersedes?: string;
  lesson?: string;
}
