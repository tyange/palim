<script setup lang="ts">
import { storeToRefs } from "pinia";
import {
  DialogClose,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from "reka-ui";
import { useEditorUiStore } from "../stores/editorUi";
import { useManuscriptStore } from "../stores/manuscript";
import CanvasPreview from "./CanvasPreview.vue";
import FlowPreview from "./FlowPreview.vue";

const { mode } = storeToRefs(useManuscriptStore());
const { previewOpen } = storeToRefs(useEditorUiStore());
</script>

<template>
  <DialogRoot v-model:open="previewOpen">
    <DialogPortal>
      <DialogOverlay class="preview-scrim" />
      <DialogContent class="preview-panel">
        <div class="preview-head">
          <DialogTitle class="preview-title">
            미리보기 · {{ mode === "grid" ? "격자" : "흐름" }}
          </DialogTitle>
          <DialogClose class="preview-close" aria-label="미리보기 닫기">
            ✕
          </DialogClose>
        </div>
        <div class="preview-body">
          <CanvasPreview v-if="mode === 'grid'" />
          <FlowPreview v-else />
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style scoped>
.preview-scrim {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(0, 0, 0, 0.4);
}
.preview-scrim[data-state="open"] {
  animation: fade-in 0.16s ease;
}
.preview-panel {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 51;
  display: flex;
  flex-direction: column;
  width: min(920px, calc(100vw - 8vw));
  max-height: 92vh;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: var(--surface);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.3);
  overflow: hidden;
}
.preview-panel[data-state="open"] {
  animation: fade-in 0.16s ease;
}
.preview-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
}
.preview-title {
  margin: 0;
  font-size: 13px;
  font-weight: 400;
  color: var(--muted);
}
.preview-close {
  border: 0;
  background: none;
  color: var(--muted);
  font-size: 14px;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 6px;
}
.preview-close:hover {
  color: var(--foreground);
  background: var(--surface-2);
}
.preview-body {
  padding: 20px;
  overflow: auto;
}
@keyframes fade-in {
  from {
    opacity: 0;
  }
}
</style>
