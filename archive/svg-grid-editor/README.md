# 아카이브 — SVG 격자 에디터 (커스텀 편집 표면 1세대)

2026-09-09 아카이브. **활성 코드 아님** — `src/` 밖이라 컴파일·타입체크에서 제외된다.
참고·복원용으로만 남긴다.

## 무엇이었나

격자 모드의 편집 표면을 SVG 격자 + 화면 밖 1px 숨은 `<textarea>`로 직접 구현했다.

- `GridEditor.vue` — 입력·캐럿·IME 조합·드래그 선택을 전부 손으로 처리. `virtualCell`
  (빈 칸에 놓은 가상 캐럿)과 `materializeCaret`(입력 직전에만 텍스트로 실체화)이 핵심.
- `Cell.vue` — 칸 1개를 SVG `<g>`로.
- `editor.types.ts` — `DisplayCell`.
- `editor-input-model.md` — 캐럿·IME·가상 칸·선택 모델 상세.
- `korean-ime-bug.md` — 한국어 IME 조합 중 자모 탈락 버그 분석.

핵심 아이디어(유지 가치 있음): **빈 2D 공간을 클릭해 그 위치에 바로 캐럿을 놓는다**
(스페이스·엔터를 직접 안 쳐도 됨). 배치형(구체) 시 입력에 유용했다.

## 왜 걷어냈나

- 브라우저가 공짜로 주는 것(캐럿·IME·선택·undo/redo·클립보드)을 전부 재구현해야 했고,
  그 과정에서 버그가 잦았다(숨은 textarea 미초기화로 본문 소실, 클릭-캐럿이 0으로 튐,
  IME 조합 중 자모 탈락 등 — `korean-ime-bug.md`).
- headless UI 라이브러리(Reka UI)는 텍스트 편집 프리미티브가 없어 이 부분을 도와줄 수
  없다. "Reka로 만든 에디터"는 결국 이 커스텀 코드와 같다.

→ 편집 표면을 **표준 `<textarea>`**(브라우저 네이티브)로 다시 시작한다. `text` 문자열이
곧 2D 배치라는 모델(공백+줄바꿈)과 `core/`(`flowGraphemes`·`GridLayout`)·`GridPreview`
(미리보기·내보내기)는 그대로 재사용한다.

## 복원하려면

`GridEditor.vue`·`Cell.vue`를 `src/components/`로, `editor.types.ts`를 `src/types/`로
되돌리고 `EditorView.vue`에서 다시 렌더한다. `stores/editorUi.ts`의 `focusMode`와
`stores/manuscript.ts`의 `GRID.colSize`/`rowSize`도 함께 되살려야 한다.
