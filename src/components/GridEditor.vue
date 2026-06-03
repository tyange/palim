<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, useTemplateRef } from "vue";
import { packCells, flowToGrid } from "../core/layout";
import { tokenize } from "../core/tokenizer";
import type { DisplayCell } from "../types/editor.types";
import Cell from "./Cell.vue";

const rows = 12;
const cols = 16;
const cellSize = 32;
const gutterCols = 1; // ③ 행두 금칙으로 밀려난 구두점이 적히는 오른쪽 여백
const width = cols * cellSize; // 격자 폭
const totalWidth = (cols + gutterCols) * cellSize; // 여백 포함 전체 폭
const height = rows * cellSize;

const inputRef = useTemplateRef<HTMLTextAreaElement>("inputEl");

// 원본(source of truth): 원고지 전체 내용을 담는 단일 문자열
const text = ref("");

// IME 조합 상태: 아직 compositionend 되지 않은(미확정) 글자 추적
// caretIndex / composingText 길이는 모두 UTF-16 단위 (textarea selectionStart와 동일 좌표계)
const caretIndex = ref(0);
const isComposing = ref(false);
const composingText = ref("");

// 레이아웃 엔진: 텍스트 → 토큰 분류(①) → 칸 묶기(②③) → 격자 배치(②③)
// cellText / cellSpan / offsetToCell / margins 등을 한 번에 산출한다.
const layout = computed(() => flowToGrid(packCells(tokenize(text.value)), rows, cols));

function syncFromInput() {
  const el = inputRef.value;
  if (!el) return;
  clearSelection();
  text.value = el.value;
  caretIndex.value = el.selectionStart ?? el.value.length;
}

function syncCaret() {
  const el = inputRef.value;
  if (!el) return;
  clearSelection();
  caretIndex.value = el.selectionStart ?? el.value.length;
}

function onCompositionUpdate(event: CompositionEvent) {
  composingText.value = event.data ?? "";
  const el = inputRef.value;
  if (el) caretIndex.value = el.selectionStart ?? el.value.length;
}

function onCompositionEnd() {
  isComposing.value = false;
  composingText.value = "";
}

// 캐럿(UTF-16 offset)이 놓인 칸 인덱스를 구한다.
// - 글 끝이면 다음 입력 칸(endCellIndex)
// - 토큰 시작 offset이면 그 칸
// - 한 칸 2자소(숫자·소문자)의 중간 offset이면 그 칸의 span으로 판정
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

// 셀 클릭: 그 칸 첫 글자의 offset으로 캐럿 이동. 빈 칸은 글 끝으로.
// 네이티브 textarea가 실제 입력 위치이므로 focus + setSelectionRange로 함께 옮긴다.
function moveCaretToCellIndex(cellIndex: number) {
  const span = layout.value.cellSpan[cellIndex];
  const offset = span ? span[0] : text.value.length;
  caretIndex.value = offset;
  const el = inputRef.value;
  if (el) {
    el.focus();
    el.setSelectionRange(offset, offset);
  }
}

// 드래그 선택: 셀 단위로 anchor~focus 범위를 추적한다.
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

// 두 칸 이상 걸쳐야 '선택'으로 간주 (한 칸 클릭은 캐럿 이동)
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
  // 셀은 SVG라 직접 포커스를 못 받음 → backspace/타이핑이 닿도록 숨은 textarea에 포커스
  inputRef.value?.focus();
}

function onCellMouseEnter(cell: DisplayCell) {
  if (!isDragging.value) return;
  dragFocusCell.value = cell.row * cols + cell.col;
}

// 드래그 종료(window mouseup). 드래그 없이 같은 칸에서 끝났으면 클릭 → 캐럿 이동.
function endDrag() {
  if (!isDragging.value) return;
  isDragging.value = false;
  if (!hasSelection.value && dragFocusCell.value !== null) {
    moveCaretToCellIndex(dragFocusCell.value);
    clearSelection();
  }
}

// 선택 밴드(min~max 셀)가 덮는 UTF-16 offset 구간을 구해 원본에서 통째로 잘라낸다.
// (사이에 낀 줄바꿈도 함께 제거되어 줄이 깔끔히 당겨짐)
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
  if (lastEnd < 0) return; // 선택 밴드에 글자가 없음

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

function onKeyDown(event: KeyboardEvent) {
  if (event.key === "Backspace" && hasSelection.value && !isComposing.value) {
    event.preventDefault();
    deleteSelection();
    return;
  }

  if ((event.key === "ArrowUp" || event.key === "ArrowDown") && !isComposing.value) {
    event.preventDefault();
    const cellIdx = caretCell(caretIndex.value);
    const row = Math.floor(cellIdx / cols);
    const col = cellIdx % cols;
    const targetRow = event.key === "ArrowUp" ? row - 1 : row + 1;
    if (targetRow < 0 || targetRow >= rows) return;
    moveCaretToCellIndex(targetRow * cols + col);
  }
}

const cells = computed<DisplayCell[]>(() => {
  const L = layout.value;

  // 활성 칸: 조합 중이면 조합 글자가 놓인 칸들, 아니면 캐럿(다음 입력) 칸
  const activeCells = new Set<number>();
  if (isComposing.value && composingText.value) {
    const start = caretIndex.value - composingText.value.length;
    for (let i = 0; i < L.cellSpan.length; i++) {
      const s = L.cellSpan[i];
      if (s && s[1] > start && s[0] < caretIndex.value) activeCells.add(i);
    }
    if (activeCells.size === 0) activeCells.add(caretCell(caretIndex.value));
  } else {
    activeCells.add(caretCell(caretIndex.value));
  }

  const range = selectionRange.value;
  const selecting = range !== null && range.min !== range.max;

  return Array.from({ length: rows * cols }, (_, index) => ({
    row: Math.floor(index / cols),
    col: index % cols,
    value: L.cellText[index] ?? "",
    guides: {},
    // 선택 밴드 안에서 실제 글자가 있는 칸만 하이라이트
    selected: selecting
      ? index >= range.min && index <= range.max && L.cellText[index] !== ""
      : false,
    // 선택 중에는 캐럿 강조를 숨겨 혼동 방지
    active: !selecting && activeCells.has(index),
  }));
});

// 초기 로드 직후에도 타이핑 가능하도록 숨은 입력칸에 포커스
onMounted(() => {
  inputRef.value?.focus();
  // 드래그가 격자 밖에서 끝나도 종료되도록 전역에서 mouseup 수신
  window.addEventListener("mouseup", endDrag);
});

onUnmounted(() => {
  window.removeEventListener("mouseup", endDrag);
});
</script>

<template>
  <div class="flex max-w-full flex-col gap-2" :style="{ width: `${totalWidth}px` }">
    <!-- 격자 박스: SVG가 absolute로 이 박스를 채움 -->
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

        <!-- ③ 행두 금칙으로 앞 줄 오른쪽 여백에 적힌 구두점 -->
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

        <!-- 편집 가능한 그리드 영역을 구분하는 외곽 프레임 -->
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

      <!--
        화면에 안 보이지만 포커스 가능한 textarea가 키보드/IME 입력을 수집한다.
        SVG 격자는 직접 IME 조합을 받을 수 없으므로(편집 가능 요소만 가능) 이 숨은
        textarea가 입력을 받고, 셀 클릭 시 moveCaretToCellIndex가 focus +
        setSelectionRange로 캐럿을 옮긴다.

        v-model 대신 native input 이벤트를 직접 받음. v-model은 IME 조합 중 input
        이벤트를 무시하므로 조합 중인 글자가 반영되지 않음. @input은 조합 중에도
        발생하므로 buffer 상태가 실시간 표시됨. textarea라서 Enter로 줄바꿈('\n')
        입력 가능. display:none은 포커스 불가이므로 금지 — 1px 투명 + pointer-events:none.
      -->
      <textarea
        ref="inputEl"
        aria-label="원고지 입력"
        class="absolute left-0 top-0 h-px w-px resize-none overflow-hidden border-0 p-0 opacity-0"
        style="pointer-events: none"
        @input="syncFromInput"
        @keydown="onKeyDown"
        @keyup="syncCaret"
        @click="syncCaret"
        @select="syncCaret"
        @compositionstart="isComposing = true"
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
}
</style>
