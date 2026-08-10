# Content OS

레퍼런스 하나를 **증거가 붙은 발행 후보**로 바꾸는 콘텐츠 운영 시스템.
내 컴퓨터에 설치해서 쓰는 오픈소스 앱입니다.

> **규칙은 하나입니다. 증거 없는 글은 발행되지 않습니다.**
> 초안에 실제 자료(스크린샷·워크플로우 맵·전후 수치·고객 인용 등)를 붙이지 않으면
> 게이트가 `Needs proof`에서 넘어가지 않습니다. 체크박스를 다 켜도 안 열립니다.

```text
1 수집  →  2 채점·승급  →  3 제작(증명 게이트)  →  4 발행 관리
```

AI는 채점하고 초안을 쓰고 게이트를 평가합니다. **확정은 끝까지 사람이 합니다.**

---

## 5분 만에 실행하기

Node.js만 있으면 됩니다. 계정 가입도, 데이터베이스도, API 키도 필요 없습니다.

```bash
npm install
npm run dev
```

`http://localhost:3000`을 열면 데모 데이터가 들어간 상태로 앱이 뜹니다.
4단계 흐름을 그대로 눌러보면서 익히세요. 데이터는 브라우저의 localStorage에 저장됩니다.

처음이라면 **[사용 가이드](docs/GUIDE.html)** 를 브라우저로 여세요 (파일을 더블클릭해도 됩니다).
설치부터 첫 콘텐츠 완주까지 15분, 단계마다 무엇을 누르는지 그대로 나옵니다.

## AI 기능 켜기 (선택)

AI 채점·초안 생성·게이트 평가를 쓰려면 Gemini API 키가 필요합니다.
[Google AI Studio](https://aistudio.google.com/apikey)에서 무료로 발급받을 수 있습니다.

```bash
cp .env.example .env.local
```

`.env.local`에 키를 넣으세요.

```bash
GEMINI_API_KEY="발급받은_키"
```

**키가 없어도 앱은 그대로 동작합니다.** AI 호출이 실패하면 템플릿 초안이 만들어져서
작업이 막히지 않습니다. 채점과 게이트 판단을 수동으로 하면 됩니다.

## 여러 기기에서 쓰기 (선택)

기본값은 localStorage라 브라우저를 지우면 데이터도 사라지고, 다른 기기와 공유되지 않습니다.
클라우드에 저장하려면 본인 [Supabase](https://supabase.com) 프로젝트를 연결하세요. 무료 플랜으로 충분합니다.

1. Supabase에서 새 프로젝트를 만듭니다
2. SQL Editor에서 `supabase/migrations/` 안의 파일을 **번호 순서대로** 실행합니다
3. `.env.local`에 추가합니다

```bash
SUPABASE_URL="https://<프로젝트-ref>.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="본인_service_role_키"
NEXT_PUBLIC_STORE_BACKEND="supabase"
```

`service_role` 키는 서버에서만 쓰이고 브라우저로 절대 나가지 않습니다.
`NEXT_PUBLIC_` 접두사를 붙이지 마세요.

## 인터넷에 올릴 때

로컬에서만 쓴다면 이 단락은 건너뛰세요.

배포하면 앱 전체가 HTTP Basic 인증으로 잠깁니다. 아이디와 비밀번호를 설정하지 않으면
**서버가 503으로 닫힙니다** — 설정을 깜빡해서 service_role API가 열리는 일이 없도록
일부러 그렇게 만들었습니다.

```bash
APP_ACCESS_USERNAME="아이디"
APP_ACCESS_PASSWORD="길고_무작위인_비밀번호"
```

반드시 HTTPS로만 배포하세요.

## 이 앱은 1인용입니다

사용자 계정이나 팀 기능이 없습니다. 한 사람이 자기 기기에서 자기 데이터로 쓰는 도구이고,
그래서 설치가 간단합니다. 여러 사람이 쓰려면 각자 설치하면 됩니다.

## 서체

본문은 [Pretendard](https://github.com/orioncactus/pretendard)(SIL OFL), 제목은 Gmarket Sans입니다.

Gmarket Sans 파일은 **일부러 저장소에 포함하지 않았습니다.** 무료로 쓸 수 있는 서체지만
재배포 허용 여부가 명확하지 않아, 설치된 서체만 참조합니다. 없으면 Pretendard로 표시되며
레이아웃은 그대로입니다. 원한다면 [지마켓 서체 페이지](https://corp.gmarket.com/fonts)에서
무료로 받아 설치하세요.

## 검증

```bash
npm test      # 접근 제어·영속화 테스트
npm run lint
npm run build
```

## 구조

```text
app/            페이지와 API 라우트 (/api/ai, /api/state)
components/     4단계 화면 + 증명 첨부 패널
lib/            타입, 저장소 어댑터, AI 클라이언트, 접근 제어
supabase/       마이그레이션 SQL (클라우드 저장을 쓸 때만)
plans/          처음 사용 가이드
tests/          검증 테스트
```

## 라이선스

MIT — [LICENSE](LICENSE) 참조.
