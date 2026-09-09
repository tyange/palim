<script setup lang="ts">
import { storeToRefs } from "pinia";
import { nextTick, onMounted, useTemplateRef, watch } from "vue";
import { GRID, useManuscriptStore } from "../stores/manuscript";

const { fontSize, lineHeight, padX, padY } = GRID;

const emit = defineEmits<{ caretmove: [line: number] }>();

const { text } = storeToRefs(useManuscriptStore());

const areaRef = useTemplateRef<HTMLTextAreaElement>("areaEl");

function autoGrow() {
  const el = areaRef.value;
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${Math.max(el.scrollHeight, lineHeight * 12)}px`;
}

function reportCaret() {
  const el = areaRef.value;
  if (!el) return;
  const before = el.value.slice(0, el.selectionStart ?? 0);
  let line = 0;
  for (let i = 0; i < before.length; i++) if (before[i] === "\n") line += 1;
  emit("caretmove", line);
}

function onInput(event: Event) {
  text.value = (event.target as HTMLTextAreaElement).value;
  autoGrow();
  reportCaret();
}

watch(text, () => nextTick(autoGrow));
onMounted(() => {
  areaRef.value?.focus();
  autoGrow();
  reportCaret();
});
</script>

<template>
  <textarea
    ref="areaEl"
    class="grid-area block w-full resize-none bg-transparent text-foreground outline-none"
    aria-label="격자 입력"
    wrap="off"
    spellcheck="false"
    autocapitalize="off"
    autocomplete="off"
    :style="{
      fontSize: `${fontSize}px`,
      lineHeight: `${lineHeight}px`,
      padding: `${padY}px ${padX}px`,
    }"
    :value="text"
    @input="onInput"
    @keyup="reportCaret"
    @click="reportCaret"
  />
</template>

<style scoped>
.grid-area {
  font-family: "Nanum Gothic Coding", "D2Coding", ui-monospace, monospace;
  word-spacing: 0.5em;
  white-space: pre;
  overflow-x: auto;
  overflow-y: hidden;
  border: 0;
}
</style>
