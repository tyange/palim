import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { flowToGrid, packCells } from "../core/layout";
import { tokenize } from "../core/tokenizer";

export const GRID = {
  rows: 12,
  cols: 16,
  cellSize: 32,
  gutterCols: 1,
} as const;

export const useManuscriptStore = defineStore("manuscript", () => {
  const text = ref("");

  const layout = computed(() =>
    flowToGrid(packCells(tokenize(text.value)), GRID.rows, GRID.cols),
  );

  return { text, layout };
});
