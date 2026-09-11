<script setup lang="ts">
import { storeToRefs } from "pinia";
import { computed, useTemplateRef } from "vue";
import { exportPng, exportSvgElement } from "../composables/useExport";
import { useToast } from "../composables/useToast";
import { CANVAS, useManuscriptStore } from "../stores/manuscript";

const { addToast } = useToast();

const fontFamily = '"Noto Serif KR", serif';
const { fontSize } = CANVAS;
const lineHeight = fontSize * CANVAS.lineHeight;
const pad = 12;

const { fragments } = storeToRefs(useManuscriptStore());

let measureCtx: CanvasRenderingContext2D | null = null;
function measure(s: string): number {
  if (!measureCtx) {
    measureCtx = document.createElement("canvas").getContext("2d");
    if (measureCtx) measureCtx.font = `${fontSize}px ${fontFamily}`;
  }
  return measureCtx ? measureCtx.measureText(s).width : s.length * fontSize;
}

interface PreviewLine {
  x: number;
  y: number;
  text: string;
}

const content = computed(() => {
  const lines: PreviewLine[] = [];
  let maxX = 0;
  let maxY = 0;
  for (const f of fragments.value) {
    f.text.split("\n").forEach((line, i) => {
      if (!line) return;
      const y = f.y + i * lineHeight;
      lines.push({ x: f.x, y, text: line });
      maxX = Math.max(maxX, f.x + measure(line));
      maxY = Math.max(maxY, y + lineHeight);
    });
  }
  return {
    lines,
    width: maxX + pad * 2,
    height: maxY + pad * 2,
  };
});

if (document.fonts) {
  document.fonts.load(`${fontSize}px "Noto Serif KR"`).then(() => {
    measureCtx = null;
  });
}

const svgRef = useTemplateRef<SVGSVGElement>("svgEl");

function onExportSvg() {
  if (!svgRef.value) return;
  exportSvgElement(svgRef.value, "palim-canvas.svg");
  addToast("SVG로 저장했어요");
}

async function onExportPng() {
  const { lines, width, height } = content.value;
  await exportPng({
    width,
    height,
    filename: "palim-canvas.png",
    awaitFont: `${fontSize}px "Noto Serif KR"`,
    draw: (ctx) => {
      ctx.fillStyle = "#000000";
      ctx.font = `${fontSize}px ${fontFamily}`;
      ctx.textBaseline = "hanging";
      for (const line of lines) ctx.fillText(line.text, line.x, line.y);
    },
  });
  addToast("PNG로 저장했어요");
}
</script>

<template>
  <div class="flex w-full min-w-0 flex-col gap-2">
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

    <div
      class="w-full overflow-auto rounded-md border border-border"
      :style="{ background: '#ffffff' }"
    >
      <svg
        ref="svgEl"
        class="block"
        :viewBox="`0 0 ${content.width} ${content.height}`"
        :width="content.width"
        :height="content.height"
        role="img"
        aria-label="자유 배치 미리보기"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect
          x="0"
          y="0"
          :width="content.width"
          :height="content.height"
          fill="#ffffff"
        />
        <text
          v-for="(line, i) in content.lines"
          :key="i"
          :x="line.x + pad"
          :y="line.y + pad"
          fill="#000000"
          :font-family="fontFamily"
          :font-size="fontSize"
          dominant-baseline="hanging"
          style="white-space: pre"
          xml:space="preserve"
        >
          {{ line.text }}
        </text>
      </svg>
    </div>
  </div>
</template>
