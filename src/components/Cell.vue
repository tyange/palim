<script setup lang="ts">
import {
  DEFAULT_CELL_FILL_COLOR,
  SELECTED_CELL_FILL_COLOR,
} from "../constants/editor.constant";
import type { DisplayCell } from "../types/editor.types.ts";

const props = defineProps<{
  cell: DisplayCell;
  cellSize: number;
}>();
</script>

<template>
  <g
    :key="`${cell.row}-${cell.col}`"
    role="gridcell"
    :aria-rowindex="cell.row + 1"
    :aria-colindex="cell.col + 1"
    :aria-selected="cell.selected"
  >
    <rect
      :x="cell.col * cellSize"
      :y="cell.row * cellSize"
      :width="cellSize"
      :height="cellSize"
      :fill="cell.selected ? SELECTED_CELL_FILL_COLOR : DEFAULT_CELL_FILL_COLOR"
      stroke="#bda988"
      stroke-width="1"
      vector-effect="non-scaling-stroke"
    />
    <line
      v-if="cell.guides.borderLeft"
      :x1="cell.col * cellSize"
      :y1="cell.row * cellSize"
      :x2="cell.col * cellSize"
      :y2="(cell.row + 1) * cellSize"
      stroke="rgba(176,114,50,0.36)"
      stroke-width="2"
      vector-effect="non-scaling-stroke"
    />
    <line
      v-if="cell.guides.borderRight"
      :x1="(cell.col + 1) * cellSize"
      :y1="cell.row * cellSize"
      :x2="(cell.col + 1) * cellSize"
      :y2="(cell.row + 1) * cellSize"
      stroke="rgba(176,114,50,0.36)"
      stroke-width="2"
      vector-effect="non-scaling-stroke"
    />
    <line
      v-if="cell.guides.centerVertical"
      :x1="cell.col * cellSize + cellSize / 2"
      :y1="cell.row * cellSize"
      :x2="cell.col * cellSize + cellSize / 2"
      :y2="(cell.row + 1) * cellSize"
      stroke="rgba(176,114,50,0.36)"
      stroke-width="1"
      vector-effect="non-scaling-stroke"
    />
    <line
      v-if="cell.guides.centerHorizontal"
      :x1="cell.col * cellSize"
      :y1="cell.row * cellSize + cellSize / 2"
      :x2="(cell.col + 1) * cellSize"
      :y2="cell.row * cellSize + cellSize / 2"
      stroke="rgba(176,114,50,0.36)"
      stroke-width="1"
      vector-effect="non-scaling-stroke"
    />
    <line
      v-if="cell.guides.diagonalForward"
      :x1="cell.col * cellSize"
      :y1="(cell.row + 1) * cellSize"
      :x2="(cell.col + 1) * cellSize"
      :y2="cell.row * cellSize"
      stroke="rgba(176,114,50,0.36)"
      stroke-width="1"
      vector-effect="non-scaling-stroke"
    />
    <line
      v-if="cell.guides.diagonalBackward"
      :x1="cell.col * cellSize"
      :y1="cell.row * cellSize"
      :x2="(cell.col + 1) * cellSize"
      :y2="(cell.row + 1) * cellSize"
      stroke="rgba(176,114,50,0.36)"
      stroke-width="1"
      vector-effect="non-scaling-stroke"
    />
    <text
      v-if="!cell.selected && cell.value"
      :x="cell.col * cellSize + cellSize / 2"
      :y="cell.row * cellSize + cellSize / 2"
      dominant-baseline="central"
      text-anchor="middle"
      fill="#1f1a14"
      font-size="18"
    >
      {{ cell.value }}
    </text>
  </g>
</template>
