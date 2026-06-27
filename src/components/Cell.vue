<script setup lang="ts">
import type { DisplayCell } from "../types/editor.types.ts";

defineProps<{
  cell: DisplayCell;
  cellSize: number;
}>();

const emit = defineEmits<{
  cellmousedown: [cell: DisplayCell];
  cellmouseenter: [cell: DisplayCell];
}>();
</script>

<template>
  <g
    :key="`${cell.row}-${cell.col}`"
    class="cell-group"
    role="gridcell"
    :aria-rowindex="cell.row + 1"
    :aria-colindex="cell.col + 1"
    :aria-selected="cell.selected"
    @mousedown.prevent="emit('cellmousedown', cell)"
    @mouseenter="emit('cellmouseenter', cell)"
  >
    <rect
      class="cell-rect"
      :x="cell.col * cellSize"
      :y="cell.row * cellSize"
      :width="cellSize"
      :height="cellSize"
      stroke-width="1"
      vector-effect="non-scaling-stroke"
    />
    <rect
      v-if="cell.selected"
      class="cell-selected"
      :x="cell.col * cellSize"
      :y="cell.row * cellSize"
      :width="cellSize"
      :height="cellSize"
    />
    <rect
      v-if="cell.active"
      class="active-cell cell-caret"
      :x="cell.col * cellSize"
      :y="cell.row * cellSize"
      :width="cellSize"
      :height="cellSize"
      stroke-width="2"
      vector-effect="non-scaling-stroke"
    />
    <line
      v-if="cell.guides.borderLeft"
      class="cell-guide"
      :x1="cell.col * cellSize"
      :y1="cell.row * cellSize"
      :x2="cell.col * cellSize"
      :y2="(cell.row + 1) * cellSize"
      stroke-width="2"
      vector-effect="non-scaling-stroke"
    />
    <line
      v-if="cell.guides.borderRight"
      class="cell-guide"
      :x1="(cell.col + 1) * cellSize"
      :y1="cell.row * cellSize"
      :x2="(cell.col + 1) * cellSize"
      :y2="(cell.row + 1) * cellSize"
      stroke-width="2"
      vector-effect="non-scaling-stroke"
    />
    <line
      v-if="cell.guides.centerVertical"
      class="cell-guide"
      :x1="cell.col * cellSize + cellSize / 2"
      :y1="cell.row * cellSize"
      :x2="cell.col * cellSize + cellSize / 2"
      :y2="(cell.row + 1) * cellSize"
      stroke-width="1"
      vector-effect="non-scaling-stroke"
    />
    <line
      v-if="cell.guides.centerHorizontal"
      class="cell-guide"
      :x1="cell.col * cellSize"
      :y1="cell.row * cellSize + cellSize / 2"
      :x2="(cell.col + 1) * cellSize"
      :y2="cell.row * cellSize + cellSize / 2"
      stroke-width="1"
      vector-effect="non-scaling-stroke"
    />
    <line
      v-if="cell.guides.diagonalForward"
      class="cell-guide"
      :x1="cell.col * cellSize"
      :y1="(cell.row + 1) * cellSize"
      :x2="(cell.col + 1) * cellSize"
      :y2="cell.row * cellSize"
      stroke-width="1"
      vector-effect="non-scaling-stroke"
    />
    <line
      v-if="cell.guides.diagonalBackward"
      class="cell-guide"
      :x1="cell.col * cellSize"
      :y1="cell.row * cellSize"
      :x2="(cell.col + 1) * cellSize"
      :y2="(cell.row + 1) * cellSize"
      stroke-width="1"
      vector-effect="non-scaling-stroke"
    />
    <text
      v-if="cell.value"
      class="cell-text"
      :x="cell.col * cellSize + cellSize / 2"
      :y="cell.row * cellSize + cellSize / 2"
      dominant-baseline="central"
      text-anchor="middle"
      font-size="18"
    >
      {{ cell.value }}
    </text>
  </g>
</template>

<style scoped>
.cell-rect {
  fill: var(--cell-bg);
  stroke: var(--grid-line);
}
.cell-selected {
  fill: var(--accent);
  fill-opacity: 0.16;
}
.cell-caret {
  fill: var(--accent);
  fill-opacity: 0.12;
  stroke: var(--accent);
}
.cell-guide {
  stroke: var(--grid-guide);
}
.cell-text {
  fill: var(--foreground);
  font-family: var(--font-manuscript);
}

@keyframes active-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}

.active-cell {
  animation: active-pulse 1s ease-in-out infinite;
  transform-box: fill-box;
}

.cell-group {
  cursor: pointer;
}
</style>
