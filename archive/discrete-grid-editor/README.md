# 아카이브 — 이산 격자 에디터 (CM6 + 좌표 맵, 2세대)

2026-09-11 아카이브. **활성 코드 아님** — `src/` 밖이라 컴파일·타입체크에서 제외된다.
참고·복원용으로만 남긴다.

## 무엇이었나

격자 모드를 "행·열(이산 격자) 위에 자소 하나씩"으로 구현한 2세대. 1세대(SVG 격자 +
숨은 textarea, `archive/svg-grid-editor/`)가 캐럿·IME를 직접 재구현하다 실패한 뒤,
**CodeMirror 6**(모노스페이스 텍스트 버퍼)로 다시 지었다.

- `GridEditor.vue` — CM6 위에 좌표 맵(`core/coord.ts`)을 투영. 문서를 항상 직사각형으로
  패딩해 어디든 클릭·타이핑 가능(`docs/grid-editor.md`에 자세한 기록). 방향키가 여백
  끝에서 안 막히게 하는 로직, 왼쪽 방향키가 이전 행으로 안 넘어가게 하는 로직, 반각
  문자(라틴·숫자) 자간 보정까지 상당히 다듬은 상태에서 걷어냈다.
- `GridPreview.vue` — `gridLayout`을 격자 칸 중앙에 그린 SVG 미리보기 + PNG/SVG export.
- `core/coord.ts` — 좌표 맵(`CoordDoc = Map<"행,열", 자소>`) ⇄ 문자열 순수 투영.
- `core/layout.ts`(`flowGraphemes`) · `core/tokenizer.ts`(`segmentGraphemes`) — 자소를
  평면 격자에 1:1로 배치하는 순수 로직. `GridPreview`·`gridLayout`이 이걸 썼다.

## 왜 걷어냈나

"시인은 도화지에 점 찍듯이 쓸 수도 있다"는 관점에서, **텍스트끼리 겹칠 수 있어야
한다**는 요구가 나왔다. 이산 격자(칸 하나 = 자소 하나)는 겹침을 원천적으로 표현할
수 없다 — 두 글자가 같은 칸을 가질 수 없으니까. 즉 "격자를 어떻게 더 다듬을까"가
아니라 **모델 자체가 이 요구를 못 담는** 상황이라 교체했다.

CM6(텍스트 버퍼)와 좌표 맵(이산 좌표)은 그 자체로는 문제 없이 잘 동작했다 —
`grid-editor.md`(이 폴더)에 왕복 테스트·방향키 버그 수정 기록이 남아 있다. 이번
교체는 "실패해서"가 아니라 "다른 걸 하려니 이 모델이 안 맞아서"다.

## 대체한 것

`src/components/CanvasEditor.vue` + `src/stores/manuscript.ts`의 `fragments`
(`{ id, x, y, text }[]`) — 연속 좌표에 독립된 텍스트 조각을 놓고, 서로 겹칠 수 있다.
조각마다 편집 시에만 진짜 `contenteditable`을 그 자리에 올려 IME·캐럿·undo를 브라우저
네이티브로 받는다(1세대가 실패한 "가상 캐럿 하나로 전체 캔버스를 흉내"와 다르다 —
겹침이 가능한 캔버스에서 왜 그게 더 나은 선택인지는 `docs/canvas-editor.md` 참고).
시안: `design-system/mockups/palim/freeform-canvas-directions.html`.

## 복원하려면

`GridEditor.vue`·`GridPreview.vue`를 `src/components/`로, `core/coord.ts`·`layout.ts`·
`tokenizer.ts`(+ 테스트)를 `src/core/`로 되돌린다. `stores/manuscript.ts`에 `doc`
(`shallowRef<CoordDoc>`)·`GRID` 상수·`gridLayout` computed를 되살리고 `text`를
`computed(() => textFromDoc(doc.value))`로. `EditorView.vue`·`PreviewOverlay.vue`에서
`CanvasEditor`/`CanvasPreview` 대신 다시 이 둘을 렌더한다.
