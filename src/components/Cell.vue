<script setup lang="ts">
import { computed } from "vue";
import type { DisplayCell } from "../types/editor.types.ts";

const props = defineProps<{
  cell: DisplayCell;
  colSize: number;
  rowSize: number;
}>();

const emit = defineEmits<{
  cellmousedown: [cell: DisplayCell];
  cellmouseenter: [cell: DisplayCell];
}>();

const x = computed(() => props.cell.col * props.colSize);
const y = computed(() => props.cell.row * props.rowSize);

const glyphBox = computed(() =>
  Math.min(props.rowSize - 4, props.colSize * 1.3),
);
const boxX = computed(() => x.value + (props.colSize - glyphBox.value) / 2);
const boxY = computed(() => y.value + (props.rowSize - glyphBox.value) / 2);
const radius = computed(() => glyphBox.value * 0.32);
</script>

<template>
  <g
    :key="`${cell.row}-${cell.col}`"
    class="cell-group"
    role="gridcell"
    :aria-rowindex="cell.row + 1"
    :aria-colindex="cell.col + 1"
    :aria-selected="cell.selected"
    :class="{ 'cell-group--dim': cell.dim }"
    @mousedown.prevent="emit('cellmousedown', cell)"
    @mouseenter="emit('cellmouseenter', cell)"
  >
    <rect class="cell-rect" :x="x" :y="y" :width="colSize" :height="rowSize" />
    <rect
      v-if="cell.selected"
      class="cell-selected"
      :x="x"
      :y="y"
      :width="colSize"
      :height="rowSize"
    />
    <rect
      v-if="cell.active"
      class="cell-caret"
      :x="boxX"
      :y="boxY"
      :width="glyphBox"
      :height="glyphBox"
      :rx="radius"
      :ry="radius"
    />
    <text
      v-if="cell.value"
      class="cell-text"
      :x="x + colSize / 2"
      :y="y + rowSize / 2"
      dominant-baseline="central"
      text-anchor="middle"
      font-size="20"
    >
      {{ cell.value }}
    </text>
  </g>
</template>

<style scoped>
.cell-rect {
  fill: var(--cell-bg);
  pointer-events: all;
}
.cell-selected {
  fill: var(--accent);
  fill-opacity: 0.16;
}
.cell-caret {
  fill: var(--cell-active);
}
.cell-text {
  fill: var(--foreground);
  font-family: var(--font-manuscript);
}

@keyframes caret-breathe {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.cell-caret {
  animation: caret-breathe 1.2s ease-in-out infinite;
  transform-box: fill-box;
}

.cell-group {
  cursor: text;
  transition: opacity 0.18s ease;
}
.cell-group--dim {
  opacity: 0.28;
}

@media (prefers-reduced-motion: reduce) {
  .cell-caret {
    animation: none;
  }
}
</style>
