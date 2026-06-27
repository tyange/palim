<script setup lang="ts">
import { CornerDownLeft } from "lucide-vue-next";
import { storeToRefs } from "pinia";
import { computed, onMounted, onUnmounted, ref, useTemplateRef } from "vue";
import { GRID, useManuscriptStore } from "../stores/manuscript";
import type { DisplayCell } from "../types/editor.types";
import Cell from "./Cell.vue";

const { rows, cols, cellSize, gutterCols } = GRID;
const MARK_SIZE = 16;

const width = cols * cellSize;
const totalWidth = (cols + gutterCols) * cellSize;
const height = rows * cellSize;

function softWrapPath(r: number): string {
  const boundary = (r + 1) * cellSize;
  const half = cellSize * 0.3;
  const x0 = width + 4;
  const xBulge = width + cellSize * 0.5;
  const yTop = boundary - half;
  const yBot = boundary + half;
  return `M ${x0} ${yTop} C ${xBulge} ${yTop} ${xBulge} ${yBot} ${x0} ${yBot}`;
}

const inputRef = useTemplateRef<HTMLTextAreaElement>("inputEl");

const { text, layout } = storeToRefs(useManuscriptStore());

const caretIndex = ref(0);
const virtualCell = ref<number | null>(null);
const caretBeforeCell = ref<number | null>(null);
const isComposing = ref(false);
const composingText = ref("");

function syncFromInput() {
  const el = inputRef.value;
  if (!el) return;
  clearSelection();
  virtualCell.value = null;
  caretBeforeCell.value = null;
  text.value = el.value;
  caretIndex.value = el.selectionStart ?? el.value.length;
}

function syncCaret() {
  const el = inputRef.value;
  if (!el) return;
  clearSelection();
  caretBeforeCell.value = null;
  caretIndex.value = el.selectionStart ?? el.value.length;
}

function onCompositionUpdate(event: CompositionEvent) {
  composingText.value = event.data ?? "";
  const el = inputRef.value;
  if (el) caretIndex.value = el.selectionStart ?? el.value.length;
}

function onCompositionStart() {
  materializeCaret();
  isComposing.value = true;
}

function onCompositionEnd() {
  isComposing.value = false;
  composingText.value = "";
}

function caretCell(offset: number): number {
  const L = layout.value;
  if (offset >= text.value.length) return L.endCellIndex;
  const direct = L.offsetToCell.get(offset);
  if (direct !== undefined) return direct;
  for (let i = 0; i < L.cellSpan.length; i++) {
    const s = L.cellSpan[i];
    if (s && offset >= s[0] && offset < s[1]) return i;
  }
  return L.endCellIndex;
}

function materializeCaret() {
  if (virtualCell.value === null) return;
  const target = virtualCell.value;
  const { cellSpan } = layout.value;
  let insertAt = 0;
  let prevCell = -1;
  for (let i = target - 1; i >= 0; i--) {
    const s = cellSpan[i];
    if (s) {
      insertAt = s[1];
      prevCell = i;
      break;
    }
  }

  const caretRow = Math.floor((prevCell + 1) / cols);
  const targetRow = Math.floor(target / cols);

  const pad =
    targetRow > caretRow
      ? "\n".repeat(targetRow - caretRow) + " ".repeat(target % cols)
      : " ".repeat(target - prevCell - 1);
  const next = text.value.slice(0, insertAt) + pad + text.value.slice(insertAt);
  const offset = insertAt + pad.length;
  text.value = next;
  caretIndex.value = offset;
  virtualCell.value = null;
  const el = inputRef.value;
  if (el) {
    el.value = next;
    el.setSelectionRange(offset, offset);
  }
}

function moveCaretToCellIndex(cellIndex: number) {
  const span = layout.value.cellSpan[cellIndex];
  const el = inputRef.value;
  virtualCell.value = null;
  caretBeforeCell.value = null;
  if (span) {
    const atLineHead = cellIndex % cols === 0;
    const pos = atLineHead ? span[0] : span[1];
    if (atLineHead) caretBeforeCell.value = cellIndex;
    caretIndex.value = pos;
    if (el) {
      el.focus();
      el.setSelectionRange(pos, pos);
    }
  } else {
    virtualCell.value = cellIndex;
    const end = text.value.length;
    caretIndex.value = end;
    if (el) {
      el.focus();
      el.setSelectionRange(end, end);
    }
  }
}

const isDragging = ref(false);
const dragAnchorCell = ref<number | null>(null);
const dragFocusCell = ref<number | null>(null);

const selectionRange = computed(() => {
  if (dragAnchorCell.value === null || dragFocusCell.value === null)
    return null;
  return {
    min: Math.min(dragAnchorCell.value, dragFocusCell.value),
    max: Math.max(dragAnchorCell.value, dragFocusCell.value),
  };
});

const hasSelection = computed(
  () =>
    selectionRange.value !== null &&
    selectionRange.value.min !== selectionRange.value.max,
);

function clearSelection() {
  dragAnchorCell.value = null;
  dragFocusCell.value = null;
}

function onCellMouseDown(cell: DisplayCell) {
  const idx = cell.row * cols + cell.col;
  isDragging.value = true;
  dragAnchorCell.value = idx;
  dragFocusCell.value = idx;
  inputRef.value?.focus();
}

function onCellMouseEnter(cell: DisplayCell) {
  if (!isDragging.value) return;
  dragFocusCell.value = cell.row * cols + cell.col;
}

function endDrag() {
  if (!isDragging.value) return;
  isDragging.value = false;
  if (!hasSelection.value && dragFocusCell.value !== null) {
    moveCaretToCellIndex(dragFocusCell.value);
    clearSelection();
  }
}

function deleteSelection(): void {
  const range = selectionRange.value;
  if (!range || range.min === range.max) return;

  const { cellSpan } = layout.value;
  let firstStart = Infinity;
  let lastEnd = -1;
  for (let i = range.min; i <= range.max; i++) {
    const s = cellSpan[i];
    if (!s) continue;
    if (s[0] < firstStart) firstStart = s[0];
    if (s[1] > lastEnd) lastEnd = s[1];
  }

  clearSelection();
  if (lastEnd < 0) return;

  const next = text.value.slice(0, firstStart) + text.value.slice(lastEnd);
  text.value = next;
  caretIndex.value = firstStart;

  const el = inputRef.value;
  if (el) {
    el.value = next;
    el.focus();
    el.setSelectionRange(firstStart, firstStart);
  }
}

const arrowDelta: Record<string, readonly [number, number]> = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
};

function currentCell(): number {
  if (virtualCell.value !== null) return virtualCell.value;
  if (caretBeforeCell.value !== null) return caretBeforeCell.value;
  if (caretIndex.value > 0) return caretCell(caretIndex.value - 1);
  return caretCell(caretIndex.value);
}

function navByDelta(delta: readonly [number, number], origin: number) {
  const r = Math.floor(origin / cols) + delta[0];
  const c = (origin % cols) + delta[1];
  if (r < 0 || r >= rows || c < 0 || c >= cols) return;
  moveCaretToCellIndex(r * cols + c);
}

function startsTextInput(e: KeyboardEvent): boolean {
  if (e.ctrlKey || e.metaKey || e.altKey) return false;
  const imeKeyCode = (e as { keyCode?: number }).keyCode === 229;
  if (imeKeyCode || e.key === "Process") return true;
  if (e.key === "Enter") return true;
  return [...e.key].length === 1;
}

function onKeyDown(event: KeyboardEvent) {
  if (event.key === "Backspace") {
    if (isComposing.value) return;
    if (hasSelection.value) {
      event.preventDefault();
      deleteSelection();
    } else if (virtualCell.value !== null) {
      event.preventDefault();
      if (virtualCell.value > 0) moveCaretToCellIndex(virtualCell.value - 1);
    }
    return;
  }

  const delta = arrowDelta[event.key];
  if (delta) {
    if (isComposing.value) return;
    event.preventDefault();
    navByDelta(delta, currentCell());
    return;
  }

  if (
    !isComposing.value &&
    virtualCell.value !== null &&
    startsTextInput(event)
  ) {
    materializeCaret();
  }
}

const cells = computed<DisplayCell[]>(() => {
  const L = layout.value;

  const activeCells = new Set<number>();
  if (isComposing.value && composingText.value) {
    const start = caretIndex.value - composingText.value.length;
    for (let i = 0; i < L.cellSpan.length; i++) {
      const s = L.cellSpan[i];
      if (s && s[1] > start && s[0] < caretIndex.value) activeCells.add(i);
    }
    if (activeCells.size === 0) activeCells.add(caretCell(caretIndex.value));
  } else {
    activeCells.add(currentCell());
  }

  const range = selectionRange.value;
  const selecting = range !== null && range.min !== range.max;

  return Array.from({ length: rows * cols }, (_, index) => ({
    row: Math.floor(index / cols),
    col: index % cols,
    value: L.cellText[index] ?? "",
    guides: {},
    selected: selecting
      ? index >= range.min && index <= range.max && L.cellText[index] !== ""
      : false,
    active: !selecting && activeCells.has(index),
  }));
});

onMounted(() => {
  inputRef.value?.focus();
  window.addEventListener("mouseup", endDrag);
});

onUnmounted(() => {
  window.removeEventListener("mouseup", endDrag);
});
</script>

<template>
  <div
    class="flex max-w-full flex-col gap-2"
    :style="{ width: `${totalWidth}px` }"
  >
    <div
      class="relative w-full overflow-visible"
      :style="{ aspectRatio: `${cols + gutterCols} / ${rows}` }"
    >
      <svg
        class="absolute inset-0 block h-full w-full"
        :viewBox="`0 0 ${totalWidth} ${height}`"
        role="grid"
        aria-label="원고지 에디터"
        :aria-rowcount="rows"
        :aria-colcount="cols"
        xmlns="http://www.w3.org/2000/svg"
      >
        <Cell
          v-for="cell in cells"
          :key="`${cell.row}:${cell.col}`"
          :cell="cell"
          :cell-size="cellSize"
          @cellmousedown="onCellMouseDown"
          @cellmouseenter="onCellMouseEnter"
        />

        <g
          v-for="nl in layout.newlines"
          :key="`nl:${nl.offset}`"
          class="newline-mark"
          :transform="`translate(${nl.col * cellSize + (cellSize - MARK_SIZE) / 2}, ${nl.row * cellSize + (cellSize - MARK_SIZE) / 2})`"
          aria-hidden="true"
        >
          <CornerDownLeft :size="MARK_SIZE" />
        </g>

        <path
          v-for="r in layout.softWraps"
          :key="`sw:${r}`"
          class="softwrap-mark"
          :d="softWrapPath(r)"
          fill="none"
          stroke-width="1.5"
          stroke-linecap="round"
          vector-effect="non-scaling-stroke"
          aria-hidden="true"
        />

        <text
          v-for="m in layout.margins"
          :key="`margin:${m.offset}`"
          class="margin-text"
          :x="width + cellSize / 2"
          :y="m.row * cellSize + cellSize / 2"
          dominant-baseline="central"
          text-anchor="middle"
          font-size="18"
        >
          {{ m.text }}
        </text>

        <rect
          class="grid-frame"
          x="0"
          y="0"
          :width="width"
          :height="height"
          fill="none"
          stroke-width="1.5"
          vector-effect="non-scaling-stroke"
        />
      </svg>

      <textarea
        ref="inputEl"
        aria-label="원고지 입력"
        class="absolute left-0 top-0 h-px w-px resize-none overflow-hidden border-0 p-0 opacity-0"
        style="pointer-events: none"
        @beforeinput="materializeCaret"
        @input="syncFromInput"
        @keydown="onKeyDown"
        @keyup="syncCaret"
        @click="syncCaret"
        @select="syncCaret"
        @compositionstart="onCompositionStart"
        @compositionupdate="onCompositionUpdate"
        @compositionend="onCompositionEnd"
      />
    </div>
  </div>
</template>

<style scoped>
.grid-frame {
  stroke: var(--border);
}
.margin-text {
  fill: var(--muted);
  font-family: var(--font-manuscript);
}
.newline-mark {
  color: var(--muted);
  opacity: 0.55;
  pointer-events: none;
}
.softwrap-mark {
  stroke: var(--muted);
  opacity: 0.5;
  pointer-events: none;
}
</style>
