# 격자 에디터 — CodeMirror 6

격자 모드 편집 표면(`src/components/GridEditor.vue`)은 **CodeMirror 6**다.

## 왜 CM6

바닥부터 만들었다가 두 번 벽에 부딪혔다:

1. **SVG 격자 + 숨은 1px textarea + 가상 캐럿**(`archive/svg-grid-editor/`) — 브라우저가
   공짜로 주는 캐럿·IME·선택·undo를 전부 재구현. 본문 소실, 클릭 시 캐럿이 맨 앞으로 튐,
   IME 조합 중 자모 탈락.
2. **순수 `<textarea>`**(커밋 `1f4c0a4`) — 편집은 되지만 격자를 도구로 키우기엔 hacky.

격자 모드는 본질적으로 **모노스페이스 텍스트 버퍼 + 캐럿**이고 CM6의 모델과 1:1이다:
`state.doc`가 그냥 문자열 = Palim의 `text` 진실원천(공백·줄바꿈이 곧 2D 배치). 트리도
스키마도 없다. CM6은 CJK/한국어 IME를 제대로 처리하고 undo/redo·선택·클립보드가 내장.

> headless UI(Reka)엔 텍스트 편집 프리미티브가 없다. "Reka로 만든 에디터"는 결국
> 위 1번 커스텀 코드와 같다 — 그래서 편집 표면만은 CM6.

## 패키지

`@codemirror/state` + `@codemirror/view` + `@codemirror/commands`만. `codemirror`
메타패키지(`basicSetup`)는 줄번호·폴딩·문법 하이라이트·자동완성 등 시에 불필요한 걸
끌고 와서 안 쓴다. 익스텐션은 손으로 조립: `history()`, `keymap.of([...defaultKeymap,
...historyKeymap])`, `drawSelection()`, `updateListener`, `theme`.

## 통합 (`GridEditor.vue`)

- **grow + 바깥 스크롤**: `EditorView.theme`에서 `"&"{height:auto}` + `.cm-scroller
  {overflow:visible}`. CM6이 내용만큼 자라고 스크롤은 `EditorView.vue`의 무대(`stageRef`,
  세로·가로 둘 다)가 한다. `.cm-scroller`는 한 축만 스크롤 불가라(CSS) grow 모델이 맞다.
- **테마 메트릭 = `GRID` 필수**. `.cm-content`의 `fontSize`·`lineHeight`·`padding`을
  `stores/manuscript.ts`의 `GRID.fontSize/lineHeight/padY/padX`와 정확히 맞춰야
  `EditorView.vue`의 `centerOn`/`onJump` 기하(`line * lineHeight + padY`)가 그대로 맞는다.
- **`word-spacing: 0.5em`** — 고정폭 CJK 폰트(`Nanum Gothic Coding`)에서 공백이 한글의
  반칸이라, 소스의 "공백 1 = 칸 1"이 눌린다. 이걸로 공백 총폭을 한 칸에 맞춘다(한글 위주
  시 기준; 라틴·숫자 혼용은 여전히 어긋남, 데이터는 항상 정확). **CM6은 실제 렌더된 DOM을
  측정**하므로 `word-spacing`이 있어도 캐럿 좌표가 정확하다(클릭 위치 = 삽입 위치).
- **`text` ↔ 에디터 동기화**:
  - CM6 → store: `updateListener`에서 `u.docChanged && !applyingExternal`이면
    `text.value = u.state.doc.toString()`.
  - store → CM6: `watch(text, v => …)`에서 `v !== view.state.doc.toString()`일 때만
    전체 교체 `dispatch`. 모드 토글 왕복 등 외부 변경용.
  - **에코 가드**: `applyingExternal` 플래그 — `watch`가 dispatch하기 직전 true,
    직후 false. `dispatch`가 동기라 updateListener도 그 안에서 동기 호출되므로 안전.
- **타자기 모드**: `updateListener`에서 현재 줄
  (`u.state.doc.lineAt(head).number - 1`)을 `caretmove`로 emit → `EditorView.vue`의
  `onCaretLine`이 `typewriter`일 때 무대를 스크롤. (SVG 시절 표시 전용 훅 그대로)
- 색은 토큰: `caretColor`·`.cm-cursor` = `var(--foreground)`, 선택 배경 =
  `color-mix(in srgb, var(--accent) 22%, transparent)`. CM6 theme 값은 임의 CSS
  문자열 허용.
- 마운트: `onMounted`에 `new EditorView({parent, state})` + `view.focus()`.
  `onBeforeUnmount`에 `view.destroy()`.
- **`.cm-content` shrink-wrap**: CM6 기본이 `.cm-content { flex-grow: 2 }`라 무대 폭
  전체로 늘어난다(활성 줄 밴드·격자가 1400px+로 뻗음). 테마에서 `flexGrow:0` +
  `flexShrink:0` + `width:max-content`로 내용 폭에 맞춘다. 넓은 시는 무대가 가로 스크롤.

## 격자선 (`src/editor/gridLines.ts`)

CM6 `layer()` 익스텐션. 세로·가로선을 `RectangleMarker`(1px div)로 그린다.

- **하드코딩 금지 — 실측에서 뽑는다**:
  - 칸 폭 = 첫 한글 위치의 `coordsAtPos(p)`와 `coordsAtPos(p+1)` x 차 (렌더된 실제
    advance. `word-spacing` 포함해 정확. 폴백 `defaultCharacterWidth * 2`).
  - 원점 = `coordsAtPos(0)`를 `scrollDOM` 기준 좌표로 변환(`RectangleMarker`의
    left/top이 그 좌표계).
  - 행 높이 = `view.defaultLineHeight`.
- **재계산**: `layer.update`가 `geometryChanged || docChanged || viewportChanged`에
  true 반환 → CM6 measure 사이클에서 markers 재생성. 폰트 크기 변경·웹폰트 스왑·줌에
  전부 따라간다(이게 CSS 하드코딩 그라디언트를 안 쓴 이유).
- 색: `.cm-grid-col, .cm-grid-row { background: var(--grid-line) }` (라이트/다크 토큰).
  `.cm-grid-layer { pointer-events: none }`.

활성 줄: `highlightActiveLine()` + `.cm-activeLine { background: color-mix(...
--foreground 4% ...) }`.

## 아직 없는 것 (다음 단계)

- **반각 문자 격자 정렬**: 라틴·숫자는 ½칸이라 순한글 아닌 줄에서 어긋난다. 반각 런에
  `Decoration.mark` + `letter-spacing`(+ 트레일링 보정)으로 1칸 advance 강제 예정.
  트레이드오프: `2026`이 `2 0 2 6`처럼 벌어져 보임 → 켤지 말지 옵션.
- 활성 "칸" 박스(현재 칸 하이라이트), "빈 2D 공간 클릭 → 그 자리 캐럿"(SVG 시절 차별점 —
  `domEventHandlers.mousedown` + `posAtCoords` + `dispatch`로 공백·줄바꿈 삽입 복원 가능).
- 흐름 모드는 계속 plain `<textarea>`(`FlowEditor.vue`).
