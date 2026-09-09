<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useEditorUiStore } from "../stores/editorUi";
import { useManuscriptStore } from "../stores/manuscript";
import ThemeToggle from "./ThemeToggle.vue";

const { mode } = storeToRefs(useManuscriptStore());
const ui = useEditorUiStore();
const { chromeVisible } = storeToRefs(ui);
</script>

<template>
  <div class="command-bar" :class="{ 'command-bar--awake': chromeVisible }">
    <div class="seg" role="group" aria-label="쓰기 모드">
      <button
        type="button"
        :class="{ on: mode === 'grid' }"
        :aria-pressed="mode === 'grid'"
        @click="mode = 'grid'"
      >
        격자
      </button>
      <button
        type="button"
        :class="{ on: mode === 'flow' }"
        :aria-pressed="mode === 'flow'"
        @click="mode = 'flow'"
      >
        흐름
      </button>
    </div>

    <span class="divider" />

    <button
      type="button"
      class="kbd"
      aria-label="명령 팔레트 열기"
      @click="ui.paletteOpen = true"
    >
      <span>명령</span>
      <kbd>⌘K</kbd>
    </button>

    <span class="divider" />

    <ThemeToggle />
  </div>
</template>

<style scoped>
.command-bar {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 40;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: color-mix(in srgb, var(--surface) 86%, transparent);
  backdrop-filter: blur(8px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.14);
  opacity: 0.32;
  transition: opacity 0.22s ease;
}
.command-bar--awake,
.command-bar:hover,
.command-bar:focus-within {
  opacity: 1;
}
.command-bar .seg {
  display: flex;
  gap: 2px;
}
.command-bar .seg button {
  padding: 5px 12px;
  border: 0;
  border-radius: 999px;
  background: none;
  color: var(--muted);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
  transition:
    background 0.12s ease,
    color 0.12s ease;
}
.command-bar .seg button:hover {
  color: var(--foreground);
}
.command-bar .seg button.on {
  background: var(--accent);
  color: var(--accent-contrast);
}
.command-bar .divider {
  width: 1px;
  align-self: stretch;
  margin: 4px 2px;
  background: var(--border);
}
.command-bar .kbd {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border: 0;
  border-radius: 999px;
  background: none;
  color: var(--muted);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}
.command-bar .kbd:hover {
  color: var(--foreground);
}
.command-bar .kbd kbd {
  font-family: var(--font-manuscript);
  font-size: 11px;
  padding: 1px 5px;
  border-radius: 5px;
  background: var(--surface-2);
  border: 1px solid var(--border);
}
</style>
