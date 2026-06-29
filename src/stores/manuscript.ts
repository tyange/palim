import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { flowGraphemes } from "../core/layout";

export const GRID = {
  cellSize: 32,
  minCols: 20,
  minRows: 12,
} as const;

export const FLOW = {
  width: 500,
  fontSize: 18,
  lineHeight: 30,
  padX: 16,
  padY: 16,
} as const;

export type WritingMode = "grid" | "flow";

export const useManuscriptStore = defineStore("manuscript", () => {
  const text = ref("");
  const mode = ref<WritingMode>("grid");

  const gridLayout = computed(() =>
    flowGraphemes(text.value, GRID.minCols, GRID.minRows),
  );

  return { text, mode, gridLayout };
});
