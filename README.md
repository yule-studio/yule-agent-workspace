# yule-agent-workspace

> **yule-studio-agent 를 24/7 로 굴리는 운영 표면(operating surface).**
> 정규 세션/태스크 상태, 픽셀 오피스 시각화, GitHub·Discord·Vault 브리지,
> 그리고 토큰을 아끼는 런타임을 한곳에서 다룬다.

`yule-agent-workspace` 는 역할별 에이전트들이 상시 동작하되 **토큰 비용은
통제되는** 영속 워크스페이스다. 엔진(`yule-studio-agent`)이 실행을 맡고, 이
레포는 그 위에서 **상태의 단일 진실원천(source of truth)** 과 사람이 보고
조작하는 표면을 제공한다.

---

## 왜 이 프로젝트가 필요한가

기존에는 Discord 가 사실상 워크플로 DB 였다. 카드/메시지가 곧 상태였고,
"이 작업이 지금 어느 단계인지" 가 채널 스크롤에 흩어져 있었다. 그래서:

- 상태가 **메시지에 종속** 되어 질의/감사/복구가 어렵다.
- 폐기한 세션이 우연히 되살아나는 사고가 난다.
- 24/7 로 켜두면 폴링 루프와 재분석이 **토큰을 계속 태운다.**

`yule-agent-workspace` 는 이 셋을 정면으로 푼다.

1. **상태를 백엔드로 끌어온다.** Discord/GitHub/엔진은 모두 이 백엔드에
   *매핑* 될 뿐, 누구도 상태를 소유하지 않는다.
2. **정규 상태머신** 으로 세션 라이프사이클을 강제한다. terminal 세션은
   되살아나지 않고, 재진입은 멱등이다.
3. **토큰 인지 런타임.** 일 없는 에이전트는 비용 0 의 idle/watch 에 머물고,
   비싼 추론은 정당한 순간(계획·리뷰·승인 분석)에만 켜진다.

---

## 아키텍처 개요

```
┌──────────────────────────────────────────────────────────────┐
│  WORKSPACE LAYER  (이 레포 · 운영 표면 · 상태 SoT)            │
│                                                                │
│  apps/web         Next.js 대시보드 · 픽셀 오피스 · 보드        │
│  apps/api         Fastify · 상태머신 · 예산 · SSE · SQLite SoT │
│  apps/discord-bot 사람 대화 + 승인 + 알림 브리지 (상태 0)      │
│                                                                │
│  packages/shared-types        정규 타입/상태/이벤트 어휘       │
│  packages/core                상태머신 + 토큰비용 순수 로직    │
│  packages/agent-core-adapter  엔진 연결 계약 (mock/http)       │
└───────────────────────────┬──────────────────────────────────┘
                            │  AgentCoreAdapter 계약
                            │  (runStep: 단일 step → 제안 전이)
┌───────────────────────────┴──────────────────────────────────┐
│  ENGINE LAYER  (yule-studio-agent · 별도 레포)                 │
│  역할 정의 · 정책 · provider 어댑터 · 런타임 실행 · 툴 호출    │
└──────────────────────────────────────────────────────────────┘
```

- **명령은 REST**, **상태 push 는 SSE**. 브라우저/브리지는 폴링하지 않는다.
- 스토리지는 Node 내장 `node:sqlite` — 네이티브 빌드도, 외부 서비스도 없다.
  repository 추상화 뒤에 있어 후일 Postgres 로 교체 가능하다.

자세한 내용:
- [docs/architecture.md](docs/architecture.md) — 전체 구조와 기술 선택 근거
- [docs/responsibility-boundary.md](docs/responsibility-boundary.md) — 엔진 ↔ 워크스페이스 책임 경계
- [docs/state-model.md](docs/state-model.md) — 정규 세션 상태머신
- [docs/cost-control.md](docs/cost-control.md) — 토큰/비용 통제 모델
- [docs/discord-reduction.md](docs/discord-reduction.md) — Discord 격하 전략
- [docs/agent-core-contract.md](docs/agent-core-contract.md) — 엔진 연결 계약
- [docs/local-dev.md](docs/local-dev.md) — 로컬 개발 가이드

---

## `yule-studio-agent` 와의 관계

| | yule-studio-agent (엔진) | yule-agent-workspace (이 레포) |
|---|---|---|
| 책임 | 역할/정책/실행/툴 호출/메모리 접근 | 상태 SoT/라우팅/예산/시각화/브리지 |
| 상태 | 보유 안 함 (stateless step 실행) | **보유 (정규 세션/태스크)** |
| 의사결정 | "다음에 무엇을" 제안 | 전이 검증·승인·예산 게이트 적용 |

엔진은 `AgentCoreAdapter.runStep()` 으로 **단일 bounded step** 을 실행하고
`{ tokensSpent, proposedEvent, summary }` 를 돌려줄 뿐이다. 워크스페이스는
그 제안을 상태머신으로 검증해 적용한다. 덕분에 엔진 없이도(mock 어댑터)
전체 워크플로가 굴러간다.

## 왜 Pixel Agents 를 포크하지 않았나

[pixel-agents](https://github.com/pixel-agents-hq/pixel-agents) 는 VS Code
확장 형태의 픽셀 오피스다. 우리는 그것을 **시각/인터랙션 레퍼런스** 로만
참고했다 — 픽셀 오피스 세계관, 라이브 활동 시각화, 말풍선/대기 신호,
에이전트 프레즌스. 하지만 제품 형태(VS Code 확장)와 목표(상태 SoT·예산·
브리지)가 다르므로, 그대로 포크하지 않고 **자체 아키텍처의 새 제품** 으로
만들었다. 시각화는 중요하지만, **상태의 정확성이 더 우선** 이다.

---

## 핵심 기능

- **정규 세션 상태머신** — 13 상태, terminal 보호, 멱등 재진입, block/unblock 복원
- **태스크당 단일 정규 세션** — DB partial-unique index 로 강제
- **토큰/비용 통제** — 런타임 모드(idle/watch/active/heavy/human), 세션·역할·일일 예산,
  모델 티어 라우팅, diff/issue 지문, 스냅샷 압축, escalation 임계
- **실시간 대시보드** — 폴링 없는 SSE 기반 라이브 상태
- **픽셀 오피스** — 역할별 에이전트 데스크, 상태 배지, 말풍선, 클릭 → 세션 패널
- **Discord 브리지** — 인바운드 명령 + 아웃바운드 알림, 상태는 보유하지 않음
- **GitHub 링크** — 태스크 ↔ issue/PR/branch 연결 (work item key 로 정규화)
- **오프라인 우선** — mock 어댑터 + 내장 SQLite 로 외부 의존 0개 실행

---

## 스크린샷 / 데모 (placeholder)

> 스크린샷은 추후 추가. 지금은 아래 Quick start 로 직접 띄워볼 수 있다.

- `/` 대시보드 — 토큰 사용량 바, "Needs you", 에이전트 표
- `/office` 픽셀 오피스 — 데스크별 라이브 상태 + 말풍선 + 세션 드로어
- `/tasks` 태스크 보드 — 새 태스크 생성 & 게이트까지 자동 진행
- `/sessions/:id` 세션 상세 — 예산 바, 승인 게이트, 전이 타임라인

---

## Quick start

```bash
# 1) local-dev 로 클론
git clone https://github.com/yule-studio/yule-agent-workspace.git
cd yule-agent-workspace

# 2) 의존성 설치 (npm workspaces)
npm install

# 3) (선택) 시드 데이터 — 라이프사이클 전반의 태스크 4종
npm run seed

# 4) API + 웹 동시 실행
npm run dev
#   API  -> http://localhost:4319   (health: /health)
#   웹   -> http://localhost:3000

# (선택) 다른 터미널에서 Discord 브리지 mock 모드
npm run dev:bot
```

외부 서비스(Postgres/Redis/Discord 토큰) **없이** 그대로 동작한다.

### 환경 변수

전부 로컬 기본값이 있어 `.env` 없이도 실행된다. 바꾸려면
[`.env.example`](.env.example) 를 복사한다.

| 변수 | 기본값 | 설명 |
|---|---|---|
| `API_PORT` | `4319` | API 포트 |
| `WORKSPACE_DB_PATH` | `./data/workspace.db` | SQLite 경로 (`:memory:` 가능) |
| `AGENT_CORE_MODE` | `mock` | `mock` 오프라인 / `http` 엔진 연결 |
| `AGENT_CORE_URL` | `http://127.0.0.1:8800` | 엔진 HTTP 브리지 URL |
| `TOKEN_DAILY_CAP` | `2000000` | 워크스페이스 일일 토큰 상한 |
| `TOKEN_SESSION_CAP` | `120000` | 세션 기본 예산 |
| `TOKEN_ESCALATION_RATIO` | `0.8` | escalation 발화 비율 |
| `DISCORD_TOKEN` | (빈값) | 비우면 브리지 mock 모드 |
| `NEXT_PUBLIC_API_URL` | `http://localhost:4319` | 웹이 호출할 API (web/.env.local) |

### 로컬 실행 명령

| 명령 | 설명 |
|---|---|
| `npm run dev` | API + 웹 동시 실행 |
| `npm run dev:api` | API 만 |
| `npm run dev:web` | 웹 만 |
| `npm run dev:bot` | Discord 브리지(mock) |
| `npm run seed` | 시드 데이터 주입 |
| `npm test` | core 단위 테스트(상태머신/비용) |
| `npm run typecheck` | 전 패키지 타입 체크 |

---

## 개발 워크플로

- 작업은 **feature 브랜치** 에서. protected 브랜치(main) 직접 push 금지.
- 커밋은 한국어 + gitmoji + (변경 이유/주요 변경 사항/비고) 3 섹션.
- PR 1 개당 최소 3 commit 으로 논리 분할.
- 새 기능엔 **새 테스트** 우선. 상태머신/비용 로직은 `packages/core/test`,
  명령 파싱은 `apps/discord-bot/test`.
- 700 줄 초과 파일은 책임 분리 검토, 1000 줄 초과는 분리 대상.

자세한 로컬 절차는 [docs/local-dev.md](docs/local-dev.md).

---

## 로드맵

- [x] Phase 1 — 모노레포 · 상태 SoT API · SQLite · health · SSE
- [x] Phase 2 — 대시보드 · 에이전트/태스크/세션 뷰 · 실시간
- [x] Phase 4 — 픽셀 오피스 (데스크/배지/말풍선/드로어)
- [x] Phase 5 — 토큰/비용 통제 (런타임 모드·예산·티어·지문·스냅샷)
- [x] Phase 3 — Discord 브리지 (mock 모드 runnable, live 경로 구현)
- [ ] 엔진 HTTP 브리지(`/v1/run-step`) 를 `yule-studio-agent` 에 구현
- [ ] Vault/Obsidian 인덱싱·요약 브리지 (bounded 메모리 회수)
- [ ] GitHub webhook 인입 -> 자동 태스크/지문 갱신
- [ ] Postgres 스토리지 어댑터 + on-prem/OCI 배포 매니페스트
- [ ] 픽셀 오피스 아트(타일맵/스프라이트) + 애니메이션

---

## 비목표 (Non-goals)

- 자율 AGI 환상 제품을 만들지 않는다.
- day-1 멀티클러스터 인프라를 깔지 않는다.
- Discord 를 단일 워크플로 DB 로 다시 쓰지 않는다.
- 풀 게임 엔진을 만들지 않는다.
- 상태 관리가 되기 전에 화려한 애니메이션을 우선하지 않는다.
- MVP 전달을 늦추는 불필요한 추상화를 넣지 않는다.

---

## 기여 가이드

1. 이슈/PR 에는 라벨 + assignee 를 단다.
2. `npm test` 와 `npm run typecheck` 통과 후 PR.
3. 상태/비용/계약을 바꾸면 해당 `docs/*` 를 같은 PR 에서 갱신한다 (cross-link
   원칙: 같은 규칙을 두 곳에 복제하지 않는다).
4. 커밋/브랜치 규약은 위 "개발 워크플로" 참고.

---

## 라이선스

MIT — [LICENSE](LICENSE) 참고.
