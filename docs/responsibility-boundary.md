# 책임 경계 — 엔진 ↔ 워크스페이스

이 문서는 `yule-studio-agent`(엔진)와 `yule-agent-workspace`(워크스페이스)가
각각 **무엇을 소유하고 무엇을 소유하지 않는지** 를 못박는다. 경계가 흐려지면
상태가 두 곳에서 갈라져 silently 어긋난다.

## 한 줄 요약

> 엔진은 **실행한다**. 워크스페이스는 **상태를 소유하고 결정한다.**

## 소유권 매트릭스

| 관심사 | 엔진 (`yule-studio-agent`) | 워크스페이스 (이 레포) |
|---|:---:|:---:|
| 역할 정의 / 프롬프트 / 정책 | ✅ | — |
| provider 어댑터 / 모델 호출 | ✅ | — |
| 툴 호출 / 코드 실행 | ✅ | — |
| 단일 step 실행 (`runStep`) | ✅ | — |
| 메모리(Vault) 원천 접근 | ✅ | (요약/색인만) |
| **세션/태스크 상태** | — | ✅ |
| **상태 전이 검증** | — | ✅ |
| **승인 영속/적용** | — | ✅ |
| **토큰 예산 / 캡 / escalation** | — | ✅ |
| **모델 티어 결정(어느 step 에 어느 등급)** | — | ✅ |
| 라우팅(어느 태스크를 다음에) | — | ✅ |
| 시각화 / 대시보드 / 오피스 | — | ✅ |
| Discord/GitHub 브리지 | — | ✅ |

## 상호작용 흐름

```
워크스페이스                              엔진
   │  advance(session)                     │
   │  state=planning → step=plan           │
   │  tier=strong (예산 클램프 후)          │
   │ ───────── runStep(req) ─────────────▶ │  (단일 bounded step 실행)
   │                                       │  - 토큰 maxTokens 이하로 사용
   │ ◀──── { tokensSpent, proposedEvent,   │
   │         summary, artifacts } ───────  │
   │  budget.recordSpend(tokensSpent)      │
   │  usage.add(role, tokensSpent)         │
   │  resolveTransition(state, proposed)   │  ← 상태머신이 검증
   │  apply → awaiting_approval            │
   │  publish(session.transition, alert)   │
```

핵심 불변식:
- 엔진은 **워크스페이스 상태를 직접 바꾸지 않는다.** `proposedEvent` 를
  제안할 뿐, 적용 여부는 워크스페이스의 상태머신이 판단한다.
- 엔진이 제안한 전이가 현재 상태에서 불가능하면 워크스페이스가 거부한다
  (엔진 버그가 상태를 오염시키지 못함).
- 토큰 회계는 **워크스페이스가** 한다. 엔진은 자기가 쓴 양을 보고만 한다.

## 왜 이렇게 가르나

1. **엔진 교체/모의 가능.** `AGENT_CORE_MODE=mock` 이면 엔진 없이도 전체
   워크플로가 굴러간다(현재 MVP 의 기본). 실엔진이 준비되면 `http` 로 전환.
2. **거버넌스 일원화.** 예산·승인·전이 규칙이 한곳(워크스페이스)에 모여
   감사·복구·정책 변경이 쉽다.
3. **장애 격리.** 엔진이 죽거나 오작동해도 상태는 워크스페이스에 안전하게
   남는다.

계약 스펙은 [agent-core-contract.md](agent-core-contract.md).
