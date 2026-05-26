# Discord 격하 전략

코드: [`apps/discord-bot/`](../apps/discord-bot/).

> Discord 는 더 이상 워크플로의 진실원천이 아니다. **사람 대화 + 승인 +
> 알림** 표면으로 격하된다. 상태는 워크스페이스 API 에만 존재한다.

## Before / After

| | 이전 (Discord 중심) | 이후 (workspace 중심) |
|---|---|---|
| 상태 저장소 | Discord 메시지/카드 | 워크스페이스 SQLite (SoT) |
| 워크플로 엔진 | Discord 핸들러 | `WorkspaceService` 상태머신 |
| 승인 | 메시지 reaction/회신 | API 에 영속되는 `ApprovalRecord` |
| 알림 | 핸들러가 직접 발송 | API 가 alert 이벤트 발행 → 브리지가 포워딩 |

## 브리지가 하는 일

### 인바운드 (Discord → 워크스페이스)
슬래시 커맨드(또는 mock 모드 stdin)를 받아 **API 호출** 로 변환한다.
- `task <role> <title>` — 태스크 생성 + 첫 게이트까지 진행
- `status` — 워크스페이스 스냅샷
- `summary` — 지금 사람이 봐야 할 것
- `session <id>` — 세션 조회
- `approve|changes|reject <id> [note]` — 승인 결정(영속)

### 아웃바운드 (워크스페이스 → Discord)
API 의 SSE `alert` 이벤트를 구독해 채널(또는 stdout)로 포워딩한다.
필요한 아웃바운드 신호는 전부 워크스페이스 서비스가 alert 로 발행한다:
- 새 태스크 수락 / blocked / 승인 필요 / PR·ready_to_merge / 배포·done / 실패

### 중복 방지 (dedup)
중복 방지는 **소스(API)에서** 처리한다. alert 이벤트는 `dedupeKey` 를 갖고
`events` 테이블에 한 번만 저장된다(예: `approval:<sessionId>`). 같은 승인
요청이 두 번 발행돼도 두 번째는 저장/브로드캐스트되지 않으므로 브리지가
스팸을 보내지 않는다.

## 브리지는 상태를 보유하지 않는다

브리지 프로세스에는 DB 도, 캐시된 워크플로 상태도 없다. 죽었다 살아나도
API 에서 다시 읽으면 그만이다. 이것이 "Discord 가 SoT 가 아니다" 의 구체적
의미다.

## 모드

- **mock 모드** (`DISCORD_TOKEN` 빈값) — stdin REPL + stdout 알림. 토큰/앱
  등록 없이 오프라인으로 전체 인/아웃바운드를 시연/검증할 수 있다.
- **live 모드** (토큰 있음) — `discord.js` lazy import, 슬래시 커맨드가 mock
  과 **동일한** `runCommand` 를 재사용하고 alert 를 채널로 포스트한다.

> 주의: live 경로는 실제 봇 토큰 + 등록된 앱이 필요하며 본 MVP 에서는 실
> Discord 연결로 검증되지 않았다. 코드는 "코드 변경이 아니라 설정" 으로 켤
> 수 있게 구조화돼 있다.
