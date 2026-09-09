# 렌더링과 내보내기 — 격자/흐름·스타일 토큰·export

> **⚠️ 2026-09-09 리셋**: 격자 편집 표면이 SVG 격자 + 숨은 textarea + 가상 캐럿 →
> 표준 `<textarea>`(고정폭 폰트 + `word-spacing`)로 바뀌었다. 1세대 코드는
> `archive/svg-grid-editor/`. 이 문서의 SVG 격자·칸 클릭 배치·`virtualCell` 관련 서술은
> **갱신 대기**(현재 코드와 어긋남).

격자 모드는 SVG 격자로, 흐름 모드는 SVG 텍스트 조판으로 그린다. 이 문서는 두 모드의
렌더링 방식과 스타일 토큰 규칙, 그리고 SVG/PNG 내보내기를 정리한다.

## 스타일 토큰 규칙

색을 컴포넌트에 직접 박지 않는다. `src/style.css`의 **시맨틱 토큰**만 쓴다.

- Tailwind 유틸: `bg-background` `text-foreground` `text-muted` `bg-surface`
  `border-border` `accent` …
- 토큰은 `:root`(라이트)와 `.dark`(다크)에 각각 정의되고, `@theme inline`으로 Tailwind
  유틸에 노출된다. 다크 변형은 `@custom-variant dark (&:where(.dark, .dark *))` +
  `<html>.dark` 클래스(`useColorMode` 토글)로 작동한다.
- 본문 글자는 명조(`--font-manuscript: "Noto Serif KR", serif`).

### SVG에서의 토큰

**SVG presentation 속성값엔 `var()`가 안 먹힌다.** 그래서 편집 화면 SVG 요소는 속성 대신
CSS 클래스로 칠한다(예: `.cell-rect { fill: var(--cell-bg) }`, `.cell-caret { fill: var(--cell-active) }`).

단 **내보내기 SVG/PNG는 외부 CSS 없이 동일 렌더**해야 하므로 미리보기는 흑(`#000000`)/
백(`#ffffff`) **고정색**으로 칠한다.

### 편집 화면 격자 토큰 (모노크롬)

격자 표면은 잉크 계열 무채색만 쓴다(방향 B "무한 여백" 시안):

- `--cell-bg: transparent` — 칸에 배경을 칠하지 않는다. 격자는 "종이 한 장"이 아니라
  글자가 곧 화면. `.cell-rect`는 투명 채움이라 클릭 히트 타겟으로만 남는데, 투명 fill은
  브라우저 히트테스트가 불안정하므로 **`pointer-events: all`을 명시**해 칸 클릭을 보장한다.
- `--cell-active` — 활성 칸(캐럿 위치)에 깔리는 **채워진 소프트 스퀴클**. 라이트는
  전경색 9%, 다크는 14% 알파. 테두리·글로우 없음.
- `--caret` — (예약) 소프트 블록 커서 색. 현재는 활성 칸 스퀴클이 커서 표시를 겸한다.
- 옛 `--cell-glow`/`--cell-glow-halo`(노란 hover 스퀴클)·`--grid-line`/`--grid-guide`는
  제거됐다.

## 격자 모드 (`GridEditor.vue` + `Cell.vue` / `GridPreview.vue`)

### 편집 화면 (`GridEditor.vue` + `Cell.vue`)

`gridLayout`을 받아 **자연 크기**의 SVG 격자로 그린다(`class="block"` — `w-full` 축소
없음. 좁은 화면에서는 무대가 가로 스크롤 → 칸 클릭·배치 정확성 우선). 메트릭은
`GRID.colSize`(가로 advance, 32) / `GRID.rowSize`(세로 advance, 44 — **행 간격 확대**)로
갈린다. 칸 1개는 SVG `<g role="gridcell">`로, 안에 겹쳐 그린다:

- `cell-rect` — `colSize × rowSize` 투명 사각(`fill: var(--cell-bg)` = transparent).
  **칸 테두리·배경·가이드선·외곽 프레임 전부 없다.** 클릭 히트 타겟으로만 존재.
- `cell-selected` — 드래그로 선택된 칸 반투명 하이라이트(`v-if="cell.selected"`)
- `cell-caret` — 활성 칸(조합 중 글자 또는 캐럿 위치). **채워진 소프트 스퀴클**
  (`fill: var(--cell-active)`, 글자 박스 크기 `min(rowSize-4, colSize*1.3)`,
  `rx ≈ 박스*0.32`). 테두리·글로우 없이 `caret-breathe`(opacity 1↔.5, 1.2s)로 은은히
  맥동해 커서임을 알린다.
- `cell-text` — 칸 자소(중앙 정렬, `font-size 20`)
- **포커스 모드**일 때 활성 행이 아닌 칸은 `dim: true` → `.cell-group--dim`으로
  `opacity:.28` 감광(`editor-shell.md`).

`mousedown`·`mouseenter`를 emit해 부모(`GridEditor`)의 드래그 선택에 연결한다.
`GridEditor`는 활성 셀 인덱스를 watch해 `caretmove`(SVG 내부 좌표)를 emit — 타자기
모드 스크롤용이며 캐럿·입력 모델과 무관하다(`editor-input-model.md`).

> **hover 셀 글로우 제거됨.** 이전엔 hover한 칸에 노란 스퀴클 테두리 오버레이(`.cell-glow`)
> 하나를 얹었다(FreeFrontend "Squircle with a Border on Hover", `mix-blend-mode` 틴트).
> 모노크롬 몰입 방향으로 가면서 hover 장식과 `--cell-glow`/`--cell-glow-halo` 토큰,
> `style.css`의 `mix-blend-mode` 규칙을 전부 걷어냈다. `cursor: text`만 남는다.

### 출력 (`GridPreview.vue`)

`gridLayout.cellText`를 **격자선 없이** 칸마다 글자를 그린 흰 배경 SVG. 빈 칸·공백 칸은
글자를 안 그린다. 단 **자간은 편집 화면의 칸 advance(`GRID.colSize`/`rowSize`)가 아니라
흐름 모드와 같은 글자 폭**을 쓴다 — 한 칸 가로 advance = 전각 한글 글자 폭(canvas
`measureText("가")`, 웹폰트 로드 후 재측정), 행 advance = `FLOW.lineHeight`. 공백 칸도 같은
advance를 차지해 "공백 = 글자 한 칸"으로 다중 공백 간격이 보존된다(배치형 시의 핵심). 즉
흐름 모드 같은 자연스러운 자간에 **공백만 글자 폭으로 고정**한 형태다. (편집 화면은 배치
조작 편의를 위해 칸을 더 벌려 그리므로 두 화면의 픽셀 크기는 다르고, **상대 배치**만
1:1로 일치한다.)

SVG는 자연 크기(스케일 안 함)로 그리고, 이를 **full-width 흰 박스**(`div`) 좌상단에 얹는다.
박스는 부모 폭에 꽉 차 내용 양과 무관하게 일정하고(짧은 글도 큰 박스 유지), 글자는 출력물
같은 자연 크기로 보인다. 격자 `minCols`/`minRows`가 박스 최소 크기를 보장한다. 내보내기는
이 자연 크기 SVG(글자 영역)를 그대로 직렬화/굽기한다.

## 흐름 모드 (`FlowEditor.vue` / `FlowPreview.vue`)

### 편집 (`FlowEditor.vue`)

`text`에 바인딩된 `<textarea>`. `white-space: pre-wrap`로 공백·줄바꿈을 보존하고,
`--font-manuscript`·`FLOW` 메트릭(폭·폰트·줄높이·패딩)으로 출력과 같은 모습으로 그린다.
IME·캐럿·공백은 textarea가 native로 처리하므로 격자의 숨은 textarea 장치가 필요 없다.
입력 시 `scrollHeight`로 세로 자동 확장한다(무대가 스크롤하므로 전체 높이로 자란다).
**테두리·배경 없이 투명**하게 그려 몰입 셸에 녹아든다. 캐럿 앞 `\n` 수로 현재 줄을 세어
`caretmove`(줄 번호)를 emit — 타자기 모드 스크롤용(`editor-shell.md`). 포커스 모드는 줄
단위 스타일이 안 돼 흐름 모드엔 적용하지 않는다.

### 출력 (`FlowPreview.vue`)

격자가 아니라 **일반 글**로 조판한다. 박스 폭(`FLOW.width`)에 맞춰 줄을 흘리고, 실제 `\n`
에서만 줄을 끊는다(원고지의 자동 줄넘김 개념 없음). 글자 폭은 canvas `measureText`로
측정한다. 공백은 글자처럼 그대로 유지(`white-space: pre` + `xml:space="preserve"`).

> **웹폰트 비동기 재조판**: Noto Serif KR는 비동기 로드라 로드 전 조판은 폴백(serif)
> 기준이라 줄바꿈이 틀어진다. `document.fonts.load(...)`가 끝나면 **측정 캐시를 비우고**
> 새 폰트로 다시 조판한다.

> **알아둘 한계**: 편집 textarea의 줄바꿈(CSS)과 미리보기의 줄바꿈(canvas 측정)이 긴 줄
> 끝에서 미세하게 다를 수 있다. 한국어(공백+CJK) 위주에선 사실상 일치한다.

## 내보내기 (`composables/useExport.ts`)

두 미리보기가 공유한다.

- **`exportSvgElement`**: 화면 SVG를 클론해 직렬화, `xmlns` 부여 후 `.svg`로 내려받는다.
  색·폰트를 모두 presentation 속성(inline)으로 칠해 둬 외부 CSS 없이도 동일하게 렌더된다.
- **`exportPng`**: SVG→`<img>` 경로는 샌드박스 때문에 문서에 로드된 웹폰트가 적용되지
  않는다. 그래서 같은 조판을 **문서 컨텍스트 canvas에 `fillText`로 직접 그려** 실제 폰트를
  픽셀에 굽는다. `PNG_SCALE = 3`으로 또렷하게, 클릭 시점에 `document.fonts.load`를 한 번 더
  await해 폰트 로드를 보장한다. 호출부(GridPreview/FlowPreview)가 `draw(ctx)` 콜백에서 칸
  중앙 `fillText`(격자) 또는 줄별 `fillText`(흐름)를 수행한다.

## 셸·토글 컴포넌트

- `EditorView.vue` — **전체 화면 몰입 셸**. 모드 분기(`GridEditor`/`FlowEditor`), 크롬
  숨김, 타자기 스크롤, ⌘K/⌘↵ 키를 담당한다. 미리보기는 좌우 분할이 아니라
  `PreviewOverlay`로 겹쳐 본다. 자세한 내용은 `editor-shell.md`.
- `OutlineRail.vue` — 좌측 상주 아웃라인 레일(소스 줄 목록, 클릭 시 해당 줄로 스크롤).
- `CommandBar.vue` — 하단 중앙 플로팅 알약(격자/흐름 세그먼트 + ⌘K + `ThemeToggle`).
  옛 `ModeToggle.vue`·`PaneToggle.vue`를 흡수하고 두 파일은 삭제됐다.
- `CommandPalette.vue` — ⌘K 명령 팔레트(모드·미리보기·포커스·타자기·테마).
- `PreviewOverlay.vue` — ⌘↵ 전체 화면 미리보기(`GridPreview`/`FlowPreview` 래핑).
- `ThemeToggle.vue` — `useColorMode`(auto/light/dark)로 `<html>.dark` 토글. 기본은 `auto`.
