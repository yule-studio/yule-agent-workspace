# 토큰 / 비용 통제 모델

코드 SoT: [`packages/core/src/cost/`](../packages/core/src/cost/). 강제 지점은
[`apps/api/src/services/workspace-service.ts`](../apps/api/src/services/workspace-service.ts).

> 원칙: **24/7 presence 는 24/7 비싼 추론이 아니다.** 일 없는 에이전트는
> 비용 0 에 머물고, 비싼 추론은 정당한 순간에만 켜진다.

## 1. 런타임 모드

| 모드 | 비용 가중 | 추론 허용 | 언제 |
|---|---:|:---:|---|
| `idle` | 0 | ✗ | 할 일 없음. 폴링/추론 0, 이벤트로만 깨어남 |
| `watch` | 1 | ✗ | 이벤트 구독. 싸구려 triage 만, 추론 LLM 호출 없음 |
| `active` | 4 | ✓ | 표준 모델 + bounded 컨텍스트로 작업 실행 |
| `heavy` | 10 | ✓ | 강한 모델 + 확장 컨텍스트. 계획/리뷰/합성 전용 |
| `human` | 2 | ✓ | 사람 대기(승인/질문/blocked) |

상태 → 모드 매핑은 `modeForState()`. 예: `planning`/`reviewing` 만 `heavy`,
나머지 작업 상태는 `active`, 승인/blocked 는 `human`, 종료/빈 작업은 `idle`.

## 2. 모델 티어 라우팅

step 종류마다 *원하는* 티어가 있고, 현재 런타임 모드가 허용하는 천장으로
**클램프** 된다(`selectTier`). 싼 모델이 라우팅/요약을, 강한 모델이 계획/리뷰를.

| step | 원하는 티어 | 비고 |
|---|---|---|
| `route`, `summarize` | triage | 분류/압축 — 가장 쌈 |
| `execute` | standard | 일반 작업 |
| `plan`, `review`, `synthesize` | strong | 실행-결정적 단계만 |

`watch` 모드는 천장이 `triage` 라 `plan` 을 요청해도 `triage` 로 클램프된다
(= 정당한 모드가 아니면 강한 모델을 못 쓴다).

## 3. 예산 / 캡

- **세션 예산** — `cap` 한도, `used` 누적. `escalationRatio`(기본 0.8) 넘으면
  escalation alert 발화. step 실행 전 `checkBudget` 으로 사전 검사.
- **일일/역할 캡** — `(일자, 역할)` 별 토큰 누계로 `checkGlobalCaps` 검사.
  일일 캡(`TOKEN_DAILY_CAP`)과 역할 캡(기본 일일/4) 둘 다 본다.
- **per-step 천장** — 한 step 이 예산을 통째로 날리지 못하게 8000 토큰 상한.
- 예산/캡 소진 시 step 을 돌리지 않고 세션을 `blocked` 로 보내고 critical
  alert 를 띄운다(운영자 리뷰 대기).

## 4. 재분석 회피 (지문)

- `fingerprintDiff` / `fingerprintIssue` — 입력을 정규화 해시(공백/휘발성
  헤더 무시). 세션에 저장된 지문과 같으면 직전 분석이 유효 → 재분석 skip.
- `needsReanalysis(prior, next)` 로 변경 없는 diff/issue 의 비싼 재추론을 막는다.

## 5. 컨텍스트 압축 (스냅샷)

- `buildSnapshot` — 최근 전이를 결정론적으로 요약(LLM 없음, 비용 0). 깨어날
  때 전체 이력/Vault 를 다시 읽지 않고 스냅샷을 먼저 본다 → 기본 컨텍스트
  창을 bounded 하게 유지. 필요할 때만 full 로 확장한다.
- 더 풍부한 요약이 필요하면 `synthesize` step 으로 교체(그럴 가치가 있을 때만).

## 6. 이벤트 구동 (폴링 금지)

상태 변화는 이벤트로 push 된다. 웹/브리지는 SSE 구독으로만 갱신하고
폴링하지 않는다. SSE 하트비트는 고정 타이머(토큰 0), LLM 루프가 아니다.

## 회귀 테스트

[`packages/core/test/cost.test.ts`](../packages/core/test/cost.test.ts) —
예산 허용/차단/escalation, 모드 선택, 티어 클램프, diff 지문.
