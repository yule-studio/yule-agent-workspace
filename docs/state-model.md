# 정규 세션 상태머신

코드 SoT: [`packages/shared-types/src/states.ts`](../packages/shared-types/src/states.ts)
(상태/전이 데이터) + [`packages/core/src/state-machine.ts`](../packages/core/src/state-machine.ts)
(전이 로직). 이 문서는 사람용 설명이다.

## 상태 (13)

```
draft → queued → planning → awaiting_approval → approved → executing
   → reviewing → ready_to_merge → deploying → done
                            ↘ blocked ↘ failed ↘ abandoned
```

| 상태 | 의미 | 비용 모드 |
|---|---|---|
| `draft` | 생성됨, 아직 큐에 안 들어감 | watch |
| `queued` | 처리 대기 | watch |
| `planning` | 계획 수립/수정 중 | **heavy** |
| `awaiting_approval` | 사람 승인 대기 | human |
| `approved` | 승인됨, 실행 직전 | active |
| `executing` | 작업 수행 중 | active |
| `reviewing` | diff/머지 판단 중 | **heavy** |
| `blocked` | 입력/외부 의존으로 막힘 | human |
| `ready_to_merge` | 리뷰 통과, 머지 판단 대기 | active |
| `deploying` | 배포 중 | active |
| `done` | 완료 (terminal) | idle |
| `failed` | 실패 | watch |
| `abandoned` | 폐기 (terminal) | idle |

## 전이 (명명된 이벤트)

전이는 목표 상태가 아니라 **이벤트** 로 발화한다. 같은 목표라도 이유가
다르면 다른 이벤트로 남아 감사 로그가 의미를 갖는다.

`submit · pick_up · plan_ready · approve · request_changes · start_execution ·
submit_for_review · review_passed · block · unblock · merge · deploy_succeeded ·
complete · fail · retry · abandon`

전체 (from, event → to) 표는 `states.ts` 의 `TRANSITIONS` 배열이 SoT.

## 핵심 규칙 (요구사항 매핑)

1. **태스크당 정규 세션 1개** — `workItemKey` 가 있으면 `createTask` 는
   기존 태스크를 반환(중복 생성 안 함). 활성 세션은 DB partial-unique index
   (`WHERE closed_at IS NULL`)로 최대 1개 강제.
2. **멱등 재진입** — 이미 도달한 상태로 데려가는 이벤트는 성공 no-op 으로
   처리(에러 아님). 예: `queued` 에서 `submit` 재발화 → idempotent.
3. **폐기 세션 부활 금지** — `done`/`abandoned` 는 terminal. 모든 외부 전이를
   거부한다. 계속하려면 **새 세션** 을 열어야 한다.
4. **승인 영속** — 승인/거부 결정은 세션에 저장되어 재시작/재진입에도 살아남고,
   그에 맞춰 실행이 전이된다.
5. **block/unblock 복원** — `block` 진입 시 직전 상태를 `priorState` 에 기록,
   `unblock` 은 정확히 그 단계로 되돌린다.
6. **이력 질의** — 태스크의 모든 세션 + 각 세션의 전이 타임라인을 워크스페이스
   UI/`api/sessions/:id` 에서 조회 가능.

## 사람/정책 게이트 (자동 통과 금지)

`advance`/`runToGate` 루프는 다음에서 **멈춘다**: `awaiting_approval`(승인),
`blocked`(입력), `ready_to_merge`(머지 결정), `draft`. 특히 `ready_to_merge`
에서 자동 머지하지 않는 것은 의도된 정책이다(사람 결정 보존).

## 회귀 테스트

[`packages/core/test/state-machine.test.ts`](../packages/core/test/state-machine.test.ts)
— 라이프사이클 walk, terminal guard, 멱등, block/unblock round-trip, 도입부 helper.
`npm test` 로 실행.
