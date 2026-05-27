<script setup lang="ts">
import { computed, ref } from "vue";
import type { CellKey, DisplayCell } from "../types/editor.types";
import Cell from "./Cell.vue";
import CellInput from "./CellInput.vue";

const rows = 12;
const cols = 16;
const cellSize = 32;
const width = cols * cellSize;
const height = rows * cellSize;
const cellKey = (row: number, col: number): CellKey => `${row}:${col}`;
const selectedCellKey = ref<null | CellKey>(null);

const cells = ref<Map<CellKey, DisplayCell>>(
  new Map(
    Array.from({ length: rows * cols }, (_, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;

      const cell: DisplayCell = {
        row,
        col,
        value: "",
        guides: {},
        selected: false,
      };

      return [cellKey(row, col), cell] as const;
    }),
  ),
);

function selectCell(key: CellKey) {
  const target = cells.value.get(key);

  if (!target) {
    return;
  }

  selectedCellKey.value = key;

  for (const cell of cells.value.values()) {
    cell.selected = false;
  }

  target.selected = true;
}

const selectedCell = computed(() => {
  if (!selectedCellKey.value) return null;
  return cells.value.get(selectedCellKey.value) ?? null;
});

const inputStyle = computed(() => {
  if (!selectedCell.value) return {};

  return {
    left: `${(selectedCell.value.col / cols) * 100}%`,
    top: `${(selectedCell.value.row / rows) * 100}%`,
    width: `${100 / cols}%`,
    height: `${100 / rows}%`,
  };
});

function handleInputCompleted(value: string) {
  if (!selectedCellKey.value) {
    return;
  }

  const currentSelectedCell = cells.value.get(selectedCellKey.value);

  if (!currentSelectedCell) {
    return;
  }

  currentSelectedCell.value = value;

  const generatedNextCellRowAndCol = selectedCellKey.value
    .split(":")
    .map((v) => Number(v));
  const nextCellKey = `${generatedNextCellRowAndCol[0]}:${generatedNextCellRowAndCol[1] + 1}`;
  selectCell(nextCellKey);
}
</script>

<template>
  <div
    class="relative max-w-full overflow-visible"
    :style="{
      width: `${width}px`,
      aspectRatio: `${cols} / ${rows}`,
    }"
  >
    <svg
      class="absolute inset-0 block h-full w-full border border-[#d7d1c6] bg-[#fffdf8]"
      :viewBox="`0 0 ${width} ${height}`"
      role="grid"
      aria-label="원고지 에디터"
      :aria-rowcount="rows"
      :aria-colcount="cols"
      xmlns="http://www.w3.org/2000/svg"
    >
      <Cell
        v-for="[key, cell] in cells"
        :key="key"
        :cell="cell"
        :cell-size="cellSize"
        @click="selectCell(key)"
      />
    </svg>
    <CellInput
      v-if="selectedCellKey"
      :key="selectedCellKey"
      class="absolute"
      :style="inputStyle"
      @completed="handleInputCompleted"
    />
  </div>
</template>
