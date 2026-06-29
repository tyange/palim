<script setup lang="ts">
import { storeToRefs } from "pinia";
import { nextTick, onMounted, useTemplateRef, watch } from "vue";
import { FLOW, useManuscriptStore } from "../stores/manuscript";

const { width, fontSize, lineHeight, padX, padY } = FLOW;

const { text } = storeToRefs(useManuscriptStore());

const areaRef = useTemplateRef<HTMLTextAreaElement>("areaEl");

function autoGrow() {
  const el = areaRef.value;
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${Math.max(el.scrollHeight, lineHeight * 12)}px`;
}

function onInput(event: Event) {
  text.value = (event.target as HTMLTextAreaElement).value;
  autoGrow();
}

watch(text, () => nextTick(autoGrow));
onMounted(() => {
  areaRef.value?.focus();
  autoGrow();
});
</script>

<template>
  <div class="flex min-w-0 max-w-full flex-col gap-2" :style="{ width: `${width}px` }">
    <textarea
      ref="areaEl"
      aria-label="흐름 입력"
      class="flow-area block w-full resize-none rounded-md border border-border bg-surface text-foreground outline-none"
      :style="{
        fontFamily: 'var(--font-manuscript)',
        fontSize: `${fontSize}px`,
        lineHeight: `${lineHeight}px`,
        padding: `${padY}px ${padX}px`,
      }"
      :value="text"
      @input="onInput"
    />
  </div>
</template>

<style scoped>
.flow-area {
  white-space: pre-wrap;
  overflow-wrap: break-word;
  overflow: hidden;
}
</style>
