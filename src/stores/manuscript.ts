// 원고지 문서의 공유 스토어 — 에디터와 프리뷰가 같은 문서를 보도록 하나의 진실원천을 둔다.
//
// 단일 문서 앱이지만 앞으로 툴바(행/열·쓰기방향)·undo/redo·export 설정 등 상태가
// 늘어날 것을 고려해 Pinia 스토어로 둔다. GridEditor(입력·캐럿)와
// ManuscriptPreview(출력·SVG 저장)가 같은 text/layout을 구독해 항상 동일하게 렌더된다.

import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { flowToGrid, packCells } from "../core/layout";
import { tokenize } from "../core/tokenizer";

/** 격자 구성 (현재 고정값; 추후 툴바의 행/열 입력과 연결 가능). */
export const GRID = {
  rows: 12,
  cols: 16,
  cellSize: 32,
  gutterCols: 1, // ③ 행두 금칙으로 밀려난 구두점이 적히는 오른쪽 여백
} as const;

export const useManuscriptStore = defineStore("manuscript", () => {
  // 원본(source of truth): 원고지 전체 내용을 담는 단일 문자열.
  const text = ref("");

  // 레이아웃 엔진: 텍스트 → 토큰 분류(①) → 칸 묶기(②③) → 격자 배치(②③).
  // cellText / cellSpan / offsetToCell / margins 등을 한 번에 산출한다.
  const layout = computed(() =>
    flowToGrid(packCells(tokenize(text.value)), GRID.rows, GRID.cols),
  );

  return { text, layout };
});
