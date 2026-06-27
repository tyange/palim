<script setup lang="ts">
import { storeToRefs } from "pinia";
import { ref, useTemplateRef, watch } from "vue";
import { GRID, useManuscriptStore } from "../stores/manuscript";

const { rows, cols, cellSize, gutterCols } = GRID;

const previewWidth = (cols + gutterCols) * cellSize;
const previewHeight = rows * cellSize;
const fontSize = 18;
const lineHeight = 28;
const padX = 6;
const padY = 6;
const fontFamily = '"Noto Serif KR", serif';

const { text } = storeToRefs(useManuscriptStore());

let measureCtx: CanvasRenderingContext2D | null = null;
function measure(s: string): number {
  if (!measureCtx) {
    measureCtx = document.createElement("canvas").getContext("2d");
    if (measureCtx) measureCtx.font = `${fontSize}px ${fontFamily}`;
  }
  return measureCtx ? measureCtx.measureText(s).width : s.length * fontSize;
}

const lines = ref<string[]>([]);

function relayout() {
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
  lines.value = out;
}

watch(text, relayout, { immediate: true });

if (document.fonts) {
  document.fonts.load(`${fontSize}px "Noto Serif KR"`).then(() => {
    measureCtx = null;
    relayout();
  });
}

const svgRef = useTemplateRef<SVGSVGElement>("svgEl");

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

const PNG_SCALE = 3;

async function exportPng() {
  if (document.fonts) await document.fonts.load(`${fontSize}px "Noto Serif KR"`);

  const canvas = document.createElement("canvas");
  canvas.width = previewWidth * PNG_SCALE;
  canvas.height = previewHeight * PNG_SCALE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.scale(PNG_SCALE, PNG_SCALE);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, previewWidth, previewHeight);

  ctx.fillStyle = "#000000";
  ctx.font = `${fontSize}px ${fontFamily}`;
  ctx.textBaseline = "top";
  lines.value.forEach((line, i) => {
    ctx.fillText(line, padX, padY + i * lineHeight);
  });

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "manuscript.png";
    a.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}
</script>

<template>
  <div class="flex min-w-0 max-w-full flex-col gap-2" :style="{ width: `${previewWidth}px` }">
    <div class="flex h-[30px] items-center justify-between gap-2">
      <span class="text-sm text-muted">미리보기</span>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="h-[30px] cursor-pointer rounded-md border border-border bg-surface px-2.5 text-[13px] text-foreground transition-opacity hover:opacity-90"
          @click="exportPng"
        >
          PNG 저장
        </button>
        <button
          type="button"
          class="h-[30px] cursor-pointer rounded-md border border-accent bg-accent px-2.5 text-[13px] text-accent-contrast transition-opacity hover:opacity-90"
          @click="exportSvg"
        >
          SVG 저장
        </button>
      </div>
    </div>

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
      <rect x="0" y="0" :width="previewWidth" :height="previewHeight" fill="#ffffff" />

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
