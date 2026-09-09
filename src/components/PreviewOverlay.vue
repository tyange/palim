<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useEditorUiStore } from "../stores/editorUi";
import { useManuscriptStore } from "../stores/manuscript";
import FlowPreview from "./FlowPreview.vue";
import GridPreview from "./GridPreview.vue";

const { mode } = storeToRefs(useManuscriptStore());
const ui = useEditorUiStore();
const { previewOpen } = storeToRefs(ui);
</script>

<template>
  <div v-if="previewOpen" class="preview-scrim" @click="previewOpen = false">
    <div class="preview-panel" role="dialog" aria-label="미리보기" @click.stop>
      <div class="preview-head">
        <span>미리보기 · {{ mode === "grid" ? "격자" : "흐름" }}</span>
        <button
          type="button"
          class="preview-close"
          aria-label="미리보기 닫기"
          @click="previewOpen = false"
        >
          ✕
        </button>
      </div>
      <div class="preview-body">
        <GridPreview v-if="mode === 'grid'" />
        <FlowPreview v-else />
      </div>
    </div>
  </div>
</template>

<style scoped>
.preview-scrim {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 4vh 4vw;
  background: rgba(0, 0, 0, 0.4);
}
.preview-panel {
  display: flex;
  flex-direction: column;
  width: min(920px, 100%);
  max-height: 92vh;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: var(--surface);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.3);
  overflow: hidden;
}
.preview-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  font-size: 13px;
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
</style>
