<script setup lang="ts">
import { computed, onMounted, ref, useTemplateRef } from "vue";
import type { DisplayCell } from "../types/editor.types";
import Cell from "./Cell.vue";

const rows = 12;
const cols = 16;
const cellSize = 32;
const width = cols * cellSize;
const height = rows * cellSize;

const inputRef = useTemplateRef<HTMLTextAreaElement>("inputEl");

// 원본(source of truth): 원고지 전체 내용을 담는 단일 문자열
const text = ref("");

// IME 조합 상태: 아직 compositionend 되지 않은(미확정) 글자 추적
const caretIndex = ref(0);
const isComposing = ref(false);
const composingText = ref("");

function syncFromInput() {
  const el = inputRef.value;
  if (!el) return;
  text.value = el.value;
  caretIndex.value = el.selectionStart ?? el.value.length;
}

function syncCaret() {
  const el = inputRef.value;
  if (!el) return;
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

// 텍스트를 격자에 배치.
// '\n'은 줄바꿈(셀을 차지하지 않고 다음 행 첫 칸으로 이동),
// 한 줄이 cols를 넘으면 자동으로 다음 행으로 wrap.
// offsetToCell: 텍스트 오프셋 -> 선형 셀 인덱스 (캐럿/조합 셀 위치 계산용)
function layoutText(value: string) {
  const cellChars = new Array<string>(rows * cols).fill("");
  const offsetToCell: number[] = [];
  // 셀 인덱스 -> 그 셀에 처음 도달한 텍스트 오프셋 (셀 클릭 시 캐럿 위치 역산용)
  const cellToOffset = new Array<number | undefined>(rows * cols).fill(
    undefined,
  );
  const chars = [...value];

  let row = 0;
  let col = 0;

  for (let i = 0; i <= chars.length; i++) {
    const cell = row * cols + col;
    offsetToCell[i] = cell;
    if (cellToOffset[cell] === undefined) cellToOffset[cell] = i;
    if (i === chars.length) break;

    if (chars[i] === "\n") {
      row += 1;
      col = 0;
      continue;
    }

    if (row < rows && col < cols) {
      cellChars[row * cols + col] = chars[i];
    }
    col += 1;
    if (col >= cols) {
      col = 0;
      row += 1;
    }
  }

  return { cellChars, offsetToCell, cellToOffset };
}

// 셀 클릭: 그 셀의 텍스트 오프셋으로 캐럿 이동.
// 빈 셀(내용 범위 밖)은 글 끝으로 보냄.
// 네이티브 textarea가 실제 입력 위치이므로 focus + setSelectionRange로 함께 옮긴다.
function moveCaretToCell(cell: DisplayCell) {
  const { cellToOffset } = layoutText(text.value);
  const cellIndex = cell.row * cols + cell.col;
  const offset = cellToOffset[cellIndex] ?? [...text.value].length;
  console.log(offset);

  caretIndex.value = offset;
  const el = inputRef.value;
  if (el) {
    el.focus();
    el.setSelectionRange(offset, offset);
  }
}

const cells = computed<DisplayCell[]>(() => {
  const { cellChars, offsetToCell } = layoutText(text.value);

  const cellAt = (offset: number) =>
    offsetToCell[Math.max(0, Math.min(offset, offsetToCell.length - 1))];

  // 활성 셀: 조합 중이면 조합 글자가 놓인 셀들, 아니면 캐럿(다음 입력) 셀
  const activeCells = new Set<number>();
  if (isComposing.value && composingText.value) {
    const len = [...composingText.value].length;
    for (let k = caretIndex.value - len; k < caretIndex.value; k++) {
      activeCells.add(cellAt(k));
    }
  } else {
    activeCells.add(cellAt(caretIndex.value));
  }

  return Array.from({ length: rows * cols }, (_, index) => ({
    row: Math.floor(index / cols),
    col: index % cols,
    value: cellChars[index] ?? "",
    guides: {},
    selected: false,
    active: activeCells.has(index),
  }));
});

// 초기 로드 직후에도 타이핑 가능하도록 숨은 입력칸에 포커스
onMounted(() => {
  inputRef.value?.focus();
});
</script>

<template>
  <div class="flex max-w-full flex-col gap-3" :style="{ width: `${width}px` }">
    <!-- 격자 박스: SVG가 absolute로 이 박스를 채움 -->
    <div
      class="relative w-full overflow-visible"
      :style="{ aspectRatio: `${cols} / ${rows}` }"
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
          v-for="cell in cells"
          :key="`${cell.row}:${cell.col}`"
          :cell="cell"
          :cell-size="cellSize"
          @select="moveCaretToCell"
        />
      </svg>

      <!--
        보이는 입력 상자는 제거하고, 화면에 안 보이지만 포커스 가능한
        textarea를 입력 싱크로 남긴다. SVG 격자는 직접 IME 조합을 받을 수
        없으므로(편집 가능 요소만 가능) 이 숨은 textarea가 키보드/IME 입력을
        수집한다. 셀 클릭 시 moveCaretToCell이 focus + setSelectionRange로
        캐럿을 옮긴다.

        v-model 대신 native input 이벤트를 직접 받음.
        v-model은 IME 조합 중 input 이벤트를 무시하므로 조합 중인 글자가
        반영되지 않음. @input은 조합 중에도 발생하므로 buffer 상태가 실시간 표시됨.
        (읽기 한 방향만 — input에 값을 도로 쓰지 않아 carry-over 보존)
        textarea라서 Enter로 줄바꿈('\n')을 입력할 수 있음.
        display:none은 포커스 불가이므로 금지 — 1px 투명 + pointer-events:none.
      -->
      <textarea
        ref="inputEl"
        aria-label="원고지 입력"
        class="absolute left-0 top-0 h-px w-px resize-none overflow-hidden border-0 p-0 opacity-0"
        style="pointer-events: none"
        @input="syncFromInput"
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
