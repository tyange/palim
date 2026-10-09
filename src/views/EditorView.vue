<script setup lang="ts">
import { storeToRefs } from "pinia";
import { onMounted, onUnmounted, ref } from "vue";
import CanvasEditor from "../components/CanvasEditor.vue";
import CommandBar from "../components/CommandBar.vue";
import CommandPalette from "../components/CommandPalette.vue";
import FlowEditor from "../components/FlowEditor.vue";
import PreviewOverlay from "../components/PreviewOverlay.vue";
import { useEditorUiStore } from "../stores/editorUi";
import { FLOW, useManuscriptStore } from "../stores/manuscript";

const { mode, docId } = storeToRefs(useManuscriptStore());
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
  const surface = el.querySelector("textarea, .cm-editor");
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

function onCaretLine(line: number) {
  if (!typewriter.value || mode.value !== "flow") return;
  centerOn(line * FLOW.lineHeight + FLOW.padY);
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
    <div ref="stageRef" class="relative min-w-0 flex-1 overflow-auto">
      <CanvasEditor v-if="mode === 'grid'" :key="docId" class="min-h-full" />
      <div
        v-else
        class="flex w-full px-[clamp(24px,8vw,160px)] pt-[12vh] pb-[45vh] [justify-content:safe_center]"
      >
        <FlowEditor :key="docId" @caretmove="onCaretLine" />
      </div>
    </div>

    <CommandBar />
    <CommandPalette />
    <PreviewOverlay />
  </main>
</template>
