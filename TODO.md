# TODO

> 원고 영속화는 다중 문서와 localStorage 자동저장으로 해결했습니다(`docs/documents.md`). `mode`와 undo 히스토리는 저장하지 않습니다.

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
