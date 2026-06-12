<script setup lang="ts">
import { storeToRefs } from "pinia";
import { computed, useTemplateRef } from "vue";
import { GRID, useManuscriptStore } from "../stores/manuscript";

const { rows, cols, cellSize, gutterCols } = GRID;

// 미리보기 박스는 에디터와 똑같은 크기.
const previewWidth = (cols + gutterCols) * cellSize; // 에디터 totalWidth와 동일
const previewHeight = rows * cellSize; // 에디터 height와 동일
const fontSize = 18; // 자간·글자 크기는 일반 텍스트
const lineHeight = 28; // 행간
const padX = 6;
const padY = 6;
const fontFamily = "sans-serif";

// 에디터와 같은 문서(원본 텍스트)를 구독한다.
const { text } = storeToRefs(useManuscriptStore());

// 글자 폭 측정용 캔버스 — 순수 SVG로 줄바꿈을 직접 계산해 export까지 동일하게 보이도록.
let measureCtx: CanvasRenderingContext2D | null = null;
function measure(s: string): number {
  if (!measureCtx) {
    measureCtx = document.createElement("canvas").getContext("2d");
    if (measureCtx) measureCtx.font = `${fontSize}px ${fontFamily}`;
  }
  return measureCtx ? measureCtx.measureText(s).width : s.length * fontSize;
}

// 원본 텍스트를 일반 글처럼 조판한다.
// - 실제 줄바꿈(\n)에서만 줄을 끊는다 (원고지의 자동 줄넘김은 줄바꿈이 아니라 글의 흐름)
// - 그 외에는 박스 폭에 맞춰 자연스럽게 줄을 흘린다 (CJK는 글자 단위로 넘어감)
// - 공백은 글자처럼 그대로 유지 (white-space:pre)
const lines = computed(() => {
  const maxWidth = previewWidth - padX * 2;
  const out: string[] = [];
  for (const para of text.value.split("\n")) {
    let cur = "";
    for (const ch of para) {
      if (cur !== "" && measure(cur + ch) > maxWidth) {
        out.push(cur);
        cur = ch;
      } else {
        cur += ch;
      }
    }
    out.push(cur);
  }
  return out;
});

const svgRef = useTemplateRef<SVGSVGElement>("svgEl");

// 현재 화면의 SVG를 그대로 직렬화해 .svg 파일로 내려받는다.
// 색·폰트를 presentation 속성(inline)으로만 칠해 두어 외부 CSS 없이도 동일하게 렌더된다.
function exportSvg() {
  const svg = svgRef.value;
  if (!svg) return;
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const source = new XMLSerializer().serializeToString(clone);
  const blob = new Blob(
    [`<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n${source}`],
    { type: "image/svg+xml;charset=utf-8" },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "manuscript.svg";
  a.click();
  URL.revokeObjectURL(url);
}
</script>

<template>
  <div class="flex max-w-full flex-col gap-2" :style="{ width: `${previewWidth}px` }">
    <div class="flex h-[30px] items-center justify-between gap-2">
      <span class="text-sm text-muted">미리보기</span>
      <button
        type="button"
        class="h-[30px] cursor-pointer rounded-md border border-accent bg-accent px-2.5 text-[13px] text-accent-contrast transition-opacity hover:opacity-90"
        @click="exportSvg"
      >
        SVG 저장
      </button>
    </div>

    <!--
      출력 전용 SVG — 하얀 바탕·검은 글씨로 원본 텍스트를 일반 글처럼 옮긴다.
      실제 줄바꿈에서만 줄을 끊고, 공백은 그대로 보존한다. 색·폰트는 모두
      presentation 속성(inline)으로 칠해 외부 CSS 없이도 그대로 저장(export)된다.
    -->
    <svg
      ref="svgEl"
      class="block h-auto w-full rounded-md border border-border"
      :viewBox="`0 0 ${previewWidth} ${previewHeight}`"
      :width="previewWidth"
      :height="previewHeight"
      role="img"
      aria-label="원고지 미리보기"
      xmlns="http://www.w3.org/2000/svg"
    >
      <!-- 하얀 바탕 -->
      <rect x="0" y="0" :width="previewWidth" :height="previewHeight" fill="#ffffff" />

      <!-- 검은 글씨 — white-space:pre로 연속 공백을 그대로 보존 -->
      <text
        v-for="(line, i) in lines"
        :key="i"
        :x="padX"
        :y="padY + i * lineHeight"
        fill="#000000"
        :font-family="fontFamily"
        :font-size="fontSize"
        dominant-baseline="hanging"
        style="white-space: pre"
        xml:space="preserve"
      >{{ line }}</text>
    </svg>
  </div>
</template>
