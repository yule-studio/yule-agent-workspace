# 아키텍처

`yule-agent-workspace` 는 두 레이어로 시스템을 가른다.

## 1. 두 레이어

### A. 엔진 레이어 — `yule-studio-agent` (별도 레포)
- 역할 정의, 정책, provider 어댑터, 런타임 실행, 툴 호출, 메모리 접근 계약.
- 워크스페이스 입장에서 **stateless** 하다. "다음에 무엇을 할지" 를 제안하고
  실제 토큰을 태우는 단일 step 을 실행할 뿐, 상태를 보유하지 않는다.

### B. 워크스페이스 레이어 — 이 레포
- 상태의 단일 진실원천(SoT), 정규 태스크 라우팅, 세션 상태머신, 예산/비용
  통제, 픽셀 오피스 UI, 대시보드, GitHub/Discord/Vault 브리지, 운영자 컨트롤.

이렇게 가르는 이유: **실행(어떻게)과 상태/거버넌스(무엇을·언제·얼마나)를
분리** 해야 엔진을 갈아끼우거나 mock 으로 대체해도 운영 표면이 흔들리지 않는다.

## 2. 모노레포 구성

```
apps/
  api/          Fastify 백엔드 — 상태 SoT, 상태머신, 예산, SSE
  web/          Next.js — 대시보드 / 픽셀 오피스 / 보드
  discord-bot/  사람 대화 + 승인 + 알림 브리지 (상태 보유 0)
packages/
  shared-types/        정규 타입 / 상태 / 런타임모드 / 이벤트 어휘 (순수)
  core/                상태머신 + 토큰비용 순수 로직 (+ vitest)
  agent-core-adapter/  엔진 연결 계약 + mock + http 구현
docs/ scripts/ examples/
```

의존 방향은 단방향이다: `apps/*` → `packages/core` → `packages/shared-types`.
`shared-types` 는 어떤 node 런타임 API 도 import 하지 않는 순수 타입/상수라,
브라우저 번들에 안전하게 들어간다.

## 3. 기술 선택과 근거

| 결정 | 선택 | 근거 |
|---|---|---|
| 모노레포 | npm workspaces | 환경에 pnpm 미설치. npm 11 워크스페이스로 충분, 추가 전역 툴 0 |
| API 프레임워크 | Fastify | NestJS 의 DI/데코레이터는 이 표면적엔 과함. 더 가볍고 MVP 빠름 |
| 스토리지 | `node:sqlite` (내장) | 네이티브 빌드 없음, 외부 서비스 없음 → local-dev 우선. repository 뒤에 숨겨 Postgres 교체 가능 |
| 실시간 | SSE | 상태 push 는 단방향. WebSocket 보다 단순하고 프록시 친화적, 브라우저 EventSource 가 재접속 처리 |
| 명령 | REST | 멱등·캐시·디버깅 용이. 상태 변경은 전부 REST |
| 언어/런타임 | TypeScript ESM + tsx | 빌드 단계 없이 실행. 패키지는 소스 진입점 + Next `transpilePackages` |
| 프런트 | Next.js App Router | 지시된 기본값. 클라이언트 컴포넌트 + SSE 로 라이브 |

## 4. 이벤트 구동 spine

상태가 바뀌면 `WorkspaceService` 가 `WorkspaceEvent` 를 발행한다. 이벤트는
(a) `events` 테이블에 저장(재생/dedup)되고 (b) 인프로세스 `EventBus` 로
SSE 구독자에게 fan-out 된다. 그래서 웹/브리지는 **폴링하지 않는다** — 이것이
24/7 에서 토큰을 아끼는 1차 메커니즘이다(LLM 루프가 아니라 이벤트가 깨운다).

인프로세스 버스는 MVP 결정이다. 후일 Redis/NATS 로 fan-out 을 바꿔도
publisher 코드는 그대로다.

## 5. 데이터 모델 (요약)

- **Task** — 정규 work item. 재시도를 넘어 안정적. `workItemKey`(예:
  `github:owner/repo#42`)로 외부 work item 과 1:1.
- **Session** — Task 를 상태머신으로 한 번 굴리는 실행 시도. Task 당 활성
  세션은 최대 1개(DB partial-unique index). 이력 = Task 의 모든 세션.
- **SessionTransition** — 세션의 감사 로그(전이 1건 = 1행, 토큰 spend 포함).
- **token_usage** — (일자, 역할) 별 토큰 누계 — 일일/역할 캡의 근거.
- **events** — 이벤트 로그 (SSE catch-up + alert dedupe).

자세한 상태 전이는 [state-model.md](state-model.md), 비용 모델은
[cost-control.md](cost-control.md) 참고.
