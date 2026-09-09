<script setup lang="ts">
import { storeToRefs } from "pinia";
import { ListboxContent, ListboxItem, ListboxRoot } from "reka-ui";
import { computed, ref } from "vue";
import { useEditorUiStore } from "../stores/editorUi";
import { useManuscriptStore } from "../stores/manuscript";

const emit = defineEmits<{ jump: [line: number] }>();

const { text } = storeToRefs(useManuscriptStore());
const { chromeVisible } = storeToRefs(useEditorUiStore());

const current = ref<number | null>(null);

const lines = computed(() =>
  text.value.split("\n").map((raw, i) => {
    const trimmed = raw.trim();
    return { n: i + 1, label: trimmed.slice(0, 5), empty: trimmed === "" };
  }),
);

function onPick(line: unknown) {
  if (typeof line === "number") emit("jump", line);
}
</script>

<template>
  <ListboxRoot
    v-model="current"
    class="outline-rail"
    :class="{ 'outline-rail--awake': chromeVisible }"
    aria-label="문서 아웃라인"
    @update:model-value="onPick"
  >
    <ListboxContent class="rail-list">
      <ListboxItem
        v-for="l in lines"
        :key="l.n"
        :value="l.n - 1"
        class="rail-item"
      >
        <span class="num">{{ l.n }}</span>
        <span class="lbl">{{ l.empty ? "·" : l.label }}</span>
      </ListboxItem>
    </ListboxContent>
  </ListboxRoot>
</template>

<style scoped>
.outline-rail {
  flex-shrink: 0;
  width: 132px;
  height: 100%;
  overflow-y: auto;
  padding: calc(12vh + 4px) 0 40px;
  opacity: 0;
  transform: translateX(-12px);
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
  pointer-events: none;
  scrollbar-width: thin;
  outline: none;
}
.outline-rail--awake {
  opacity: 1;
  transform: none;
  pointer-events: auto;
}
.rail-list {
  display: flex;
  flex-direction: column;
}
.rail-item {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 3px 16px;
  cursor: pointer;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.5;
  outline: none;
  transition: color 0.12s ease;
}
.rail-item:hover,
.rail-item[data-highlighted] {
  color: var(--foreground);
}
.rail-item .num {
  flex-shrink: 0;
  width: 16px;
  text-align: right;
  font-variant-numeric: tabular-nums;
  opacity: 0.7;
}
.rail-item .lbl {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-family: var(--font-manuscript);
}
</style>
