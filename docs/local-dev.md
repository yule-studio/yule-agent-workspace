# 로컬 개발 가이드

모든 절차는 **local-dev 우선** 을 전제한다. 클라우드/외부 서비스 없이 MVP 를
띄울 수 있다.

## 요구 사항

- **Node >= 22.5** (`node:sqlite` 내장 SQLite 사용 — 네이티브 빌드 불필요).
  `nvm use` 로 `.nvmrc`(22.5.0) 적용 가능.
- npm 9+ (workspaces). pnpm/yarn 불필요.
- Postgres/Redis/Docker **불필요**. Discord 토큰 **불필요**(mock 모드).

## 설치

```bash
git clone https://github.com/yule-studio/yule-agent-workspace.git
cd yule-agent-workspace
npm install
```

## 환경 변수

`.env` 없이도 로컬 기본값으로 동작한다. 바꾸려면:

```bash
cp .env.example .env                      # API / 봇용 (루트)
echo "NEXT_PUBLIC_API_URL=http://localhost:4319" > apps/web/.env.local
```

전체 변수 표는 [README](../README.md#환경-변수) 참고.

## 실행

```bash
npm run seed       # (선택) 라이프사이클 전반의 시드 태스크 4종
npm run dev        # API(:4319) + 웹(:3000) 동시
# 또는 개별
npm run dev:api
npm run dev:web
npm run dev:bot    # Discord 브리지 mock — stdin 으로 명령 입력
```

웹에서 확인할 페이지: `/`(대시보드), `/office`(픽셀 오피스), `/tasks`,
`/sessions/:id`.

## 검증 절차

```bash
# 1) 단위 테스트 (상태머신 + 비용 + 명령 파서)
npm test
npx vitest run --root apps/discord-bot

# 2) 타입 체크
npm run typecheck

# 3) API 헬스
curl -s http://localhost:4319/health | jq

# 4) 태스크 생성 + 게이트까지 진행
curl -s -X POST http://localhost:4319/api/tasks \
  -H 'content-type: application/json' \
  -d '{"title":"Try the workspace","role":"engineering","source":"api","autostart":true}' | jq

# 5) 상태 스냅샷
curl -s http://localhost:4319/api/status | jq

# 6) 실시간 이벤트 (Ctrl-C 로 종료)
curl -N http://localhost:4319/api/events
```

엔드-투-엔드 시나리오는 [`examples/walkthrough.sh`](../examples/walkthrough.sh)
한 방으로도 볼 수 있다(API 가 떠 있어야 함).

## 엔진(`yule-studio-agent`) 연결 (선택)

기본은 `AGENT_CORE_MODE=mock`(오프라인). 실엔진에 붙이려면:

```bash
AGENT_CORE_MODE=http AGENT_CORE_URL=http://127.0.0.1:8800 npm run dev:api
```

엔진은 `GET /health` 와 `POST /v1/run-step` 을 제공해야 한다
([agent-core-contract.md](agent-core-contract.md)). 미구현 시 health 가
not-ok 를 반환한다.

## 알려진 한계 (MVP)

- **엔진 HTTP 브리지 미구현** — 실제 추론은 아직 mock. 계약만 확정됨.
- **Discord live 미검증** — mock 모드는 검증됨. live 는 토큰/앱 등록 필요.
- **Vault/Obsidian 브리지 없음** — 메모리 색인/요약은 로드맵.
- **GitHub 는 링크만** — webhook 인입/자동 지문 갱신은 로드맵.
- **인프로세스 이벤트 버스** — 단일 API 인스턴스 가정. 다중 인스턴스는
  Redis/NATS fan-out 필요(로드맵).
- **인증 없음** — 로컬 운영 가정. 노출 배포 전 인증/authz 필요.
- **SQLite 단일 파일** — 동시성/규모는 Postgres 어댑터로 전환 예정(repository
  추상화는 이미 그 자리에 있음).

## 트러블슈팅

- `node:sqlite` import 실패 → Node 버전 확인(`node -v` >= 22.5).
- 포트 충돌 → `API_PORT` / 웹 `-p` 변경.
- 웹에서 API CORS 거부 → API 의 `WEB_ORIGIN` 이 웹 origin 과 일치하는지 확인.
- 상태 초기화 → `apps/api/data/*.db` 삭제(또는 `WORKSPACE_DB_PATH=:memory:`).
