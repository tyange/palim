# 렌더링과 내보내기 — SVG 그리드·스타일 토큰·export

에디터 격자와 미리보기는 모두 SVG로 그린다. 이 문서는 그 렌더링 방식과 스타일 토큰
규칙, 그리고 SVG/PNG 내보내기를 정리한다.

## 스타일 토큰 규칙

색을 컴포넌트에 직접 박지 않는다. `src/style.css`의 **시맨틱 토큰**만 쓴다.

- Tailwind 유틸: `bg-background` `text-foreground` `text-muted` `bg-surface`
  `border-border` `accent` …
- 토큰은 `:root`(라이트)와 `.dark`(다크)에 각각 정의되고, `@theme inline`으로 Tailwind
  유틸에 노출된다. 다크 변형은 `@custom-variant dark (&:where(.dark, .dark *))` +
  `<html>.dark` 클래스(`useColorMode` 토글)로 작동한다.
- 본문 글자는 명조(`--font-manuscript: "Noto Serif KR", serif`).

### SVG에서의 토큰

**SVG presentation 속성값엔 `var()`가 안 먹힌다.** 그래서 SVG 요소는 속성 대신 CSS
클래스로 칠한다:

```css
.cell-rect { fill: var(--cell-bg); stroke: var(--grid-line); }
```

Lucide 아이콘은 `stroke="currentColor"` 기반이라 `color`로 색을 준다
(`.newline-mark { color: var(--muted) }`).

## 격자 렌더링 (`Cell.vue` + `GridEditor.vue`)

### 칸 1개 (`Cell.vue`)

칸은 SVG `<g role="gridcell">`. 안에 겹쳐 그린다:

- `cell-rect` — 칸 배경·테두리
- `cell-selected` — 드래그로 선택된 칸 반투명 하이라이트(`v-if="cell.selected"`)
- `active-cell cell-caret` — 활성 칸(조합 중 글자 또는 캐럿 위치). `active-pulse`
  애니메이션으로 깜박이는 캐럿
- 가이드 라인 6종(`cell.guides`): 왼/오른쪽 테두리, 세로/가로 중심선, 정/역 대각선
- `cell-text` — 칸 글자(중앙 정렬)

`mousedown`·`mouseenter`를 emit해 부모(`GridEditor`)의 드래그 선택에 연결한다.

### 격자 위 표식 (`GridEditor.vue` 템플릿)

- **줄바꿈 표식(↵)**: 사용자가 친 `\n`은 칸을 점유하지 않으므로 보이게 그려 자동
  줄넘김과 구분한다. Lucide `CornerDownLeft`를 칸 중앙에 오도록 중첩 svg로 그린다
  (좌상단을 `(cellSize - MARK_SIZE)/2`만큼 이동).
- **soft-wrap 커넥터(⟯)**: 가득 찬 행과 다음 행의 오른쪽 끝을 여백에서 곡선으로 이어
  "두 줄이 사실 한 줄로 이어짐"을 보인다(진짜 줄바꿈 ↵과 구분).
- **여백 구두점**: 행두 금칙으로 앞 줄 오른쪽 여백(gutter)에 적힌 구두점(`margins`).
- **`grid-frame`**: 편집 가능한 격자 영역을 구분하는 외곽 프레임.

#### soft-wrap 곡선 기하 (`softWrapPath`)

두 행 사이 경계선 기준으로 위/아래로 짧게(`±half`, `half = cellSize * 0.3`) 뻗는 큐빅
베지어다. 제어점 x를 같은 값(`width + cellSize*0.5`, gutter 안)에 둬 belly를 둥글게
만든다. 짧게 뻗는 이유는 연쇄 wrap 시 위·아래 brace가 서로 닿지 않게 간격을 두기
위해서다.

## 미리보기와 내보내기 (`ManuscriptPreview.vue`)

미리보기는 **격자가 아니라 일반 글**로 조판한다. 박스 크기는 에디터와 동일
(`(cols+gutterCols) * cellSize` × `rows * cellSize`).

### 조판 (`relayout`)

순수 SVG로 줄바꿈을 직접 계산해 화면과 export가 동일하게 보이도록 한다.

- 실제 줄바꿈(`\n`)에서만 줄을 끊는다(원고지의 자동 줄넘김은 줄바꿈이 아니라 글의 흐름).
- 그 외에는 박스 폭에 맞춰 자연스럽게 줄을 흘린다(CJK는 글자 단위로 넘어감).
- 공백은 글자처럼 그대로 유지(`white-space: pre` + `xml:space="preserve"`).

글자 폭은 canvas `measureText`로 측정한다.

### 웹폰트 비동기 재조판

웹폰트(Noto Serif KR)는 비동기로 로드된다. 로드 전 조판은 폴백(serif) 기준이라 줄바꿈이
틀어지므로, `document.fonts.load(...)`가 끝나면 **측정 캐시(`measureCtx`)를 비우고** 새
폰트로 다시 조판한다.

### SVG 저장 (`exportSvg`)

화면의 SVG를 그대로 직렬화해 `.svg`로 내려받는다. 색·폰트를 모두 presentation
속성(inline)으로만 칠해 둬 외부 CSS 없이도 동일하게 렌더된다.

### PNG 저장 (`exportPng`)

SVG→`<img>` 경로는 샌드박스 때문에 문서에 로드된 웹폰트가 적용되지 않는다. 그래서 같은
조판(`lines`)을 **문서 컨텍스트 canvas에 `fillText`로 직접 그려** 실제 Noto Serif KR을
픽셀에 굽는다. 결과 PNG는 폰트가 없는 환경에서도 동일하게 보인다.

- `PNG_SCALE = 3`으로 또렷하게.
- 클릭 시점에 폰트가 확실히 로드돼 있도록 `document.fonts.load`를 한 번 더 await.
- `textBaseline = "top"`은 SVG의 `dominant-baseline="hanging"`과 같은 기준선.

## 반응형·토글 컴포넌트

- `EditorView.vue` — 데스크탑(≥1152px)은 콘텐츠를 수직 중앙 정렬, 컴팩트/모바일은 위에서
  부터 흐르고 컨테이너 margin-top으로 띄운다. 패널 2개가 한 줄에 안 들어가는 임계폭
  (≈1152px) 아래에선 `PaneToggle`로 에디터↔미리보기를 한 번에 하나만 보여준다(둘 다
  마운트 유지 → 상태 보존).
- `PaneToggle.vue` — 컴팩트 모드 전용 토글 스위치. knob 안에 현재 패널 아이콘, 양옆에
  텍스트 라벨.
- `ThemeToggle.vue` — `useColorMode`(auto/light/dark)로 `<html>.dark` 토글. 기본은
  `auto`(시스템 설정 따름).
