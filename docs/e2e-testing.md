# e2e 테스트 (Playwright)

**2026-09-12 도입.** 도메인 규칙은 `core/`의 Vitest 단위 테스트로 이미 잠갔고
(`docs/architecture.md`), 그 위 상호작용 계층(클릭·드래그·키보드 단축키)을 이
`e2e/`가 덮는다. 이 문서는 왜 이 방식·범위로 도입했는지와, 한글 IME 자동화의
한계를 기록한다.

## 왜 Playwright, 왜 지금

- 이전엔 "개인 단일 문서 앱에 Playwright는 과하다"며 보류했었다. 하지만 세션
  하나에서 다중 선택·정렬·undo/redo·복제·넛지·스냅까지 상호작용 표면이 급격히
  늘면서, 수동으로 매번 브라우저에서 왕복 검증하는 비용이 e2e 도입 비용을
  넘어섰다 — 특히 "A 기능이 B 기능을 깨뜨리지 않았나"를 매 커밋마다 확인하는
  회귀 검증에서.
- **Chromium 전용** — WebKit/Firefox는 CDP가 없어 아래 IME 조합 검증이 아예
  안 된다. 이 앱은 개인용이고 배포 타깃도 일반 브라우저라 하나만 확실히 덮는
  쪽을 택했다.

## 무엇을 덮는가 (`e2e/`)

| 파일                    | 덮는 것                                                                                                                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `canvas-editor.spec.ts` | 격자 모드: 빈 곳 클릭 생성·빈 텍스트 삭제·재편집, 드래그 이동, 마키 다중 선택 + 그룹 삭제, undo/redo, 복제(⌘D), 방향키 넛지, 정렬 툴바, 라벨(Tab 입력·라벨만 변경 undo·blur 시 확정) |
| `flow-editor.spec.ts`   | 흐름 모드 전환·타이핑, 격자↔흐름 전환 시 서로 내용이 안 섞이는 것                                                                                                                    |
| `preview.spec.ts`       | ⌘↵ 미리보기 열기/닫기, 모드별 제목 전환                                                                                                                                              |
| `ime.spec.ts`           | CDP로 실제 2벌식 조합(ㄱ→가→각)을 거쳐 커밋, 조합 중 Esc가 편집을 끝내지 않는 것, 조합 후 Esc는 정상 커밋, 기존 조각 재편집 중 조합                                                  |

의도적으로 **아직 안 덮은 것**: 정렬 가이드(스냅) 자체의 시각적 정확성(단위
테스트 `align.test.ts`의 `computeSnap`이 이미 좌표 계산을 검증함 — e2e는 "그
계산이 실제 드래그에 연결됐나"까지는 안 봄), export(SVG/PNG 다운로드, 브라우저
다운로드 이벤트 검증이 상대적으로 번거로움). 한글 IME는 CDP로 여기까지는
덮는다(아래 참고) — 2벌식 결합 알고리즘 자체나 OS 타이밍 의존 버그는 여전히
수동 검증 영역.

## 테스트 작성 시 지켜야 할 것 (함정 기록)

- **다른 프로젝트와 dev 서버 포트가 겹칠 수 있다.** `playwright.config.ts`가
  `bunx vite --port 5179 --strictPort`로 전용 포트를 강제한다 — 그냥
  `bun run dev`(기본 5173)를 쓰면, 그 포트를 다른 프로젝트의 vite가 먼저
  점유하고 있을 때 Playwright의 `reuseExistingServer`가 **엉뚱한 앱을
  palim으로 착각**해 모든 테스트가 이유 모를 실패로 쏟아진다(이번에 실제로
  겪음). `--strictPort` 덕분에 포트가 막혀 있으면 서버 시작 자체가 실패해
  원인이 바로 드러난다.
- **드래그 목적지는 다른 조각과 충분히 떨어뜨린다.** 스냅(`computeSnap`)이
  6px 안이면 개입하므로, 정확한 픽셀 값을 검증하는 드래그 테스트는 비어 있는
  좌표로 옮겨야 결정적이다(`canvas-editor.spec.ts`의 "드래그하면..." 참고).
- **마키 좌표는 뷰포트 절대 좌표를 그대로 쓴다.** 캔버스가 보통 뷰포트 원점
  근처에서 시작해 조각 좌표 값과 거의 일치하지만, 정확히 하려면
  `.canvas`의 `boundingBox()`를 기준으로 오프셋을 더한다.
- 모드 토글(`격자`/`흐름`) 버튼은 Reka `ToolbarToggleItem`이 렌더한
  **plain `<button>`**이라 `getByRole("button", { name: ..., exact: true })`
  로 잡는다(`role="radio"`가 아님 — Reka의 toggle-group은 ARIA role을 따로
  안 붙인다).

## 한글 IME — CDP로 실제 조합 경로까지 검증 (`ime.spec.ts`)

질문: "한글 IME 조합을 재현 가능한 테스트 러너가 있는가?"

**결론: 실제 OS IME를 그대로 돌리는 러너는 없다. 단, Playwright(Chromium) + CDP의
`Input.imeSetComposition`으로 브라우저 조합 파이프라인을 낮은 수준에서 구동할 수 있고,
`ime.spec.ts`에서 실제로 이 방식을 쓴다.**

### 무엇이 되는가

- Playwright에서 `context.newCDPSession(page)`로 CDP 세션을 열고:
  - `Input.imeSetComposition({ text, selectionStart, selectionEnd })` — 현재
    조합(candidate) 텍스트를 설정. `ㄱ → 가 → 각`처럼 **중간 조합 상태를 직접
    스크립트**해 단계별로 보내면, 실제로 `contenteditable`에 그 중간 글자가
    그대로 반영된다(확인됨).
  - `Input.insertText({ text })` — 활성 조합을 커밋하며 그 값으로 확정한다.
    **`Input.imeCommitComposition`은 CDP에 없다**("wasn't found" 프로토콜
    에러로 직접 확인) — 커밋은 `insertText`로 한다.
- 이 경로는 JS `compositionstart/update/end` 이벤트를 합성 디스패치하는 것보다 한 단계
  낮아, 브라우저의 실제 조합 이벤트·캐럿 갱신을 거친다. 그리고 이 낮은 수준 덕분에
  **`e.isComposing`도 실제로 `true`가 된다** — `onEditorKeydown`이 조합 중 Esc를
  가로채 편집을 강제로 끝내버리는 실제 버그를 이걸로 재현·확인하고 고쳤다(아래
  "실전에서 잡은 버그" 참고).

### 실전에서 잡은 버그

`CanvasEditor.vue`의 `onEditorKeydown`이 Esc 키를 항상 blur로 처리하고 있었다 —
조합 중(`e.isComposing === true`)에도 예외가 없었다. 즉 2벌식 조합 도중 Esc를
누르면(IME 자체의 조합 취소 관례와 무관하게) **우리 코드가 먼저 편집을 강제
종료**시켰다. "IME는 브라우저에 맡긴다"는 이 컴포넌트의 핵심 전제(`docs/
canvas-editor.md`)를 스스로 어기고 있던 셈. `if (e.isComposing) return;` 가드
하나로 고쳤고, `ime.spec.ts`의 "조합 도중 Escape는 조각 편집을 끝내지 않는다"가
이 회귀를 지킨다. 이런 종류의 버그는 `page.keyboard.type`(완성된 문자열을
그대로 꽂는 것)으로는 절대 못 잡는다 — 진짜 `isComposing` 상태를 만들어야만
드러난다.

### 무엇이 안 되는가 (한계)

- **Chromium 전용.** WebKit/Firefox는 CDP가 없어 불가.
- OS IME의 **2벌식 자모 결합 알고리즘**(ㄱ+ㅏ→가)이나 **OS 레벨 keydown/keyCode 229
  타이밍**을 재현하지 못한다. `imeSetComposition`에 넘기는 조합 문자열은 테스트가
  손으로 미리 계산해 넣어주는 것이라, "특정 키 시퀀스를 빠르게 쳤을 때만 나는
  타이밍 의존 버그"는 여전히 못 잡는다.
- 결국 **OS·IME 타이밍에 의존하는 회귀는 계속 수동 검증**(`bun run dev` + 직접 입력 +
  콘솔 코드포인트 덤프) 영역으로 남는다. `ime.spec.ts` 이외의 나머지 spec은 여전히
  `page.keyboard.type`(완성된 문자열을 그대로 삽입)을 쓴다 — 조합 경로를 안 타는
  일반 상호작용 테스트에는 그걸로 충분하고 더 빠르다.

> 참고: Cypress·jsdom 기반은 실제 조합 파이프라인이 없어 IME 재현에 부적합하다.

## 로컬에서 돌리기

```bash
bunx playwright install chromium   # 최초 1회
bun run test:e2e                   # headless 1회 실행
bun run test:e2e:ui                # Playwright UI 모드(디버깅)
```

CI(Forgejo Actions) 연동은 아직 안 함 — 브라우저 바이너리 설치·캐싱을 self-hosted
러너에 세팅하는 별도 작업이 필요해 일단 로컬 전용으로 둔다.

Sources:

- https://github.com/microsoft/playwright/issues/5777
- https://playwright.dev/docs/api/class-cdpsession
- https://chromedevtools.github.io/devtools-protocol/tot/Input/
