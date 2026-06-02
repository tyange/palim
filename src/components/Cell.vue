<script setup lang="ts">
import {
  ACTIVE_CELL_FILL_COLOR,
  ACTIVE_CELL_STROKE_COLOR,
  DEFAULT_CELL_FILL_COLOR,
} from "../constants/editor.constant";
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
      :x="cell.col * cellSize"
      :y="cell.row * cellSize"
      :width="cellSize"
      :height="cellSize"
      :fill="DEFAULT_CELL_FILL_COLOR"
      stroke="#bda988"
      stroke-width="1"
      vector-effect="non-scaling-stroke"
    />
    <!-- 드래그로 선택된 셀: 반투명 하이라이트 -->
    <rect
      v-if="cell.selected"
      :x="cell.col * cellSize"
      :y="cell.row * cellSize"
      :width="cellSize"
      :height="cellSize"
      fill="#b07232"
      fill-opacity="0.22"
    />
    <!-- 활성 셀(조합 중 글자 또는 캐럿 위치): 깜박이는 border + bg -->
    <rect
      v-if="cell.active"
      class="active-cell"
      :x="cell.col * cellSize"
      :y="cell.row * cellSize"
      :width="cellSize"
      :height="cellSize"
      :fill="ACTIVE_CELL_FILL_COLOR"
      fill-opacity="0.45"
      :stroke="ACTIVE_CELL_STROKE_COLOR"
      stroke-width="2"
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
      v-if="cell.value"
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

<style scoped>
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
