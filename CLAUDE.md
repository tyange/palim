# CLAUDE.md

원고지(原稿紙) 그리드 텍스트 에디터 **Palim**. 격자에 한 칸씩 글자를 채워 쓰고
SVG/PNG로 내보내는 웹 앱. 한국어 원고지 칸 점유·금칙 규칙을 그대로 구현하는 것이
이 프로젝트의 핵심 도메인이다.

> **IMPORTANT: 코드엔 주석이 없다. 모든 "왜"는 `docs/`에 있다.**
> 작업 시작 전, 그리고 관련 코드를 건드리기 전에 **항상** [참고 문서](#참고-문서-docs)의
> 해당 문서를 먼저 읽는다. 새 동작·결정도 인라인 주석이 아니라 해당 docs 문서를 갱신해
> 반영한다. 문서와 코드가 어긋나면 문서를 최신으로 맞춘다.

## 스택 & 명령어

- **런타임/패키지 매니저: Bun** (npm/yarn/pnpm 아님). 항상 `bun`을 쓴다.
- Vue 3 (`<script setup>`) · TypeScript · Vite · Tailwind v4 · Pinia
- 포매터 **oxfmt**, 린터 **oxlint** (ESLint/Prettier 아님). VSCode는 `oxc.oxc-vscode` 권장.

```bash
bun install
bun run dev       # Vite 개발 서버 (port 5173)
bun run build     # vue-tsc 타입체크 → vite 빌드
bun run preview
```

## 아키텍처 — 레이아웃 파이프라인이 전부다

본문은 **하나의 문자열**(`text`)이 진실원천이고, 화면은 순수 함수 파이프라인으로 파생된다:

```
text(string)
  → tokenize()      ① 자소(grapheme)별 칸 점유 종류 분류        src/core/tokenizer.ts
  → packCells()     ②③ "한 칸 단위"로 묶기(숫자/소문자 2개, 부호+따옴표 합치기)  src/core/layout.ts
  → flowToGrid()    ②③ 격자 배치 + 행두 금칙 보정 + 줄넘김 표식   src/core/layout.ts
  → GridLayout      cellText / cellSpan / offsetToCell / margins / newlines / softWraps
```

- `core/`는 **DOM·Vue를 모르는 순수 TS**다. 도메인 규칙은 전부 여기 있고, 단위 테스트하기 좋은 형태다.
- `offset`은 원본 문자열의 **UTF-16 인덱스**로 textarea `selectionStart`와 호환된다.
  칸↔캐럿 역산(`cellToOffset`/`offsetToCell`/`cellSpan`)이 이 offset 위에서 동작한다.
- 격자 크기는 `stores/manuscript.ts`의 `GRID` 상수(rows 12·cols 16·cellSize 32·gutterCols 1)로
  **현재 고정**. `gutterCols`는 행두 금칙으로 밀려난 구두점이 적히는 오른쪽 여백이다.

## 컴포넌트 지도

데이터 흐름: `App → EditorView → { GridEditor, ManuscriptPreview }`, 둘 다 같은 스토어 구독.

| 파일 | 줄수 | 책임 / 알아둘 점 |
|---|---|---|
| `core/tokenizer.ts` | 74 | ① `Intl.Segmenter`로 자소 분할 후 `TokenType` 분류. 반각/전각 모두 처리 |
| `core/layout.ts` | 237 | ②③ `packCells`(칸 묶기) + `flowToGrid`(격자 배치·금칙·줄넘김). 격자 무관 순수 로직 |
| `stores/manuscript.ts` | 32 | 단일 진실원천(`text` ref + `layout` computed) + `GRID` 상수 |
| `components/GridEditor.vue` | **517** | **가장 복잡.** 입력·캐럿·IME·드래그 선택. 숨은 textarea로 입력 수집, SVG 격자 렌더 |
| `components/Cell.vue` | 171 | 칸 1개를 SVG `<g>`로. rect/text/guides/active(깜박이는 캐럿)/selected. mousedown·enter emit |
| `components/ManuscriptPreview.vue` | 182 | 본문을 **일반 글로 조판**(\n에서만 줄바꿈) + SVG/PNG 내보내기 |
| `views/EditorView.vue` | 65 | 반응형 레이아웃. ≤1151px이면 PaneToggle로 에디터↔미리보기 전환 |
| `components/PaneToggle.vue` | 48 | 컴팩트 모드 토글 스위치 (`v-model<"editor"\|"preview">`) |
| `components/ThemeToggle.vue` | 59 | `useColorMode`(auto/light/dark) — `<html>.dark` 클래스 토글 |
| `components/EditorToolbar.vue` | 67 | **비활성** (`EditorView`에서 `v-if="false"`). 행/열·쓰기방향 입력 미연결 |
| `components/CellInput.vue` | 46 | **사용 안 함(죽은 코드).** 숨은 textarea 방식으로 대체됨 — 어디서도 import되지 않음 |

### GridEditor.vue — 입력·캐럿 모델 (수정 전 필독)

SVG 격자는 IME 조합을 받을 수 없으므로, **화면 밖 1px 투명 textarea**가 키보드/IME를
수집한다(`display:none`은 포커스 불가라 금지). 핵심 상태:

- **가상 캐럿(`virtualCell`)**: 빈 칸을 클릭하면 공백을 만들지 않고 화면 캐럿만 그 칸에 그린다.
  실제 입력 직전(`materializeCaret`)에만 텍스트로 실체화 → 탐색만 하다 떠나면 흔적이 안 남는다.
- **IME 타이밍**: keyCode 229("Process") keydown 시점(=조합 시작 전)에 실체화해야 IME가
  올바른 offset에서 조합을 시작한다. `compositionstart`/`beforeinput`은 이미 늦다.
- **v-model 금지**: IME 조합 중 input 이벤트를 무시하므로 native `@input`을 직접 받는다.
- **활성 칸 기준**: 캐럿 '왼쪽 칸'을 활성으로 본다(행두 글자는 `caretBeforeCell`로 보정).
- **선택**: 드래그는 칸 단위 anchor~focus. 삭제는 선택 밴드가 덮는 offset 구간을 통째로 잘라낸다.

### ManuscriptPreview.vue — 내보내기

- 격자가 아니라 **일반 글**로 조판한다. canvas로 글자 폭을 측정해 박스 폭에 맞춰 줄을 흘리고,
  실제 `\n`에서만 줄을 끊는다. 웹폰트(Noto Serif KR) 로드 후 재조판한다.
- **SVG 저장**: 화면 SVG를 직렬화. 색·폰트를 inline presentation 속성으로 칠해 외부 CSS 없이 동일 렌더.
- **PNG 저장**: SVG→img 경로는 웹폰트가 안 먹으므로, 문서 컨텍스트 canvas에 `fillText`로 직접
  그려 폰트를 픽셀에 굽는다(3배 스케일).

## 참고 문서 (docs/)

코드엔 주석을 두지 않으므로 "왜"는 모두 여기 있다. 관련 코드 수정 전 **반드시 참고**:
- `docs/architecture.md` — 레이아웃 파이프라인·offset 모델·코어 엔진(tokenizer/layout) 구현
- `docs/editor-input-model.md` — GridEditor의 캐럿·IME·가상 칸·선택 모델
- `docs/rendering-and-export.md` — SVG 그리드 렌더링·스타일 토큰·SVG/PNG 내보내기
- `docs/manuscript-paper-editing.md` — 칸 점유(§1)·구조적 빈칸(§2)·행두/행말 금칙(§3)·커서 모델(§4)
- `docs/korean-ime-bug.md` — 한국어 IME 조합 중 자모 탈락 버그 분석
- `docs/TODO-daisyui.md` — daisyUI 도입 보류 결정

## 도메인 규칙 (원고지)

요약:
- 한글·한자 = 1칸 / 숫자·소문자 = 한 칸에 2개 / 대문자 = 1개
- 문장부호(`. ,`) + 바로 뒤 따옴표 → 한 칸에 합침
- **행두 금칙**: 줄 첫 칸에 못 오는 부호(`. , ? !`, 곡선 닫는 따옴표 `’ ”`)는 앞 줄 오른쪽
  여백(`margins`)으로 밀어낸다. 단 **사용자가 친 `\n` 직후엔 보정하지 않는다**(의도된 문단).
- 자동 줄넘김(soft-wrap, ⟯ 커넥터)과 사용자 줄바꿈(`\n`, ↵ 표식)은 구분해 그린다.

## 컨벤션

- **스타일링**: 색을 컴포넌트에 직접 박지 않는다. `src/style.css`의 **시맨틱 토큰**
  (`bg-background` `text-foreground` `text-muted` `bg-surface` `border-border` `accent` …)만 쓴다.
  SVG 속성값엔 `var()`가 안 먹히므로 CSS 클래스(`.cell-rect { fill: var(--cell-bg) }`)로 칠한다.
- **다크 모드**: `@custom-variant dark` + `<html>.dark`(`useColorMode` 토글). `dark:` 변형 사용.
- **코드 주석은 두지 않는다.** "왜"에 해당하는 지식은 코드가 아니라 `docs/`에 주제별 문서로
  둔다(아래 "참고 문서"). 새 동작·결정도 인라인 주석 대신 해당 문서를 갱신한다.
- 문자열 **쌍따옴표**, `printWidth: 80`(oxfmt). 커밋은 한국어 + Conventional Commits(`feat:`/`fix:`/`style:`/`ci:`…).
- daisyUI는 테마 충돌 우려로 **보류**. 검토 시 `docs/TODO-daisyui.md` 참고.

## 검증

> **TODO: 테스트 시스템 도입.** 현재 자동화 테스트·러너가 전혀 없다. `core/`가 순수 TS라
> 단위 테스트하기 좋으므로 도메인 로직(tokenizer/layout)부터 테스트 도입이 우선이다.

도입 전까지 도메인/IME 로직 변경은 **수동 검증**한다:
- `bun run dev`(port 5173)로 띄운 뒤 브라우저에서 직접 확인.
- IME/캐럿 회귀는 입력 시퀀스를 직접 재현하고 콘솔에서 코드포인트를 덤프해 확인
  (`docs/korean-ime-bug.md`의 디버깅 절 참고).
- `bun run build`가 `vue-tsc` 타입체크를 겸하므로 타입 회귀는 여기서 잡힌다.

## 배포

`main` 푸시 시 GitHub Actions(`.github/workflows/deploy.yml`)가 `bun run build` →
AWS EC2로 SCP 업로드 → 심볼릭 링크 교체 → Nginx reload.
`bun install --frozen-lockfile`이므로 **의존성 변경 시 `bun.lock` 커밋 필수**.
