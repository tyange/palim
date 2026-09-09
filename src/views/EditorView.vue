<script setup lang="ts">
import { storeToRefs } from "pinia";
import { onMounted, onUnmounted, ref } from "vue";
import CommandBar from "../components/CommandBar.vue";
import CommandPalette from "../components/CommandPalette.vue";
import FlowEditor from "../components/FlowEditor.vue";
import GridEditor from "../components/GridEditor.vue";
import OutlineRail from "../components/OutlineRail.vue";
import PreviewOverlay from "../components/PreviewOverlay.vue";
import { useEditorUiStore } from "../stores/editorUi";
import { FLOW, GRID, useManuscriptStore } from "../stores/manuscript";

const { mode } = storeToRefs(useManuscriptStore());
const ui = useEditorUiStore();
const { typewriter, chromeVisible, paletteOpen, previewOpen } = storeToRefs(ui);

const stageRef = ref<HTMLElement | null>(null);

let idleTimer: ReturnType<typeof setTimeout> | undefined;
function revealChrome() {
  chromeVisible.value = true;
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    if (!paletteOpen.value) chromeVisible.value = false;
  }, 2600);
}

function centerOn(innerY: number, smooth = true) {
  const el = stageRef.value;
  if (!el) return;
  const surface = el.querySelector("svg, textarea");
  if (!surface) return;
  const contentY =
    surface.getBoundingClientRect().top -
    el.getBoundingClientRect().top +
    el.scrollTop +
    innerY;
  el.scrollTo({
    top: contentY - el.clientHeight / 2,
    behavior: smooth ? "smooth" : "auto",
  });
}

function onGridCaret(pos: { x: number; y: number }) {
  if (typewriter.value) centerOn(pos.y);
}
function onFlowCaret(line: number) {
  if (typewriter.value) centerOn(line * FLOW.lineHeight + FLOW.padY);
}
function onJump(line: number) {
  const y =
    mode.value === "grid"
      ? line * GRID.rowSize + GRID.rowSize / 2
      : line * FLOW.lineHeight + FLOW.padY;
  centerOn(y);
}

function onKey(e: KeyboardEvent) {
  const meta = e.metaKey || e.ctrlKey;
  if (meta && e.key.toLowerCase() === "k") {
    e.preventDefault();
    paletteOpen.value = !paletteOpen.value;
    if (paletteOpen.value) chromeVisible.value = true;
  } else if (meta && e.key === "Enter") {
    e.preventDefault();
    previewOpen.value = !previewOpen.value;
  } else if (e.key === "Escape") {
    if (paletteOpen.value) paletteOpen.value = false;
    else if (previewOpen.value) previewOpen.value = false;
  }
}

onMounted(() => {
  window.addEventListener("keydown", onKey);
  revealChrome();
});
onUnmounted(() => {
  window.removeEventListener("keydown", onKey);
  clearTimeout(idleTimer);
});
</script>

<template>
  <main
    class="fixed inset-0 flex overflow-hidden bg-background text-foreground"
    @pointermove="revealChrome"
  >
    <OutlineRail @jump="onJump" />

    <div ref="stageRef" class="relative min-w-0 flex-1 overflow-auto">
      <div
        class="py-[46vh] px-[clamp(24px,8vw,160px)]"
        :class="
          mode === 'grid' ? 'w-max min-w-full' : 'flex w-full justify-center'
        "
      >
        <GridEditor v-if="mode === 'grid'" @caretmove="onGridCaret" />
        <FlowEditor v-else @caretmove="onFlowCaret" />
      </div>
    </div>

    <CommandBar />
    <CommandPalette />
    <PreviewOverlay />
  </main>
</template>
