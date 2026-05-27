# Claude Code Prompt: Rebuild Pixel Office From `office-shell-floorplan-v2`

Pixel Office 방향을 다시 고정합니다.

이전 정책, 이전 building/floor 구조, 이전 sidebar/dashboard UI, 이전
랜덤 배치 방식은 모두 버리고 새로 구성해 주세요. 이번 기준 이미지는
하나입니다.

```txt
assets-src/yule-workspace-motion/references/office-shell-floorplan-v2.png
```

`building-facade.png`, `office-shell-floorplan.png`,
`office-shell-floorplan-v2.png` 중 더 이상 선택하지 않습니다.
`office-shell-floorplan-v2.png`가 단일 source of truth입니다.

혼선을 막기 위해 기존 두 파일은 deprecated로 옮겨져 있습니다.

```txt
assets-src/yule-workspace-motion/references/deprecated/building-facade-deprecated.png
assets-src/yule-workspace-motion/references/deprecated/office-shell-floorplan-deprecated.png
```

이 deprecated 파일들은 구현 기준으로 쓰지 마세요.

## 1. Product Direction

`/office`는 더 이상 운영 대시보드가 아닙니다.

목표는 하나의 고퀄리티 픽셀 오피스 층입니다.

```txt
Yule Agent Lab
```

이 화면은 agent들이 실제 사무실에서 일하고, 앉고, 움직이고, 대화하고,
회의하고, 리뷰하고, 승인 대기하는 game-like workspace여야 합니다.

기존처럼 dashboard card, chart, large inspector, multi-floor navigation 위에
픽셀 배경을 붙이는 방식은 실패입니다.

## 2. Use Only The Canonical Layout Source

반드시 아래 파일을 기준으로 맵을 다시 구성하세요.

```txt
assets-src/yule-workspace-motion/references/office-shell-floorplan-v2.png
```

이 파일을 기준으로:

- 방 구조
- 벽 구조
- 문 위치
- 복도 동선
- 사무실 구역
- 책상/회의/리뷰/승인 공간의 전체 방향성

을 결정하세요.

주의:

- `building-facade.png`를 사용하지 마세요.
- `office-shell-floorplan.png`를 사용하지 마세요.
- 기존 Tiled map의 이상한 벽/복도/방 배치를 유지하지 마세요.
- 기존 배치 위에 새 가구를 얹지 마세요.
- 새 `office-shell-floorplan-v2.png`를 기준으로 재구성하세요.

## 3. Remove Old UI Chrome

현재 화면의 가장 큰 문제 중 하나는 UI가 맵을 방해한다는 점입니다.

기본 화면에서 제거하거나 숨기세요.

- 왼쪽 vertical sidebar
- building/floor 탭
- 큰 floating menu
- 큰 right inspector
- dashboard metrics/cards/charts
- floor/team tabs가 맵 위를 가리는 구조
- 메뉴가 사무실 오브젝트를 덮는 구조

남길 수 있는 UI는 작고 가벼워야 합니다.

- 작은 top HUD
  - KST time
  - active agent count
  - zoom
  - follow active
- agent 클릭 시 작은 context menu
  - Assign Task
  - New Session
  - Session History
  - Stop Task
  - View Details

맵이 제품입니다. UI chrome이 주인공이 되면 안 됩니다.

## 4. Rebuild The Floor, Do Not Patch It

현재 결과물은 정수기, 선반, 벽, 메뉴, 책상이 뒤죽박죽입니다.
이건 에셋 문제가 아니라 layout policy가 없는 문제입니다.

이번 작업에서는 기존 floor layout을 부분 수정하지 말고,
`office-shell-floorplan-v2.png` 기준으로 한 층을 다시 짜세요.

금지:

- 정수기를 모든 방에 랜덤하게 배치
- 서버랙/화분/선반/프린터를 목적 없이 흩뿌리기
- 이상한 줄무늬 벽/두꺼운 회색 통로 만들기
- 방을 색깔만 다른 큰 사각형으로 나누기
- 책상이 서로 멀리 떨어져 있는 구조
- agent가 벽, 문, 책상 위에 떠 있는 배치
- 큰 빈 바닥을 타일만 반복해서 채우기

모든 오브젝트는 “왜 거기에 있는지”가 보여야 합니다.

예:

- water cooler: 복도 끝, 휴게 공간, 회의실 근처
- server rack: Ops/Review zone 또는 장비 벽면
- bookshelf: 벽면에 붙임
- plant: 문 옆, 창가, 코너, 라운지
- printer: 사무실 벽면 또는 공용 복도
- whiteboard: 회의실/리뷰룸/팀장실 벽면

## 5. Desk Pods Are The First Priority

이번 단계에서 가장 먼저 고쳐야 할 것은 책상입니다.

현재 책상은 떨어져 있고, 방향도 섞이고, workstation처럼 보이지 않습니다.
레퍼런스처럼 붙어 있는 desk pod/cubicle cluster로 재구성하세요.

사용할 desk references:

```txt
assets-src/yule-workspace-motion/references/desk-ai-engineer-backend-devops.png
assets-src/yule-workspace-motion/references/desk-analyst-product-designer.png
```

책상 구성 규칙:

- 2x2, 2x3, 3x2 형태의 붙은 desk pod를 만든다.
- 책상 사이에는 shared partition이 있다.
- 책상 앞/뒤 방향을 구분한다.
- front desk를 회전해서 back desk처럼 쓰지 않는다.
- front/back/side sprite를 별도로 사용하거나 제대로 파생시킨다.
- 모니터, 키보드, 마우스, 노트, 컵, 케이블, 스티키노트를 포함한다.
- 책상 다리, 앞면 lip, side edge, contact shadow가 있어야 한다.
- chair는 책상과 붙어 있어야 하며 떠 보이면 안 된다.
- desk pod 사이 간격은 너무 넓지 않게 한다.

방향 규칙:

- 의자가 아래에 있는 책상: agent는 위쪽 책상/모니터를 바라본다.
- 의자가 위에 있는 책상: agent는 아래쪽 책상/모니터를 바라본다.
- 반대편 책상은 2D 회전이 아니라 front/back 관점이 바뀐 sprite여야 한다.
- 모니터 화면/뒷면, 키보드 위치, agent 방향이 서로 맞아야 한다.

## 6. Seated Work Motion

standing character를 의자 근처에 올려놓는 방식은 금지입니다.

사용할 최신 seated references:

```txt
assets-src/yule-workspace-motion/references/seated-desk-motion-01.png
assets-src/yule-workspace-motion/references/seated-desk-motion-02.png
assets-src/yule-workspace-motion/references/seated-desk-motion-03.png
assets-src/yule-workspace-motion/references/seated-desk-motion-04.png
```

상태별 배치:

- coding/running/reading: 자기 책상에 앉은 작업 pose
- planning: planning/product board 근처
- reviewing: review room/table
- meeting: 같은 groupId끼리 같은 standup/meeting zone
- awaiting_approval/waiting: Tech Lead / Human Approval zone
- blocked: Tech Lead 근처 또는 urgent bubble
- idle: desk, lounge, water cooler, bookshelf 주변

agent가 책상에서 일할 때:

- chair, body, desk, monitor, keyboard가 한 workstation처럼 맞아야 한다.
- agent가 책상 위에 서 있거나 떠 있으면 실패다.
- seated pose는 desk orientation과 일치해야 한다.

## 7. Door Motion And Room Boundaries

사용할 door reference:

```txt
assets-src/yule-workspace-motion/references/door-motion.png
```

문은 정적 장식이 아니라 room transition 요소여야 합니다.

요구:

- door closed/open frames를 atlas로 추출
- Tiled object/POI에 door 위치 정의
- agent가 방에 들어갈 때:
  - door 앞까지 이동
  - open animation
  - 통과
  - close animation
- wall collision을 문 위치와 연결
- Tech Lead Office, Review Room, Meeting/Standup Room에는 문 사용

## 8. Room/Zones

`office-shell-floorplan-v2.png`를 기준으로 하나의 층 안에 구역을 만드세요.
단, 색깔만 다른 방을 만들지 마세요. 각 구역은 가구와 소품으로 목적이
보여야 합니다.

권장 구역:

- Main Engineering Pod
  - 가장 큰 desk pod
  - 개발/AI agent들이 주로 일하는 공간
- Product / Planning Area
  - product desk, planning board, design/prototype monitor, bookshelf
- Review / Ops Area
  - review desk/table, CI monitor, server rack, deploy board
- Tech Lead / Human Approval Office
  - tech lead desk
  - assistant/visitor chair
  - approval board
  - 문 모션
- Standup / Chat Zone
  - 작은 테이블
  - 말풍선 중심 공간
- Utility Wall
  - water cooler, printer, shelf, documents

## 9. Agent Source And Placement

agent를 8개로 하드코딩하지 마세요.

yule-studio-agent registry/source를 기준으로 동적으로 agent 목록을 읽고,
role/title/capability/metadata에 따라 한 층 안에 배치하세요.

규칙:

- 모든 agent는 같은 `Yule Agent Lab` 맵 안에 존재한다.
- `metadata.zone`, `metadata.desk`, `metadata.seat`가 있으면 우선한다.
- 없으면 role/capability 기반으로 자동 배치한다.
- 알 수 없는 agent는 General Studio/overflow desk에 배치한다.
- 같은 groupId/sessionId의 meeting agent는 같은 테이블/standup zone에 모인다.
- seat allocation으로 agent끼리 겹치지 않게 한다.

## 10. Tiled / Phaser Structure

가능하면 Phaser 3 + Tiled tilemap 구조로 구현하세요.
현재 canvas/Tiled loader를 유지하더라도 Phaser로 교체 가능한 구조로
분리하세요.

권장 layer:

```txt
floor
walls
doors
furniture_under
desks
props
agents
overhead
collisions
pois
spawns
```

오브젝트 위치는 코드에서 랜덤 생성하지 말고 Tiled map 또는 명시적인
placement manifest에 두세요.

권장 파일:

```txt
apps/web/src/office/GameOffice.tsx
apps/web/src/office/game/AgentLabScene.ts
apps/web/src/office/game/assetManifest.ts
apps/web/src/office/game/placement.ts
apps/web/src/office/game/speech.ts
apps/web/src/office/game/timeOfDay.ts
apps/web/src/office/game/weather.ts
apps/web/public/vendor/yule-office/yule-agent-lab.tmj
apps/web/public/assets/yule-office/
```

## 11. Time / Weather

KST 기준 time-of-day를 유지하세요.

사용할 references:

```txt
assets-src/yule-workspace-motion/references/time-of-day-backgrounds.png
assets-src/yule-workspace-motion/references/time-of-day-building.png
assets-src/yule-workspace-motion/references/weather-clear-elements.png
assets-src/yule-workspace-motion/references/weather-rain-snow-cloud-elements.png
```

다만 이번 우선순위는 내부 사무실 floor 완성입니다.
weather/time은 작은 창문 분위기나 top HUD 정도로만 반영하고, 맵을
가리지 마세요.

## 12. Acceptance Criteria

아래를 만족해야 완료입니다.

- `/office`가 sidebar/dashboard 없이 `Yule Agent Lab`으로 바로 열린다.
- `office-shell-floorplan-v2.png`만 layout source of truth로 사용한다.
- `building-facade.png`, `office-shell-floorplan.png`를 기준으로 쓰지 않는다.
- 정수기/서버랙/선반/화분이 랜덤하게 흩어져 있지 않다.
- 이상한 줄무늬 벽/의미 없는 두꺼운 복도가 사라진다.
- 책상이 서로 떨어져 있지 않고 desk pod/cubicle cluster로 붙어 있다.
- desk front/back 방향이 맞고, monitor/keyboard/chair/agent 방향이 맞다.
- seated motion sheet를 사용해 agent가 실제로 앉아 일하는 것처럼 보인다.
- door-motion을 사용해 방 출입 모션 또는 최소한 animated door sprite가 있다.
- agent는 yule-studio-agent registry/source 기반으로 동적으로 배치된다.
- 전체 결과가 dashboard가 아니라 agent-town/Gather 스타일의 living pixel office처럼 보인다.

중요:
이번 작업은 기존 맵을 조금 수정하는 작업이 아닙니다. 기존 정책을 폐기하고,
`office-shell-floorplan-v2.png` 하나를 기준으로 `Yule Agent Lab` 한 층을
처음부터 정리해서 만드는 작업입니다.
