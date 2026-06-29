# 렌더링과 내보내기 — 격자/흐름·스타일 토큰·export

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
CSS 클래스로 칠한다(예: `.cell-rect { fill: var(--cell-bg); stroke: var(--grid-line) }`).

단 **내보내기 SVG/PNG는 외부 CSS 없이 동일 렌더**해야 하므로 미리보기는 흑(`#000000`)/
백(`#ffffff`) **고정색**으로 칠한다.

## 격자 모드 (`GridEditor.vue` + `Cell.vue` / `GridPreview.vue`)

### 편집 화면 (`GridEditor.vue` + `Cell.vue`)

`gridLayout`을 받아 `cellSize` 자연 크기의 SVG 격자로 그린다(화면이 좁으면 축소하지 않고
스크롤 — 칸 클릭·배치 정확성 우선). 칸 1개는 SVG `<g role="gridcell">`로, 안에 겹쳐 그린다:

- `cell-rect` — 칸 배경·**옅은 가이드** 테두리(`stroke-opacity: 0.5`)
- `cell-selected` — 드래그로 선택된 칸 반투명 하이라이트(`v-if="cell.selected"`)
- `active-cell cell-caret` — 활성 칸(조합 중 글자 또는 캐럿 위치). `active-pulse`
  애니메이션으로 깜박이는 캐럿
- `cell-text` — 칸 자소(중앙 정렬)
- 격자 외곽 `grid-frame`

`mousedown`·`mouseenter`를 emit해 부모(`GridEditor`)의 드래그 선택에 연결한다. (원고지의
여백 구두점·줄넘김 표식·soft-wrap 커넥터는 없다 — 묶기·금칙·자동 줄넘김을 안 하므로.)

### 출력 (`GridPreview.vue`)

`gridLayout.cellText`를 **격자선 없이** 칸마다 글자를 그린 흰 배경 SVG. 빈 칸·공백 칸은
글자를 안 그린다. 단 **자간은 편집 화면의 칸 폭(32px)이 아니라 흐름 모드와 같은 글자 폭**을
쓴다 — 한 칸 가로 advance = 전각 한글 글자 폭(canvas `measureText("가")`, 웹폰트 로드 후
재측정), 행 advance = `FLOW.lineHeight`. 공백 칸도 같은 advance를 차지해 "공백 = 글자 한 칸"
으로 다중 공백 간격이 보존된다(배치형 시의 핵심). 즉 흐름 모드 같은 자연스러운 자간에
**공백만 글자 폭으로 고정**한 형태다.

SVG는 자연 크기(스케일 안 함)로 그리고, 이를 **full-width 흰 박스**(`div`) 좌상단에 얹는다.
박스는 부모 폭에 꽉 차 내용 양과 무관하게 일정하고(짧은 글도 큰 박스 유지), 글자는 출력물
같은 자연 크기로 보인다. 격자 `minCols`/`minRows`가 박스 최소 크기를 보장한다. 내보내기는
이 자연 크기 SVG(글자 영역)를 그대로 직렬화/굽기한다.

## 흐름 모드 (`FlowEditor.vue` / `FlowPreview.vue`)

### 편집 (`FlowEditor.vue`)

`text`에 바인딩된 스타일된 `<textarea>`. `white-space: pre-wrap`로 공백·줄바꿈을 보존하고,
`--font-manuscript`·`FLOW` 메트릭(폭·폰트·줄높이·패딩)으로 출력과 같은 모습으로 그린다.
IME·캐럿·공백은 textarea가 native로 처리하므로 격자의 숨은 textarea 장치가 필요 없다.
입력 시 `scrollHeight`로 세로 자동 확장한다.

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

## 반응형·토글 컴포넌트

- `EditorView.vue` — 모드 분기는 `store.mode`로 `GridEditor`/`FlowEditor`·
  `GridPreview`/`FlowPreview`를 고른다. **격자 모드(데스크탑)는 편집·미리보기를 좌우 분할
  대신 세로로 쌓는다** — 격자가 컨테이너 전체 폭을 써 폭 넓은 시도 잘리지 않게 하기 위해서다
  (좌우 분할이면 에디터 폭이 절반뿐이라 넓은 격자가 클리핑됨). 흐름 모드는 박스가 좁아 좌우
  분할 그대로다. 컴팩트(≤1151px)에선 `PaneToggle`로 편집↔미리보기를 한 번에 하나만
  보여준다(둘 다 마운트 유지 → 상태 보존).
- `ModeToggle.vue` — 격자↔흐름 스위치(`store.mode`).
- `PaneToggle.vue` — 컴팩트 모드 전용 편집↔미리보기 토글.
- `ThemeToggle.vue` — `useColorMode`(auto/light/dark)로 `<html>.dark` 토글. 기본은 `auto`.
