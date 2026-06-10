import { Source, Draft } from './types';

export const mockSources: Source[] = [
  {
    id: 's1',
    title: 'AI-native 서비스 회사의 등장 (SaaS의 종말?)',
    url: 'https://youtube.com/watch?v=123',
    type: 'YouTube',
    rawNotes: 'SaaS 구독 모델이 피로감을 주고, 결과를 직접 제공하는 AI 에이전시나 AI-native 서비스가 뜨고 있다. 고객은 소프트웨어를 원하는 것이 아니라 해결된 결과를 원한다.',
    topicCluster: 'AI-native 트렌드',
    painPoint: '소프트웨어 도입 후 활용 방안을 모르는 피로감',
    audienceSignal: 'B2B 창업자들이 SaaS 피로도 관련 글에 공감 댓글 다수 작성',
    businessRelevance: '우리 AI 에이전시 서비스의 핵심 가치 제안과 일치',
    proofNeeded: '고객사 대상 기존 SaaS 대비 시간 단축 지표 (before/after metric)',
    salesTrigger: 'AI 자동화 인프라 구축 상담 유도',
    offerAngle: 'SaaS 구독료 내지 말고 AI로 해결된 결과를 사세요',
    status: 'Scored',
    createdAt: '2026-06-05T10:00:00Z',
    score: {
      totalScore: 24,
      brandVoiceScore: 85,
      proofDensityScore: 10,
      founderAuthorityScore: 12,
      nextAction: 'promote'
    }
  },
  {
    id: 's2',
    title: '2024년 1인 창업자의 병목 현상',
    url: '',
    type: 'Internal note',
    rawNotes: '사업이 커질수록 창업자 본인이 직접 실무를 처리해야 한다는 강박. 위임하지 못하면 스케일업 불가. AI OS를 도입해서 위임 가능한 구조를 만들어야 함.',
    topicCluster: '창업자 병목 / 운영 체제',
    painPoint: '성장이 멈추고 번아웃이 오는 1인 창업자의 운영 병목',
    audienceSignal: '생산성 툴 관련 모임에서 자주 나오는 고민',
    businessRelevance: '콘텐츠 OS 및 AI 자동화 컨설팅의 니즈 환기',
    proofNeeded: '창업자 본인의 업무 시간 감소 스크린샷 또는 워크플로우 맵',
    salesTrigger: '뉴스레터 구독 후 체크리스트 제공',
    offerAngle: '창업자를 실무에서 해방시키는 AI OS',
    status: 'Inbox',
    createdAt: '2026-06-06T14:20:00Z'
  },
  {
    id: 's3',
    title: 'X(트위터)에서 본 AI를 활용한 1인 레버리지 전략',
    url: 'https://x.com/someuser/status/456',
    type: 'X/Twitter',
    rawNotes: 'AI를 통해 혼자서도 10인분 이상의 콘텐츠와 프로덕트를 만들어내는 방법론 타래. 핵심은 완벽보다 속도와 반복 검증.',
    topicCluster: '1인 창업 레버리지',
    painPoint: '리소스 부족으로 실행력이 떨어짐',
    audienceSignal: '빠른 실행을 원하는 초기 창업자들의 리트윗 폭발',
    businessRelevance: '우리 솔루션이 그 10인분의 역할을 어떻게 대신하는지 어필 가능',
    proofNeeded: '1인 개발로 런칭한 프로젝트의 아키텍처 다이어그램',
    salesTrigger: '무료 오퍼레이팅 체크리스트 다운로드',
    offerAngle: '도구에 매몰되지 마라, 중요한 건 멘탈 모델의 변화다.',
    status: 'Promoted',
    createdAt: '2026-06-07T09:15:00Z',
    score: {
      totalScore: 22,
      brandVoiceScore: 82,
      proofDensityScore: 5,
      founderAuthorityScore: 11,
      nextAction: 'enrich'
    }
  }
];

export const mockDrafts: Draft[] = [
  {
    id: 'd1',
    sourceId: 's3',
    platform: 'LinkedIn',
    status: 'Draft',
    content: {
      hook: '혼자서 10명 이상의 퍼포먼스를 내는 1인 창업자들의 공통점은 "툴"을 쓰지 않는다는 것입니다.',
      mainPoint: 'AI 도구 자체에 매몰되는 것이 아니라, 업무 과정을 자동화 가능한 프로세스로 재설계(Redesign)하는 본질적인 멘탈 모델이 필요합니다. 완벽함보다 속도를 내기 위한 시스템을 구축하세요.',
      proofArtifactNeeded: '1인 창업으로 월 매출 1천만원 달성한 자동화 워크플로우 맵',
      cta: '여러분의 사업에서 가장 시간이 많이 드는 단순 반복 업무는 무엇인가요? 댓글로 공유해주세요.'
    },
    proof: {
      type: 'workflow map',
      exists: false,
      description: 'Notion + Zapier 연결된 워크플로우 다이어그램'
    },
    brandVoiceGate: {
      founderAuthority: true,
      businessTension: true,
      categoryOwnership: true,
      proofDensity: false,
      specificity: true,
      antiGenericness: true,
      conversionIntent: true,
      result: 'Needs proof'
    },
    updatedAt: '2026-06-08T05:00:00Z'
  }
];
