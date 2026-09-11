<script setup lang="ts">
import { storeToRefs } from "pinia";
import { nextTick, onMounted, useTemplateRef, watch } from "vue";
import { FLOW, useManuscriptStore } from "../stores/manuscript";

const { width, fontSize, lineHeight, padX, padY } = FLOW;

const emit = defineEmits<{ caretmove: [line: number] }>();

const store = useManuscriptStore();
const { text } = storeToRefs(store);

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
  store.text = (event.target as HTMLTextAreaElement).value;
  autoGrow();
  reportCaret();
}

watch(text, (v) => {
  const el = areaRef.value;
  if (el && el.value !== v) el.value = v;
  nextTick(autoGrow);
});
onMounted(() => {
  const el = areaRef.value;
  if (el) el.value = text.value;
  el?.focus();
  autoGrow();
  reportCaret();
});
</script>

<template>
  <div
    class="flex min-w-0 max-w-full flex-col"
    :style="{ width: `${width}px` }"
  >
    <textarea
      ref="areaEl"
      aria-label="흐름 입력"
      class="flow-area block w-full resize-none bg-transparent text-foreground outline-none"
      :style="{
        fontFamily: 'var(--font-manuscript)',
        fontSize: `${fontSize}px`,
        lineHeight: `${lineHeight}px`,
        padding: `${padY}px ${padX}px`,
      }"
      @input="onInput"
      @keyup="reportCaret"
      @click="reportCaret"
    />
  </div>
</template>

<style scoped>
.flow-area {
  white-space: pre-wrap;
  overflow-wrap: break-word;
  overflow: hidden;
  border: 0;
}
</style>
