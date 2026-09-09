# 격자 에디터 — CodeMirror 6 + 패딩된 직사각형

격자 모드 편집 표면(`src/components/GridEditor.vue`)은 **CodeMirror 6**이고, 문서를
**직사각형으로 패딩**해 어디든 좌표로 배치할 수 있게 한다.

## 왜 CM6

바닥부터 만들었다가 두 번 벽에 부딪혔다:

1. **SVG 격자 + 숨은 1px textarea + 가상 캐럿**(`archive/svg-grid-editor/`) — 브라우저가
   공짜로 주는 캐럿·IME·선택·undo를 전부 재구현. 본문 소실, 캐럿 튐, IME 자모 탈락.
2. **순수 `<textarea>`**(커밋 `1f4c0a4`) — 편집은 되나 격자 도구로 키우기 hacky.

격자 모드는 본질적으로 **모노스페이스 텍스트 버퍼 + 캐럿**이고 CM6의 모델과 1:1이다:
`state.doc`가 그냥 문자열 = Palim의 `text` 진실원천(공백·줄바꿈이 곧 2D 배치). CM6은
CJK/한국어 IME를 제대로 처리하고 undo/redo·선택·클립보드가 내장.

> headless UI(Reka)엔 텍스트 편집 프리미티브가 없다 — 그래서 편집 표면만은 CM6.

## 패키지

`@codemirror/state` + `@codemirror/view` + `@codemirror/commands`만. `codemirror`
메타패키지(`basicSetup`, 줄번호·폴딩·문법 하이라이트 등)는 안 쓴다. 익스텐션은 손으로:
`history()`, `keymap(default+history)`, `drawSelection()`, `highlightActiveLine()`,
`updateListener`, `theme`.

## 좌표로 자유 배치 — 패딩된 직사각형

시인은 "여기서 12칸 오른쪽, 2줄 아래"처럼 **위치를 계산**해 활자를 놓는다. 스페이스를
직접 세지 않는다.

- 에디터가 든 문서는 **항상 직사각형**: 모든 줄을 `(최장 줄 + MARGIN_COLS)` 폭으로 뒤에
  공백 패딩 + 아래에 `MARGIN_ROWS`(12)개의 전폭 공백 줄. `src/core/rect.ts`의 `padRect`.
- 그래서 **모든 (행, 열)이 이미 진짜 문서 위치**(=공백)다. 빈 공간 클릭·방향키 이동이
  전부 **CM6 네이티브** — 가로채기 코드 0, IME·undo 안전(캐럿이 늘 실제 위치).
- 타이핑하면 그 자리 공백이 글자로 대체된다.
- **`text` 진실원천은 깨끗하게 유지**: 에디터→스토어 동기화 때 `trimRect`(줄 끝 공백,
  끝의 빈 줄 제거). 흐름 모드·`GridPreview`·내보내기는 이 clean 문자열을 본다.
- 우하단에 `R:C` 좌표 배지(`doc.lineAt(head)`).

## 동기화 (`GridEditor.vue`)

- **에디터 → 스토어**: `updateListener`에서 `docChanged && !internal`이면
  `text.value = trimRect(doc)`.
- **스토어 → 에디터**: `watch(text)`에서 `trimRect(doc) !== v`일 때만
  전체 교체 `dispatch({insert: padRect(v)})`. 모드 토글 왕복 등 외부 변경용.
  에코 판별은 플래그가 아니라 **값 비교**(`watch`는 비동기라 플래그가 경계를 못 넘는다).
- **재패딩(`repad`)**: 타이핑이 오른쪽/아래로 뻗으면 직사각형을 키운다.
  `requestAnimationFrame`으로 디바운스, **추가(append)만** 하고 줄이지 않으며
  (커서 안전), `Transaction.addToHistory.of(false)`로 undo 스텝에 안 남긴다.
  줄이는 정규화는 다음 `watch(text)` 왕복이 `padRect` 전체 교체로 처리.
- `internal` 플래그: 우리가 낸 `dispatch` 동안 `updateListener`가 스토어로 되쏘지
  않게. `dispatch`는 동기라 안전.

## 렌더 (`EditorView.theme`)

- 메트릭 = `stores/manuscript.ts`의 `GRID`(fontSize/lineHeight/padY/padX)와 일치 →
  `EditorView.vue`의 `centerOn`/`onJump` 기하(`line*lineHeight + padY`)가 그대로 맞는다.
- `word-spacing: 0.5em` — 고정폭 CJK 폰트에서 공백이 한글의 반칸이라, 공백 N개가
  N칸으로 보이게 보정(한글 위주 기준; 라틴·숫자는 여전히 ½칸). CM6이 실 DOM을 측정하므로
  캐럿 좌표는 정확.
- grow + 무대 스크롤: `"&"{height:auto}` + `.cm-scroller{overflow:visible}`.
- **shrink-wrap**: CM6 기본 `.cm-content{flex-grow:2}`를 `flexGrow:0`+`width:max-content`로
  덮어 콘텐츠가 무대 폭 전체로 안 뻗게.
- **커서 시인성**: 큰 빈 벌판에서 캐럿을 놓치지 않도록, 네이티브 캐럿은 숨기고
  (`.cm-content{caret-color:transparent}`) `drawSelection()`의 `.cm-cursor`를
  `border-left: 2px solid var(--accent)` + `box-shadow: 0 0 6px accent/70%`로 그린다.
- 선택 배경 = `color-mix(--accent 22%)`. **활성 줄 밴드는 없다**(피드백으로 제거).

## 에디터 프레임 (`.editor-frame`)

에디터 박스는 `repad`로 계속 자라므로 유저가 그 범위를 인지하기 어렵다. 전체 테두리
선은 "촌스럽다"는 피드백 → 대신 두 가지 은근한 신호를 겹친다(둘 다 선이 아님):

- **면 틴트**: 배경을 `color-mix(--foreground 2.5%, transparent)`로 아주 옅게 깔아
  "작업면"을 페이지와 분리.
- **크롭 마크**: 네 모서리에 L자 틱(가로·세로 각 14px, `color-mix(--foreground 28%)`).
  `linear-gradient` 8겹을 `background-position` `0 0`·`100% 0`·`0 100%`·`100% 100%`에
  `no-repeat`로 놓아 그린다. 위치가 `%`라 박스가 커지면 마크도 모서리에 붙어 따라간다.

`.editor-frame`은 `width: max-content` + `padding: 12px`로 CM6 콘텐츠를 감싼다. 색은
전부 `--foreground` 토큰 파생이라 라이트/다크가 자동 대응.

**높이는 패딩된 직사각형 전체가 아니라 마지막 내용 줄까지만.** `padRect`가 아래에
붙이는 `MARGIN_ROWS`(12)개 빈 줄까지 틴트·마크로 감싸면 세로로 너무 넓다. 그래서
`frameH = trimRect(doc) 줄 수 * GRID.lineHeight + GRID.padY*2 + 12`(마지막 줄 아래
약 16px 여백)를 `docChanged`마다 재측정해 `.editor-frame`에 인라인 `height`로 건다.
`box-sizing: border-box` + `overflow: visible`이라 CM6 호스트(직사각형 전체 높이)는
프레임 아래로 그냥 넘쳐 흐르고 클릭·방향키도 그대로 — 프레임은 순수 시각 장식이다.

## 순수 함수 (`src/core/rect.ts` + 테스트)

- `trimRect(s)` — 줄 끝 공백·탭 제거, 끝의 빈 줄 제거(최소 1줄 유지).
- `padRect(s, marginCols=8, marginRows=12)` — 내부에서 `trimRect` 후 직사각형 패딩.
  `trimRect(padRect(x)) === trimRect(x)`, `padRect(padRect(x)) === padRect(x)`(멱등).

## 아직 없는 것

- **격자선(시각 그리드)** — CM6 `layer()` + 실측(`coordsAtPos`)으로 그렸다가
  "너무 직사각형" 피드백으로 걷어냈다(커밋 `d250cdd` → 이 커밋에서 제거). 다시 넣으면
  옅고 정사각에 가깝게.
- **반각 문자 정렬** — 라틴·숫자 ½칸. 반각 런에 `Decoration.mark` + `letter-spacing`으로
  1칸 강제 가능(트레이드오프: `2026`이 벌어져 보임).
- 활성 "칸" 박스. 흐름 모드는 계속 plain `<textarea>`(`FlowEditor.vue`).
