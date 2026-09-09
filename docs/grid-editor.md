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

## 아직 없는 것 (다음 단계)

격자선(시각 그리드), 활성 칸/행 하이라이트, "빈 2D 공간 클릭 → 그 자리에 캐럿"(SVG
시절 차별점 — CM6에선 `domEventHandlers.mousedown` + `posAtCoords` + `dispatch`로
공백·줄바꿈 삽입해 복원 가능). 흐름 모드는 계속 plain `<textarea>`(`FlowEditor.vue`).
