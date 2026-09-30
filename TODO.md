# TODO

## 원고 영속화

**새로고침하면 원고가 사라집니다.** `stores/manuscript.ts`의 `fragments`, `text`,
`mode`는 메모리에만 있습니다. 새로고침하면 기본 예시로 돌아갑니다. 지금 영속화되는
것은 `stores/editorUi.ts`의 `typewriter` 하나뿐입니다.

- `fragments`, `text`, `mode`를 `useLocalStorage`로 옮깁니다. `editorUi.ts`에서 이미
  쓰는 방식입니다.
- `fragId`의 모듈 스코프 `seq`가 복원된 id와 겹치지 않게 맞춥니다. 복원한 id 중
  최댓값에서 이어 세면 됩니다.
- undo 히스토리는 영속화하지 않습니다. 새로고침 후 빈 스택에서 시작해도 되는지
  확인합니다.
- `docs/canvas-editor.md`와 CLAUDE.md의 스토어 설명을 갱신하고 e2e에 새로고침 후
  복원 케이스를 추가합니다.

## 옛 모델을 설명하는 문서 정리

**docs가 아카이브된 코드를 설명합니다.** 9/11 연속 좌표 전환 이후 갱신되지 않은
부분이 남아 있습니다. docs 전체에서 `GridEditor`, `Cell.vue`, `GridPreview` 참조가
17곳입니다.

- `docs/architecture.md`: 상단에 "상세 재작성은 후속" 배너만 있고 본문은
  `offset`, `segmentGraphemes`, `flowGraphemes`, `GridLayout` 등 이산 격자 시절
  설명입니다. 현재 모델 기준으로 다시 씁니다.
- `docs/rendering-and-export.md`: "격자 모드" 절이 `GridEditor.vue`, `Cell.vue`,
  `GridPreview.vue`와 `cell-rect`, `cell-caret` 같은 옛 칸 렌더링을 설명합니다.
  `CanvasEditor.vue`, `CanvasPreview.vue` 기준으로 바꿉니다.
- 나머지 문서의 옛 참조도 `grep -n "GridEditor\|Cell.vue\|GridPreview" docs/*.md`로
  찾아 정리합니다.
