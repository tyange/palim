<script setup lang="ts">
import { computed, ref } from "vue";
import type { DisplayCell } from "../types/editor.types";
import Cell from "./Cell.vue";

const rows = 12;
const cols = 16;
const cellSize = 32;
const width = cols * cellSize;
const height = rows * cellSize;

// 원본(source of truth): 원고지 전체 내용을 담는 단일 문자열
const text = ref("");

// 원본을 글자 단위로 쪼개 격자에 분배
const cells = computed<DisplayCell[]>(() => {
  const chars = [...text.value];

  return Array.from({ length: rows * cols }, (_, index) => ({
    row: Math.floor(index / cols),
    col: index % cols,
    value: chars[index] ?? "",
    guides: {},
    selected: false,
  }));
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
        />
      </svg>
    </div>

    <!-- 원본(source of truth) 입력칸: 격자 박스 아래 형제로 배치 -->
    <!--
      v-model 대신 native input 이벤트를 직접 받음.
      v-model은 IME 조합 중 input 이벤트를 무시하므로 조합 중인 글자가
      반영되지 않음. @input은 조합 중에도 발생하므로 buffer 상태가 실시간 표시됨.
      (읽기 한 방향만 — input에 값을 도로 쓰지 않아 carry-over 보존)
    -->
    <input
      class="w-full rounded border border-[#bfb8ad] bg-[#fffdf8] px-2 py-1 text-[#1f1a14] outline-none"
      placeholder="여기에 입력하면 원고지에 채워집니다"
      @input="text = ($event.target as HTMLInputElement).value"
    />
  </div>
</template>
