# CLAUDE.md

한국 시 전사(轉寫) 에디터 **Palim**. 시인이 쓴 시를 — 공백 하나, 줄바꿈 하나까지 —
**그대로 따라 칠 수 있게** 하는 웹 앱. 한국 시는 두 부류라 조판 모델을 하나로 묶을 수
없어 **두 가지 쓰기 모드**를 제공하는 것이 이 프로젝트의 핵심이다.

- **격자(grid) 모드**: 활자의 2D 위치가 곧 시인 **배치형 시**(구체시 등)용. 고정폭 격자에
  자소 1개 = 1칸으로 놓아 위치를 결정적으로 보존하고, 격자가 배치 입력도 편하다.
- **흐름(flow) 모드**: 보통 공백 + 자연스러운 줄 흐름의 **산문·일반 시**용. 비례폭으로
  조판해 출판본처럼 보인다.

각 모드는 **편집 화면과 출력(미리보기·내보내기)이 같은 메트릭**이라 둘이 어긋나지 않는다.

> **IMPORTANT: 코드엔 주석이 없다. 모든 "왜"는 `docs/`에 있다.**
> 작업 시작 전, 그리고 관련 코드를 건드리기 전에 **항상** [참고 문서](#참고-문서-docs)의
> 해당 문서를 먼저 읽는다. 새 동작·결정도 인라인 주석이 아니라 해당 docs 문서를 갱신해
> 반영한다. 문서와 코드가 어긋나면 문서를 최신으로 맞춘다.

## 스택 & 명령어

- **런타임/패키지 매니저: Bun** (npm/yarn/pnpm 아님). 항상 `bun`을 쓴다.
- Vue 3 (`<script setup>`) · TypeScript · Vite · Tailwind v4 · Pinia
- 포매터 **oxfmt**, 린터 **oxlint** (ESLint/Prettier 아님). VSCode는 `oxc.oxc-vscode` 권장.
- 테스트 **Vitest** (Vite 설정 공유). 테스트는 대상 옆에 `*.test.ts`로 co-locate.

```bash
bun install
bun run dev       # Vite 개발 서버 (port 5173)
bun run build     # vue-tsc 타입체크 → vite 빌드
bun run preview
bun run test      # Vitest watch 모드
bun run test:run  # Vitest 1회 실행 (CI)
```

## 아키텍처 — 진실원천 + 모드별 파생

본문은 **하나의 문자열**(`text`)이 진실원천이고, `mode`("grid" | "flow")에 따라 화면이
파생된다. 고정폭 렌더에서 "공백 N개 = N칸"이므로 문자열이 곧 2D 배치다(구체시 저장 방식).

```
text(string) + mode            stores/manuscript.ts
  ├─ grid: segmentGraphemes()  자소 분할(offset·줄바꿈)       src/core/tokenizer.ts
  │        → flowGraphemes()   자소 1=1칸, 자동 cols/rows 격자  src/core/layout.ts
  │        → GridLayout        cellText / cellSpan / offsetToCell / endCellIndex
  └─ flow: <textarea> 그대로   비례폭, 공백 보존, native IME
```

- `core/`는 **DOM·Vue를 모르는 순수 TS**다. 격자 배치 규칙은 전부 여기 있고 단위
  테스트하기 좋은 형태다. **원고지 규칙(칸 점유 묶기·금칙·soft-wrap)은 없다** — 충실한
  전사를 방해하므로 제거됨(`docs/writing-modes.md`).
- `offset`은 원본 문자열의 **UTF-16 인덱스**로 textarea `selectionStart`와 호환된다.
  칸↔캐럿 역산(`offsetToCell`/`cellSpan`)이 이 offset 위에서 동작한다.
- **격자 자동 확장**: `flowGraphemes`는 `cols = max(minCols, 최장 줄)`,
  `rows = max(minRows, 줄수+1)`로 격자를 내용에 맞춰 키운다(줄바꿈 없음, 소스 한 줄 =
  격자 한 행). 크기 상수는 `stores/manuscript.ts`의 `GRID`(cellSize·minCols·minRows)·
  `FLOW`(width·fontSize·lineHeight·pad).

## 컴포넌트 지도

데이터 흐름: `App → EditorView → ModeToggle + (모드별 편집/미리보기)`. 모두 같은 스토어 구독.

| 파일 | 책임 / 알아둘 점 |
|---|---|
| `core/tokenizer.ts` | `segmentGraphemes`: `Intl.Segmenter`로 자소 분할 + offset + 줄바꿈 판정만 |
| `core/layout.ts` | `flowGraphemes`: 자소 1=1칸 평면 격자 배치 + 자동 cols/rows. 격자 무관 순수 로직 |
| `stores/manuscript.ts` | 진실원천(`text` ref + `mode` ref + `gridLayout` computed) + `GRID`·`FLOW` 상수 |
| `components/GridEditor.vue` | **격자 모드 편집.** 입력·캐럿·IME·드래그 선택. 숨은 textarea로 입력 수집, SVG 격자 렌더 |
| `components/GridPreview.vue` | 격자 모드 출력. `gridLayout`을 격자선 없이 칸 중앙에 그린 깔끔한 SVG + export |
| `components/FlowEditor.vue` | 흐름 모드 편집. 스타일된 `<textarea>`(pre-wrap, Noto Serif KR, 세로 자동 확장) |
| `components/FlowPreview.vue` | 흐름 모드 출력. canvas 측정으로 비례폭 조판 + SVG/PNG export |
| `components/Cell.vue` | 칸 1개를 SVG `<g>`로. rect/selected/active(깜박이는 캐럿)/text. mousedown·enter emit |
| `components/ModeToggle.vue` | 격자↔흐름 토글(`store.mode`) |
| `components/PaneToggle.vue` | 좁은 화면 전용 편집↔미리보기 토글 (`v-model<"editor"\|"preview">`) |
| `components/ThemeToggle.vue` | `useColorMode`(auto/light/dark) — `<html>.dark` 클래스 토글 |
| `views/EditorView.vue` | 반응형 레이아웃 + 모드별 편집/미리보기 분기. ≤1151px이면 PaneToggle로 전환 |
| `composables/useExport.ts` | SVG 직렬화 저장 + PNG(canvas `fillText`, 3배 스케일) 공통 헬퍼 |

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
- 자세한 내용은 `docs/editor-input-model.md`.

### 미리보기·내보내기

- **GridPreview**: 격자선 없이 자소를 칸 중앙에 배치(편집 화면과 같은 cellSize → 위치 1:1).
  내용 바운딩 박스로 trim해 깔끔히 내보낸다.
- **FlowPreview**: canvas `measureText`로 글자 폭을 재 박스 폭에 맞춰 줄을 흘리고, 실제 `\n`
  에서만 줄을 끊는다. 웹폰트(Noto Serif KR) 로드 후 재조판.
- **SVG/PNG 저장**(`useExport`): SVG는 화면 SVG를 inline 속성으로 직렬화. PNG는 같은 조판을
  문서 컨텍스트 canvas에 `fillText`로 직접 그려 웹폰트를 픽셀에 굽는다(3배 스케일).
- 자세한 내용은 `docs/rendering-and-export.md`.

## 참고 문서 (docs/)

코드엔 주석을 두지 않으므로 "왜"는 모두 여기 있다. 관련 코드 수정 전 **반드시 참고**:
- `docs/writing-modes.md` — 두 모드(격자/흐름)의 근거·원고지 규칙을 버린 이유
- `docs/architecture.md` — 진실원천·파이프라인·코어 엔진(segmentGraphemes/flowGraphemes)
- `docs/editor-input-model.md` — GridEditor의 캐럿·IME·가상 칸·선택 모델
- `docs/rendering-and-export.md` — 격자/흐름 렌더링·스타일 토큰·SVG/PNG 내보내기
- `docs/korean-ime-bug.md` — 한국어 IME 조합 중 자모 탈락 버그 분석
- `docs/TODO-daisyui.md` — daisyUI 도입 보류 결정
- `docs/TODO-e2e-testing.md` — e2e 보류 결정 + 한글 IME 재현 가능 러너 조사(Playwright+CDP)

## 컨벤션

- **스타일링**: 색을 컴포넌트에 직접 박지 않는다. `src/style.css`의 **시맨틱 토큰**
  (`bg-background` `text-foreground` `text-muted` `bg-surface` `border-border` `accent` …)만 쓴다.
  SVG 속성값엔 `var()`가 안 먹히므로 CSS 클래스(`.cell-rect { fill: var(--cell-bg) }`)로 칠한다.
  단 내보내기 SVG/PNG는 외부 CSS 없이 동일 렌더해야 하므로 **흑/백 고정색**으로 칠한다.
- **다크 모드**: `@custom-variant dark` + `<html>.dark`(`useColorMode` 토글). `dark:` 변형 사용.
- **코드 주석은 두지 않는다.** "왜"에 해당하는 지식은 코드가 아니라 `docs/`에 주제별 문서로
  둔다(위 "참고 문서"). 새 동작·결정도 인라인 주석 대신 해당 문서를 갱신한다.
- 문자열 **쌍따옴표**, `printWidth: 80`(oxfmt). 커밋은 한국어 + Conventional Commits(`feat:`/`fix:`/`style:`/`ci:`…).
- daisyUI는 테마 충돌 우려로 **보류**. 검토 시 `docs/TODO-daisyui.md` 참고.

## 검증

- **단위 테스트(Vitest)**: 격자 배치 로직은 `core/`에 순수 TS로 모여 있어 단위 테스트로
  검증한다. `tokenizer.test.ts`(자소 분할·offset·줄바꿈), `layout.test.ts`(자소 1:1 배치·
  자동 cols/rows·`\n` 역산·빈 칸)가 있다. **배치 규칙을 바꾸면 같은 PR에서 테스트도 갱신한다.**
- `bun run build`가 `vue-tsc` 타입체크를 겸하므로 타입 회귀는 여기서 잡힌다.
- IME/캐럿 회귀는 Vitest로 잡기 어렵다(브라우저 IME 의존). `bun run dev`(port 5173)로
  띄운 뒤 입력 시퀀스를 직접 재현하고 콘솔에서 코드포인트를 덤프해 확인한다
  (`docs/korean-ime-bug.md`의 디버깅 절 참고).

## 배포

`main` 푸시 시 GitHub Actions(`.github/workflows/deploy.yml`)가 `bun run build` →
AWS EC2로 SCP 업로드 → 심볼릭 링크 교체 → Nginx reload.
`bun install --frozen-lockfile`이므로 **의존성 변경 시 `bun.lock` 커밋 필수**.
