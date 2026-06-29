<script setup lang="ts">
import { storeToRefs } from "pinia";
import { computed, ref, useTemplateRef, watch } from "vue";
import { exportPng, exportSvgElement } from "../composables/useExport";
import { FLOW, useManuscriptStore } from "../stores/manuscript";

const { width, fontSize, lineHeight, padX, padY } = FLOW;
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
  const maxWidth = width - padX * 2;
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

const height = computed(
  () => padY * 2 + Math.max(1, lines.value.length) * lineHeight,
);

const svgRef = useTemplateRef<SVGSVGElement>("svgEl");

function onExportSvg() {
  if (svgRef.value) exportSvgElement(svgRef.value, "palim-flow.svg");
}

function onExportPng() {
  exportPng({
    width,
    height: height.value,
    filename: "palim-flow.png",
    awaitFont: `${fontSize}px "Noto Serif KR"`,
    draw: (ctx) => {
      ctx.fillStyle = "#000000";
      ctx.font = `${fontSize}px ${fontFamily}`;
      ctx.textBaseline = "top";
      lines.value.forEach((line, i) => {
        ctx.fillText(line, padX, padY + i * lineHeight);
      });
    },
  });
}
</script>

<template>
  <div class="flex min-w-0 max-w-full flex-col gap-2" :style="{ width: `${width}px` }">
    <div class="flex h-[30px] items-center justify-between gap-2">
      <span class="text-sm text-muted">미리보기</span>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="h-[30px] cursor-pointer rounded-md border border-border bg-surface px-2.5 text-[13px] text-foreground transition-opacity hover:opacity-90"
          @click="onExportPng"
        >
          PNG 저장
        </button>
        <button
          type="button"
          class="h-[30px] cursor-pointer rounded-md border border-accent bg-accent px-2.5 text-[13px] text-accent-contrast transition-opacity hover:opacity-90"
          @click="onExportSvg"
        >
          SVG 저장
        </button>
      </div>
    </div>

    <svg
      ref="svgEl"
      class="block h-auto w-full rounded-md border border-border"
      :viewBox="`0 0 ${width} ${height}`"
      :width="width"
      :height="height"
      role="img"
      aria-label="흐름 미리보기"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="0" y="0" :width="width" :height="height" fill="#ffffff" />

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
