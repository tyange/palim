<script setup lang="ts">
import { storeToRefs } from "pinia";
import { computed } from "vue";
import { useEditorUiStore } from "../stores/editorUi";
import { useManuscriptStore } from "../stores/manuscript";

const emit = defineEmits<{ jump: [line: number] }>();

const { text } = storeToRefs(useManuscriptStore());
const { chromeVisible } = storeToRefs(useEditorUiStore());

const lines = computed(() =>
  text.value.split("\n").map((raw, i) => {
    const trimmed = raw.trim();
    return { n: i + 1, label: trimmed.slice(0, 5), empty: trimmed === "" };
  }),
);
</script>

<template>
  <nav
    class="outline-rail"
    :class="{ 'outline-rail--awake': chromeVisible }"
    aria-label="문서 아웃라인"
  >
    <ul>
      <li v-for="l in lines" :key="l.n">
        <button type="button" @click="emit('jump', l.n - 1)">
          <span class="num">{{ l.n }}</span>
          <span class="lbl">{{ l.empty ? "·" : l.label }}</span>
        </button>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
.outline-rail {
  flex-shrink: 0;
  width: 132px;
  height: 100%;
  overflow-y: auto;
  padding: 16px 0;
  opacity: 0;
  transform: translateX(-12px);
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
  pointer-events: none;
  scrollbar-width: thin;
}
.outline-rail--awake {
  opacity: 1;
  transform: none;
  pointer-events: auto;
}
.outline-rail ul {
  margin: 0;
  padding: 0;
  list-style: none;
}
.outline-rail button {
  display: flex;
  align-items: baseline;
  gap: 8px;
  width: 100%;
  padding: 3px 16px;
  background: none;
  border: 0;
  cursor: pointer;
  text-align: left;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.5;
  transition: color 0.12s ease;
}
.outline-rail button:hover {
  color: var(--foreground);
}
.outline-rail .num {
  flex-shrink: 0;
  width: 16px;
  text-align: right;
  font-variant-numeric: tabular-nums;
  opacity: 0.7;
}
.outline-rail .lbl {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-family: var(--font-manuscript);
}
</style>
