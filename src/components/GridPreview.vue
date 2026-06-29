<script setup lang="ts">
import { storeToRefs } from "pinia";
import { computed, ref, useTemplateRef } from "vue";
import { exportPng, exportSvgElement } from "../composables/useExport";
import { FLOW, useManuscriptStore } from "../stores/manuscript";

const fontSize = FLOW.fontSize;
const advanceY = FLOW.lineHeight;
const fontFamily = '"Noto Serif KR", serif';

const { gridLayout } = storeToRefs(useManuscriptStore());

// 한 칸의 가로 advance = 전각 한글 글자 폭(흐름 모드 자간과 동일). 공백 칸도 같은
// advance를 차지해 "공백 = 글자 한 칸"으로 배치가 보존된다. 웹폰트 로드 후 재측정.
let measureCtx: CanvasRenderingContext2D | null = null;
function measureGlyph(): number {
  if (!measureCtx) {
    measureCtx = document.createElement("canvas").getContext("2d");
    if (measureCtx) measureCtx.font = `${fontSize}px ${fontFamily}`;
  }
  return measureCtx ? measureCtx.measureText("가").width : fontSize;
}
const advanceX = ref(measureGlyph());
if (document.fonts) {
  document.fonts.load(`${fontSize}px "Noto Serif KR"`).then(() => {
    measureCtx = null;
    advanceX.value = measureGlyph();
  });
}

interface Glyph {
  char: string;
  cx: number;
  cy: number;
}

const content = computed(() => {
  const L = gridLayout.value;
  const ax = advanceX.value;
  const glyphs: Glyph[] = [];
  for (let i = 0; i < L.cellText.length; i++) {
    const char = L.cellText[i];
    if (char === "" || char === " ") continue;
    const row = Math.floor(i / L.cols);
    const col = i % L.cols;
    glyphs.push({
      char,
      cx: col * ax + ax / 2,
      cy: row * advanceY + advanceY / 2,
    });
  }
  return {
    glyphs,
    width: L.cols * ax,
    height: L.rows * advanceY,
  };
});

const svgRef = useTemplateRef<SVGSVGElement>("svgEl");

function onExportSvg() {
  if (svgRef.value) exportSvgElement(svgRef.value, "palim-grid.svg");
}

function onExportPng() {
  const { glyphs, width, height } = content.value;
  exportPng({
    width,
    height,
    filename: "palim-grid.png",
    awaitFont: `${fontSize}px ${fontFamily}`,
    draw: (ctx) => {
      ctx.fillStyle = "#000000";
      ctx.font = `${fontSize}px ${fontFamily}`;
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";
      for (const g of glyphs) ctx.fillText(g.char, g.cx, g.cy);
    },
  });
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
        aria-label="격자 미리보기"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect x="0" y="0" :width="content.width" :height="content.height" fill="#ffffff" />
        <text
          v-for="(g, i) in content.glyphs"
          :key="i"
          :x="g.cx"
          :y="g.cy"
          fill="#000000"
          :font-family="fontFamily"
          :font-size="fontSize"
          dominant-baseline="central"
          text-anchor="middle"
        >{{ g.char }}</text>
      </svg>
    </div>
  </div>
</template>
