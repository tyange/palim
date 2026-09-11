# 자유 배치 캔버스 — 격자 모드 3세대

격자 모드는 더 이상 "행·열에 자소 하나씩"이 아니다. **연속 좌표에 독립된 텍스트
조각(fragment)을 놓고, 조각끼리 겹칠 수 있다.** 시인이 "도화지에 점을 찍듯이" 쓸
수 있어야 한다는 요구에서 나왔다 — 이산 격자(칸 하나 = 자소 하나)로는 겹침을
원천적으로 표현할 수 없어서 모델 자체를 바꿨다. 이전 두 세대(SVG 격자, CM6 + 좌표
맵)는 `archive/discrete-grid-editor/`에 있다.

## 왜 이렇게 짓는가

핵심 질문: "IME·캐럿·undo는 브라우저한테 맡기고, 나머지는 우리가 원하는 대로"가
가능한가?

- **틀린 답(1세대의 실패)**: 캔버스 전체를 커스텀 렌더링하고 **가상 캐럿 하나**로
  전체를 흉내낸다. 캐럿·IME 조합·선택을 전부 손으로 재구현해야 하고, 정확히 이
  지점에서 실패했다(`archive/svg-grid-editor/korean-ime-bug.md`).
- **맞는 답(지금)**: 화면엔 정적 텍스트 조각들만 떠 있고, **지금 편집 중인 조각
  하나에만** 진짜 `contenteditable`을 그 좌표에 얹는다. 그 하나는 브라우저 네이티브
  IME·캐럿·클립보드를 그대로 받고, 나머지는 그냥 화면에 박힌 `<div>`다. 파워포인트·
  피그마·FigJam의 텍스트박스가 쓰는 것과 같은 패턴이다.

시안: `design-system/mockups/palim/freeform-canvas-directions.html`.

## 데이터 모델 (`stores/manuscript.ts`)

```ts
interface Fragment { id: string; x: number; y: number; text: string }
fragments: Fragment[]  // 배열 순서 = 쌓임 순서(나중 = 위)
```

- **좌표는 연속값**(px), 격자에 스냅 안 됨. `text`엔 여러 줄(`\n`)이 들어갈 수 있다.
- 진실원천이 `text`(문자열) 하나였던 이전 모델과 달리, **여기서는 `fragments`가
  독립된 진실원천**이다. 흐름 모드의 `text`와 서로 변환하지 않는다 — 겹친 두 조각을
  한 줄 평문으로 표현할 방법이 없어서 애초에 변환이 정의 안 됨(아래 "잃은 것" 참고).
  모드 토글은 그냥 두 개의 서로 다른 문서를 오갈 뿐이다.
- `core/fragments.ts` — DOM·Vue 모르는 순수 함수: `bringToFront`(배열 맨 뒤로 = 위로
  쌓기), `removeById`. 테스트(`fragments.test.ts`)는 여기 있다.

## 편집 (`components/CanvasEditor.vue`)

- **빈 곳 클릭** → 그 좌표에 빈 조각 생성 + 즉시 편집 모드.
- **기존 조각 클릭**(드래그 아님) → 편집 모드 재진입.
- **드래그** → `f.x`/`f.y` 직접 갱신. Vue가 `:key="f.id"`로 그 DOM 노드를 재사용하니
  드래그 중 `setPointerCapture`가 안 끊긴다(진짜 캔버스라면 흔한 "매 프레임 전체
  다시 그리다 캡처가 끊기는" 함정을 `v-for` diffing이 공짜로 피해준다).
- **편집 모드**: `contenteditable` 하나를 그 좌표에 올린다. `FlowEditor.vue`의
  uncontrolled textarea와 같은 이유로 **텍스트를 반응형으로 바인딩하지 않는다** —
  타이핑 중에 Vue가 다시 렌더하면 커서가 튄다. `nextTick`에서 `textContent`를 한 번만
  명령형으로 심고, `blur`/`Esc`에서만 값을 읽어 커밋한다.
- **Esc 또는 바깥 클릭**으로 커밋. 빈 텍스트로 커밋하면 조각이 삭제된다(별도 삭제
  UI 없음).
- **드래그 시 텍스트 선택 함정**: `pointerdown`에 `preventDefault()`가 없으면
  브라우저 기본 드래그-선택이 같이 시작되고, 특히 Safari에서 두드러진다. `.frag`에
  `user-select: none`(`-webkit-` 접두사 포함)도 같이 건다.

## 렌더 (`stores/manuscript.ts`의 `CANVAS` 상수)

`CANVAS.fontSize`/`lineHeight`/`fontFamily`를 편집(`CanvasEditor`)과 미리보기
(`CanvasPreview`)가 공유해 화면이 어긋나지 않는다. `fontFamily`는 흐름 모드와 같은
`--font-manuscript`(Noto Serif KR) — 더는 고정폭이 필요 없다(겹침·자유 배치엔
고정폭이 의미가 없다).

## 미리보기·내보내기 (`components/CanvasPreview.vue`)

`GridPreview.vue`와 같은 패턴(흑백 고정색 SVG + `useExport`의 SVG/PNG 저장)이지만,
칸 중앙이 아니라 **조각의 (x,y)에 그 줄들을 그대로** 찍는다. 여러 줄 조각은 줄마다
`CANVAS.lineHeight`만큼 내려가며 별도 `<text>`로. 캔버스 자체 스크롤 영역이 아니라
전체 조각의 바운딩 박스를 재서 SVG `viewBox`로 쓴다.

## 잃은 것 (알고 가는 트레이드오프)

- **평문(.txt) 내보내기 불가**: 겹친 두 글자를 같은 자리 평문으로 표현할 방법이
  없다. 이 모드의 "진짜" 산출물은 이제 텍스트가 아니라 이미지(SVG/PNG). Palim의
  "공백 하나까지 그대로 전사"라는 원래 전제와는 다른 종류의 작업이 됐다 — 배치형
  시를 "옮겨 적는" 게 아니라 "새로 짓는" 쪽에 더 맞는 모드다.
- **undo/redo 없음**: CM6가 공짜로 주던 것을 여기선 못 받는다. 지금은 구현 안 됨
  (다음 후보).
- **정렬·넛지 없음**: 방향키로 조각 옮기기, 여러 조각을 한 줄에 맞추는 정렬 명령
  등은 아직 없다.
- **모드 전환 시 내용 보존 안 됨**: `fragments`와 흐름 모드 `text`가 서로 독립이라,
  격자 ↔ 흐름을 오가도 상대 모드의 내용이 바뀌지 않는다(이전엔 같은 텍스트를 두
  모습으로 보여줬지만 이제는 애초에 변환이 안 되는 두 개의 문서다).
