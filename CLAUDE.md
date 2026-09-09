# CLAUDE.md

한국 시 전사(轉寫) 에디터 **Palim**. 시인이 쓴 시를 — 공백 하나, 줄바꿈 하나까지 —
**그대로 따라 칠 수 있게** 하는 웹 앱. 한국 시는 두 부류라 조판 모델을 하나로 묶을 수
없어 **두 가지 쓰기 모드**를 제공하는 것이 이 프로젝트의 핵심이다.

- **격자(grid) 모드**: 활자의 2D 위치가 곧 시인 **배치형 시**(구체시 등)용. 고정폭 격자에
  자소 1개 = 1칸으로 놓아 위치를 결정적으로 보존하고, 격자가 배치 입력도 편하다.
- **흐름(flow) 모드**: 보통 공백 + 자연스러운 줄 흐름의 **산문·일반 시**용. 비례폭으로
  조판해 출판본처럼 보인다.

각 모드는 편집 화면과 출력(미리보기·내보내기)이 **같은 조판 모델**을 써 서로 어긋나지
않는다(흐름은 픽셀까지, 격자는 상대 배치가 1:1 — 편집 격자는 조작 편의로 칸을 더 벌린다).
에디터는 크롬을 숨긴 **전체 화면 몰입 셸**이다(`docs/editor-shell.md`).

> **IMPORTANT: 코드엔 주석이 없다. 모든 "왜"는 `docs/`에 있다.**
> 작업 시작 전, 그리고 관련 코드를 건드리기 전에 **항상** [참고 문서](#참고-문서-docs)의
> 해당 문서를 먼저 읽는다. 새 동작·결정도 인라인 주석이 아니라 해당 docs 문서를 갱신해
> 반영한다. 문서와 코드가 어긋나면 문서를 최신으로 맞춘다.

## 스택 & 명령어

- **런타임/패키지 매니저: Bun** (npm/yarn/pnpm 아님). 항상 `bun`을 쓴다.
- Vue 3 (`<script setup>`) · TypeScript · Vite · Tailwind v4 · Pinia
- **셸 UI는 [Reka UI](https://reka-ui.com) headless 프리미티브** (Dialog/Listbox/Toolbar/
  Tooltip/Toast). 스타일은 토큰으로 직접. 근거·규칙·함정은 `docs/ui-primitives.md`.
  편집면(격자/흐름)은 Reka 무관.
- **격자 편집 표면은 [CodeMirror 6](https://codemirror.net)** (`@codemirror/state`·
  `view`·`commands`, `basicSetup` 안 씀) + 문서를 직사각형 패딩해 어디든 좌표로 배치.
  근거·모델·동기화는 `docs/grid-editor.md`.
  흐름 모드는 plain `<textarea>`.
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
  격자 한 행). 크기 상수는 `stores/manuscript.ts`의 `GRID`(colSize·rowSize·minCols·
  minRows)·`FLOW`(width·fontSize·lineHeight·pad). 편집 화면은 `colSize`(가로)·`rowSize`
  (세로, 더 넓음)로 칸을 벌려 그린다.

## 컴포넌트 지도

데이터 흐름: `App → EditorView(전체 화면 셸) → (모드별 편집) + 크롬(하단 명령 바) +
오버레이(팔레트·미리보기)`. 모두 같은 스토어 구독.

| 파일 | 책임 / 알아둘 점 |
|---|---|
| `core/tokenizer.ts` | `segmentGraphemes`: `Intl.Segmenter`로 자소 분할 + offset + 줄바꿈 판정만 |
| `core/layout.ts` | `flowGraphemes`: 자소 1=1칸 평면 격자 배치 + 자동 cols/rows. 격자 무관 순수 로직 |
| `core/rect.ts` | `trimRect`/`padRect` — 격자 에디터의 직사각형 패딩·정규화 순수 함수 |
| `stores/manuscript.ts` | 본문 진실원천(`text` ref + `mode` ref + `gridLayout` computed) + `GRID`·`FLOW` 상수 |
| `stores/editorUi.ts` | 셸 UI 상태. `typewriter`(localStorage) / `previewOpen`·`paletteOpen`·`chromeVisible`(휘발) |
| `components/GridEditor.vue` | **격자 모드 편집.** CM6 + 패딩된 직사각형(`core/rect.ts`) → 빈 공간 아무 데나 클릭·타이핑. `updateListener`↔`text`는 `trimRect`/`padRect`로 동기화. `R:C` 좌표 배지. `docs/grid-editor.md` |
| `components/GridPreview.vue` | 격자 모드 출력. `gridLayout`을 격자선 없이 칸 중앙에 그린 깔끔한 SVG + export |
| `components/FlowEditor.vue` | 흐름 모드 편집. 투명 `<textarea>`(pre-wrap, Noto Serif KR, 세로 자동 확장) + `caretmove`(줄 번호) emit |
| `components/FlowPreview.vue` | 흐름 모드 출력. canvas 측정으로 비례폭 조판 + SVG/PNG export |
| `components/CommandBar.vue` | 하단 중앙 플로팅 알약. Reka `Toolbar` — 격자/흐름 `ToolbarToggleGroup` + ⌘K + 테마 버튼(+`Tooltip`). 옛 ModeToggle·PaneToggle·ThemeToggle 흡수 |
| `components/CommandPalette.vue` | ⌘K 팔레트. Reka `Dialog` + `Listbox`/`ListboxFilter`. 필터는 수동, 선택 watch → 실행 |
| `components/PreviewOverlay.vue` | ⌘↵ 미리보기. Reka `Dialog`로 `GridPreview`/`FlowPreview` 래핑 |
| `components/AppToaster.vue` | Reka `Toast`. `App.vue` 상주. 내보내기 성공 토스트 |
| `views/EditorView.vue` | **전체 화면 몰입 셸.** 모드 분기, 크롬 숨김, 타자기 스크롤, ⌘K/⌘↵ 키(Esc는 Dialog가 처리). `docs/editor-shell.md` |
| `composables/useExport.ts` | SVG 직렬화 저장 + PNG(canvas `fillText`, 3배 스케일) 공통 헬퍼 |
| `composables/useTheme.ts` | `useColorMode` 래핑(`isDark`·`toggle`). CommandBar/Palette 공용 |
| `composables/useToast.ts` | 모듈 스코프 `toasts` 큐 + `addToast`/`dismiss` |

### GridEditor.vue — CM6 + 패딩된 직사각형 (수정 전 필독)

바닥부터 만든 편집 표면이 세 번 갈렸다: SVG 격자+숨은 textarea+가상 캐럿
(`archive/svg-grid-editor/`) → 순수 `<textarea>`(`1f4c0a4`) → **CM6**(`c1b8203`).

핵심 아이디어: 시인이 **좌표로 계산해** 활자를 놓게 한다(스페이스를 세지 않음).

- 에디터가 든 문서는 **항상 직사각형**: `padRect`(모든 줄 뒤에 공백 + 아래 12줄 여유).
  → 모든 (행,열)이 진짜 위치라 빈 공간 클릭·방향키가 **CM6 네이티브**(가로채기 0,
  IME·undo 안전).
- `text` 진실원천은 `trimRect`로 clean 유지. 에디터↔스토어 동기화는 값 비교로 에코 판별.
- `repad`: 타이핑이 뻗으면 `requestAnimationFrame` 디바운스로 직사각형 확장(append만,
  `addToHistory:false`).
- 익스텐션 손조립. 테마 메트릭 = `GRID`. `word-spacing:0.5em`(공백=1칸 근사).
  `.cm-content`를 `flexGrow:0`+`width:max-content`로 shrink-wrap.
- 격자선·활성 줄 밴드 없음(피드백). 캐럿은 2px accent + glow(시인성). `docs/grid-editor.md`.

### 미리보기·내보내기

- **GridPreview**: 격자선 없이 자소를 칸 중앙에 배치(편집 화면과 **상대 배치 1:1**, 픽셀
  크기는 다름 — 미리보기는 흐름 자간 + 공백만 글자 폭 고정). 내용 바운딩 박스로 trim.
- **FlowPreview**: canvas `measureText`로 글자 폭을 재 박스 폭에 맞춰 줄을 흘리고, 실제 `\n`
  에서만 줄을 끊는다. 웹폰트(Noto Serif KR) 로드 후 재조판.
- **SVG/PNG 저장**(`useExport`): SVG는 화면 SVG를 inline 속성으로 직렬화. PNG는 같은 조판을
  문서 컨텍스트 canvas에 `fillText`로 직접 그려 웹폰트를 픽셀에 굽는다(3배 스케일).
- 자세한 내용은 `docs/rendering-and-export.md`.

## 참고 문서 (docs/)

코드엔 주석을 두지 않으므로 "왜"는 모두 여기 있다. 관련 코드 수정 전 **반드시 참고**:
- `docs/writing-modes.md` — 두 모드(격자/흐름)의 근거·원고지 규칙을 버린 이유
- `docs/architecture.md` — 진실원천·파이프라인·코어 엔진(segmentGraphemes/flowGraphemes)
- `docs/editor-shell.md` — 전체 화면 몰입 셸·크롬 숨김·아웃라인·⌘K 팔레트·미리보기·포커스/타자기
- `docs/grid-editor.md` — 격자 모드 편집 표면(CM6 + 패딩된 직사각형): 근거·좌표 배치·`trimRect`/`padRect` 동기화
- `docs/rendering-and-export.md` — 격자/흐름 렌더링·스타일 토큰·SVG/PNG 내보내기
- (아카이브) `archive/svg-grid-editor/` — SVG 격자 편집 표면 1세대 + IME 버그 분석
- `docs/ui-primitives.md` — 셸 UI의 Reka UI headless 프리미티브 채택·규칙·스코프 CSS 함정
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
- 셸 UI는 **Reka UI**(headless). 스타일은 토큰으로만, Reka `data-*`를 상태 훅으로. `docs/ui-primitives.md`.

## 검증

- **단위 테스트(Vitest)**: 격자 배치 로직은 `core/`에 순수 TS로 모여 있어 단위 테스트로
  검증한다. `tokenizer.test.ts`(자소 분할·offset·줄바꿈), `layout.test.ts`(자소 1:1 배치·
  자동 cols/rows·`\n` 역산·빈 칸)가 있다. **배치 규칙을 바꾸면 같은 PR에서 테스트도 갱신한다.**
- `bun run build`가 `vue-tsc` 타입체크를 겸하므로 타입 회귀는 여기서 잡힌다.
- IME/캐럿 회귀는 Vitest로 잡기 어렵다(브라우저 IME 의존). `bun run dev`(port 5173)로
  띄운 뒤 입력 시퀀스를 직접 재현하고 콘솔에서 코드포인트를 덤프해 확인한다
  (아카이브된 `archive/svg-grid-editor/korean-ime-bug.md` 참고).

## 배포

`main` 푸시 시 Forgejo Actions(`.forgejo/workflows/deploy.yml`)가 `bun run build` →
AWS EC2로 SCP 업로드 → 심볼릭 링크 교체 → Nginx reload.
`bun install --frozen-lockfile`이므로 **의존성 변경 시 `bun.lock` 커밋 필수**.

- 러너는 `git.tyange.com`(self-hosted Forgejo)의 `tyange-labs` 조직 스코프 러너
  (`--label self-hosted`). `uses:`는 완전한 `https://github.com/...` URL이어야 인식된다.
- 필요한 secrets: `HOST`(러너에서 배포 대상으로 가는 주소 = `127.0.0.1`), `USERNAME`,
  `LIGHTSAIL_SSH_KEY`(CRLF 없는 순수 PEM). vars: `DEPLOY_PATH`.
- 저장소 Settings → Units에서 **Actions** 유닛이 켜져 있어야 워크플로를 읽는다.
