# 엔진 연결 계약 (agent-core-adapter)

코드 SoT: [`packages/agent-core-adapter/src/contract.ts`](../packages/agent-core-adapter/src/contract.ts).

워크스페이스(상태 소유)와 `yule-studio-agent`(실행자) 사이의 계약. 엔진은
워크스페이스 입장에서 stateless 하다.

## 인터페이스

```ts
interface AgentCoreAdapter {
  describe(): { mode: 'mock' | 'http'; engineUrl?: string };
  health(): Promise<AdapterHealth>;
  runStep(req: AgentStepRequest): Promise<AgentStepResult>;
}
```

### `runStep` 요청

```ts
interface AgentStepRequest {
  taskId, sessionId: string;
  role: AgentRole;
  state: SessionState;
  step: 'route' | 'plan' | 'execute' | 'review' | 'synthesize' | 'summarize';
  tier: 'triage' | 'standard' | 'strong';   // 워크스페이스가 예산 클램프 후 결정
  context: { title; description; snapshot: string | null; github: GithubLink | null };
  maxTokens: number;                          // 이 step 에서 넘으면 안 되는 상한
}
```

### `runStep` 응답

```ts
interface AgentStepResult {
  ok: boolean;
  tokensSpent: number;                  // 워크스페이스가 예산에 기록
  proposedEvent: TransitionEvent | null; // 워크스페이스가 검증 후 적용
  summary: string;                       // 감사/스냅샷용 1줄
  artifacts?: { plan?; diff?; prUrl?; branch?; note? };
  needsApproval?: boolean;
  blockedReason?: string;
}
```

## HTTP 어댑터가 기대하는 엔진 엔드포인트

`AGENT_CORE_MODE=http` 일 때 `HttpAgentCoreAdapter` 는 다음을 호출한다.

```
GET  {AGENT_CORE_URL}/health        -> { ok: boolean }
POST {AGENT_CORE_URL}/v1/run-step   -> AgentStepResult   (body = AgentStepRequest)
Authorization: Bearer {AGENT_CORE_TOKEN}   (토큰이 있으면)
```

> `yule-studio-agent` 측에 이 브리지(`/v1/run-step`)를 구현하는 것이 다음
> 마일스톤이다. 미구현이면 `health()` 가 not-ok 를 반환하고 워크스페이스는
> mock 어댑터로 안전하게 동작한다.

## 계약 불변식

1. 엔진은 워크스페이스 상태를 **직접 변경하지 않는다** — `proposedEvent`
   제안만. 적용은 워크스페이스 상태머신이 검증 후 수행.
2. 엔진은 `maxTokens` 를 초과하지 않는다. 실제 사용량을 `tokensSpent` 로 보고.
3. 제안 전이가 현재 상태에서 불가능하면 워크스페이스가 거부한다.

## mock 어댑터

`MockAgentCoreAdapter` 는 step 별 결정론적 가짜 토큰/전이를 돌려줘 상태머신·
예산·UI 를 오프라인에서 굴린다. 실제 추론은 하지 않는다. 기본 어댑터.
