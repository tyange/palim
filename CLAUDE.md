# CLAUDE.md

한국 시 전사(轉寫) 에디터 **Palim**. 시인이 쓴 시를 — 공백 하나, 줄바꿈 하나까지 —
**그대로 따라 칠 수 있게** 하는 웹 앱. 한국 시는 두 부류라 조판 모델을 하나로 묶을 수
없어 **두 가지 쓰기 모드**를 제공하는 것이 이 프로젝트의 핵심이다.

- **격자(grid) 모드**: 활자의 2D 위치가 곧 시인 **배치형 시**(구체시 등)용. 연속 좌표에
  텍스트 조각(fragment)을 자유 배치하고 **겹칠 수도 있다**(도화지에 점 찍듯이) —
  이산 격자가 아니다. `docs/canvas-editor.md`.
- **흐름(flow) 모드**: 보통 공백 + 자연스러운 줄 흐름의 **산문·일반 시**용. 비례폭으로
  조판해 출판본처럼 보인다.

두 모드는 **서로 다른 진실원천**을 갖는 독립된 문서다(`fragments` vs `text`) — 겹침이
가능한 배치를 평문 한 줄로 표현할 방법이 없어 상호 변환은 정의되지 않는다. 각 모드는
편집 화면과 출력(미리보기·내보내기)이 **같은 조판 모델**을 써 서로 어긋나지 않는다.
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
- **격자 편집 표면은 연속 좌표 캔버스**: 텍스트 조각마다 편집 중일 때만 진짜
  `contenteditable`을 그 자리에 올려 IME·캐럿·undo를 브라우저 네이티브로 받는다
  (CM6·별도 라이브러리 없음). 근거·모델은 `docs/canvas-editor.md`.
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

## 아키텍처 — 모드별 독립 진실원천

`mode`("grid" | "flow")가 두 개의 서로 독립된 문서를 오간다 — 하나를 다른 하나로부터
파생시키지 않는다(`stores/manuscript.ts`):

```
mode: "grid" | "flow"
  ├─ grid:  fragments: Fragment[]   { id, x, y, text }[], 연속 좌표, 배열 순서 = 쌓임 순서
  │         CanvasEditor.vue         조각별 contenteditable(편집 중인 것만)
  │         CanvasPreview.vue        조각의 (x,y)에 그대로 SVG/PNG
  └─ flow:  text: string             <textarea>(uncontrolled) ← 그대로, native IME
            FlowEditor.vue / FlowPreview.vue
```

- `core/fragments.ts` — **DOM·Vue를 모르는 순수 TS**: `bringToFront`(배열 맨 뒤로 옮겨
  맨 위로 쌓기), `removeById`, `cloneFragments`(undo 스냅샷용 얕은 복제), `nudge`
  (선택 조각들을 델타만큼 이동, 0에서 클램프), `duplicateSelected`(오프셋 복제,
  id 생성은 콜백 주입). 단위 테스트는
  `fragments.test.ts`.
- 겹칠 수 있는 배치를 평문 한 줄로 표현할 방법이 없어 `fragments` ⇄ `text` 변환은
  **정의되지 않는다**. 모드 토글은 그냥 두 문서를 오갈 뿐, 내용이 서로 옮겨가지 않는다.
  자세한 근거·트레이드오프는 `docs/canvas-editor.md`.
- **원고지 규칙(칸 점유 묶기·금칙·soft-wrap)은 없다** — 충실한 전사를 방해하므로
  제거됨(`docs/writing-modes.md`).
- 이전에는 진실원천이 좌표 맵(`CoordDoc`, 이산 격자) 하나였다 — 겹침을 표현 못 해
  교체됨. 옛 모델은 `archive/discrete-grid-editor/`.

## 컴포넌트 지도

데이터 흐름: `App → EditorView(전체 화면 셸) → (모드별 편집) + 크롬(하단 명령 바) +
오버레이(팔레트·미리보기)`. 모두 같은 스토어 구독.

| 파일                              | 책임 / 알아둘 점                                                                                                                                                                 |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `core/fragments.ts`               | `bringToFront`(맨 뒤=맨 위로 쌓기)·`removeById`·`cloneFragments`·`nudge`·`duplicateSelected` — 조각 배열에 대한 순수 로직                                                        |
| `core/align.ts`                   | `alignEdge`·`distribute`·`computeSnap` — 좌표·크기만 받아 정렬/균등 배치/드래그 스냅 결과를 계산하는 순수 로직(DOM 실측은 호출부 책임)                                           |
| `core/history.ts`                 | `History<T>` — past/future 두 스택만 다루는 범용 undo/redo. 값이 뭔지·어떻게 복제하는지 모름(호출부 책임)                                                                        |
| `stores/manuscript.ts`            | `fragments`(격자 모드 진실원천) + `text`(흐름 모드 진실원천, 서로 독립) + `mode` ref + `CANVAS`·`FLOW` 상수                                                                      |
| `stores/editorUi.ts`              | 셸 UI 상태. `typewriter`(localStorage) / `previewOpen`·`paletteOpen`·`chromeVisible`(휘발)                                                                                       |
| `components/CanvasEditor.vue`     | **격자 모드 편집.** 빈 곳 클릭=조각 생성, 조각 클릭/드래그=재편집/이동, 편집 중인 조각 하나에만 진짜 `contenteditable`. 빈 곳 드래그=다중 선택(marquee). `docs/canvas-editor.md` |
| `components/CanvasPreview.vue`    | 격자 모드 출력. 조각의 (x,y)에 그대로 SVG로 찍고 export                                                                                                                          |
| `components/SelectionToolbar.vue` | 격자 모드에서 2개 이상 선택 시 뜨는 플로팅 정렬/균등 배치 툴바(`core/align.ts` 계산 결과 적용)                                                                                   |
| `components/FlowEditor.vue`       | 흐름 모드 편집. 투명 **uncontrolled** `<textarea>`(pre-wrap, Noto Serif KR, 세로 자동 확장), `@input`→`store.text = 값` + `caretmove`(줄 번호) emit                              |
| `components/FlowPreview.vue`      | 흐름 모드 출력. canvas 측정으로 비례폭 조판 + SVG/PNG export                                                                                                                     |
| `components/CommandBar.vue`       | 하단 중앙 플로팅 알약. Reka `Toolbar` — 격자/흐름 `ToolbarToggleGroup` + ⌘K + 테마 버튼(+`Tooltip`). 옛 ModeToggle·PaneToggle·ThemeToggle 흡수                                   |
| `components/CommandPalette.vue`   | ⌘K 팔레트. Reka `Dialog` + `Listbox`/`ListboxFilter`. 필터는 수동, 선택 watch → 실행                                                                                             |
| `components/PreviewOverlay.vue`   | ⌘↵ 미리보기. Reka `Dialog`로 `CanvasPreview`/`FlowPreview` 래핑                                                                                                                  |
| `components/AppToaster.vue`       | Reka `Toast`. `App.vue` 상주. 내보내기 성공 토스트                                                                                                                               |
| `views/EditorView.vue`            | **전체 화면 몰입 셸.** 모드 분기, 크롬 숨김, 타자기 스크롤, ⌘K/⌘↵ 키(Esc는 Dialog가 처리). `docs/editor-shell.md`                                                                |
| `composables/useExport.ts`        | SVG 직렬화 저장 + PNG(canvas `fillText`, 3배 스케일) 공통 헬퍼                                                                                                                   |
| `composables/useTheme.ts`         | `useColorMode` 래핑(`isDark`·`toggle`). CommandBar/Palette 공용                                                                                                                  |
| `composables/useToast.ts`         | 모듈 스코프 `toasts` 큐 + `addToast`/`dismiss`                                                                                                                                   |

### CanvasEditor.vue — 연속 좌표 + 조각별 native contenteditable (수정 전 필독)

바닥부터 만든 편집 표면이 갈리고 갈렸다: SVG 격자+숨은 textarea+가상 캐럿
(`archive/svg-grid-editor/`) → 순수 `<textarea>` → CM6 → 좌표 맵 진실원천(true-B,
이산 격자) → **연속 좌표 + 조각(fragment)**(전부 `archive/discrete-grid-editor/`).

교체 이유는 실패가 아니라 요구 자체가 달라져서다: "시인이 도화지에 점 찍듯이 쓸 수도
있다"는 관점에서 **텍스트끼리 겹칠 수 있어야** 한다는 요구가 나왔고, 이산 격자(칸
하나=자소 하나)는 그걸 원천적으로 표현할 수 없다.

- 진실원천은 `fragments: Fragment[]`(`{ id, x, y, text }`, `stores/manuscript.ts`).
  좌표는 연속값(px), 격자 스냅 없음. 배열 순서 = 쌓임 순서(나중 = 위).
- 화면엔 정적 텍스트 조각들만 떠 있고, **지금 편집 중인 조각 하나에만** 진짜
  `contenteditable`을 그 좌표에 얹는다 — 1세대가 실패한 "가상 캐럿 하나로 전체 캔버스"
  와 다르다. IME·캐럿·클립보드는 그 하나가 브라우저 네이티브로 그대로 받는다.
- 빈 곳 클릭=조각 생성+즉시 편집, 조각 클릭(드래그 아님)=재편집, 드래그=`f.x`/`f.y`
  직접 갱신 후 release에 `bringToFront`. Vue의 `:key="f.id"` keyed `v-for`가 같은 DOM
  노드를 재사용해 드래그 중 `setPointerCapture`가 안 끊긴다.
- 편집 중 텍스트는 `FlowEditor.vue`의 uncontrolled textarea와 같은 이유로 **반응형
  바인딩 안 함** — `nextTick`에 `textContent`를 한 번만 명령형으로 심고 `blur`/`Esc`
  에서만 읽어 커밋. 빈 텍스트로 커밋하면 조각 삭제.
- Safari 함정: 드래그 중 네이티브 텍스트 선택이 끼어드는 문제 — `pointerdown`에
  `preventDefault()` + `.frag`에 `user-select: none`(`-webkit-` 포함)으로 막는다.
- 빈 곳 드래그로 다중 선택(marquee) → 그룹 드래그 이동, Delete/Backspace로 그룹 삭제,
  2개 이상 선택 시 뜨는 `SelectionToolbar.vue`로 정렬/균등 배치. Shift/Cmd+클릭 추가
  선택은 없음(마키만) — 배경 클릭이 이미 "조각 생성"이라 조작을 드래그로 완전히
  분리하는 쪽을 택함. 상세는 `docs/canvas-editor.md`.
- **undo/redo**(⌘Z/⌘⇧Z, `CommandBar.vue`에도 아이콘): 커맨드 패턴이 아니라 `fragments`
  배열 전체를 스냅샷하는 방식(`core/history.ts`의 `History<T>` + `cloneFragments`).
  편집 중(`editingId !== null`)엔 가로채지 않아 `contenteditable`의 네이티브 글자
  단위 undo와 안 섞인다. `structuredClone`은 Vue 반응형 Proxy에 못 써서 얕은 스프레드
  복제(`cloneFragments`)를 쓴다 — 상세·함정은 `docs/canvas-editor.md`.
- **방향키 넛지**: 선택된 조각(들)을 방향키로 1px, Shift+방향키로 10px 이동
  (`core/fragments.ts`의 `nudge`). 연타/길게 누름은 500ms 유휴 타이머로 한
  undo 단계로 묶는다(매 keydown마다 스냅샷 찍지 않음) — 근거는
  `docs/canvas-editor.md`.
- **복제(⌘D)**: 클립보드 없이 선택 조각을 (16,16)px 밀어 제자리 복제
  (`core/fragments.ts`의 `duplicateSelected`), 복제본이 곧바로 선택돼 연달아
  누르면 대각선 계단식으로 퍼진다(Figma와 동일). 근거는 `docs/canvas-editor.md`.
- **스마트 정렬 가이드**: 드래그 중 조각의 좌/가로중앙/우·상/세로중앙/하가 다른
  조각과 6px 안으로 가까워지면 스냅 + 안내선(`core/align.ts`의 `computeSnap`).
  x·y축 독립, 축마다 가장 가까운 후보 하나만, 다중 선택 드래그는 그룹 바운딩
  박스 기준. 근거는 `docs/canvas-editor.md`.
- 자세한 근거·데이터 모델·잃은 것은 `docs/canvas-editor.md`. 시안:
  `design-system/mockups/palim/freeform-canvas-directions.html`.

### 미리보기·내보내기

- **CanvasPreview**: 조각의 (x,y)에 그 줄들을 그대로 SVG `<text>`로 찍는다(편집 화면과
  같은 `CANVAS` 폰트 메트릭 공유). 여러 줄 조각은 줄마다 `lineHeight`만큼 내려감. 전체
  조각 바운딩 박스로 `viewBox` 크기 결정.
- **FlowPreview**: canvas `measureText`로 글자 폭을 재 박스 폭에 맞춰 줄을 흘리고, 실제 `\n`
  에서만 줄을 끊는다. 웹폰트(Noto Serif KR) 로드 후 재조판.
- **SVG/PNG 저장**(`useExport`): SVG는 화면 SVG를 inline 속성으로 직렬화. PNG는 같은 조판을
  문서 컨텍스트 canvas에 `fillText`로 직접 그려 웹폰트를 픽셀에 굽는다(3배 스케일).
- 자세한 내용은 `docs/rendering-and-export.md`.

## 참고 문서 (docs/)

코드엔 주석을 두지 않으므로 "왜"는 모두 여기 있다. 관련 코드 수정 전 **반드시 참고**:

- `docs/writing-modes.md` — 두 모드(격자/흐름)의 근거·원고지 규칙을 버린 이유
- `docs/architecture.md` — 두 모드의 독립 진실원천 개요
- `docs/editor-shell.md` — 전체 화면 몰입 셸·크롬 숨김·아웃라인·⌘K 팔레트·미리보기·포커스/타자기
- `docs/canvas-editor.md` — 격자 모드: 연속 좌표 + 조각(fragment), 겹침, 조각별 native contenteditable
- `docs/rendering-and-export.md` — 격자/흐름 렌더링·스타일 토큰·SVG/PNG 내보내기
- (아카이브) `archive/svg-grid-editor/` — SVG 격자 편집 표면 1세대 + IME 버그 분석
- (아카이브) `archive/discrete-grid-editor/` — CM6 + 좌표 맵 이산 격자 편집 표면 2세대(`grid-editor.md` 포함)
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

- **단위 테스트(Vitest)**: 조각 배열·정렬·히스토리 로직은 `core/`에 순수 TS로 모여
  있어 단위 테스트로 검증한다. `fragments.test.ts`(`bringToFront`/`removeById`/
  `cloneFragments`/`nudge`/`duplicateSelected`), `align.test.ts`(`alignEdge`/
  `distribute`/`computeSnap`), `history.test.ts`(`History` push/undo/redo)가
  있다. **배치 규칙을
  바꾸면 같은 PR에서 테스트도 갱신한다.**
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
