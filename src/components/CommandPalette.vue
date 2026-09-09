<script setup lang="ts">
import { useColorMode, usePreferredDark } from "@vueuse/core";
import { storeToRefs } from "pinia";
import { computed, nextTick, ref, watch } from "vue";
import { useEditorUiStore } from "../stores/editorUi";
import { useManuscriptStore } from "../stores/manuscript";

interface Command {
  id: string;
  label: string;
  hint?: string;
  run: () => void;
}

const manuscript = useManuscriptStore();
const { mode } = storeToRefs(manuscript);
const ui = useEditorUiStore();
const { paletteOpen, focusMode, typewriter, previewOpen } = storeToRefs(ui);

const colorMode = useColorMode();
const prefersDark = usePreferredDark();
const isDark = computed(() =>
  colorMode.value === "auto" ? prefersDark.value : colorMode.value === "dark",
);

const query = ref("");
const cursor = ref(0);
const inputRef = ref<HTMLInputElement | null>(null);

const commands = computed<Command[]>(() => [
  {
    id: "mode",
    label: mode.value === "grid" ? "흐름 모드로 전환" : "격자 모드로 전환",
    run: () => (mode.value = mode.value === "grid" ? "flow" : "grid"),
  },
  {
    id: "preview",
    label: previewOpen.value ? "미리보기 닫기" : "미리보기 열기",
    hint: "⌘↵",
    run: () => ui.togglePreview(),
  },
  {
    id: "focus",
    label: focusMode.value ? "포커스 모드 끄기" : "포커스 모드 켜기",
    run: () => ui.toggleFocusMode(),
  },
  {
    id: "typewriter",
    label: typewriter.value ? "타자기 모드 끄기" : "타자기 모드 켜기",
    run: () => ui.toggleTypewriter(),
  },
  {
    id: "theme",
    label: isDark.value ? "라이트 모드" : "다크 모드",
    run: () => (colorMode.value = isDark.value ? "light" : "dark"),
  },
]);

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) return commands.value;
  return commands.value.filter((c) => c.label.toLowerCase().includes(q));
});

watch(paletteOpen, (open) => {
  if (open) {
    query.value = "";
    cursor.value = 0;
    nextTick(() => inputRef.value?.focus());
  }
});
watch(filtered, () => {
  cursor.value = 0;
});

function runAt(i: number) {
  const cmd = filtered.value[i];
  if (!cmd) return;
  cmd.run();
  paletteOpen.value = false;
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === "ArrowDown") {
    e.preventDefault();
    cursor.value = (cursor.value + 1) % Math.max(1, filtered.value.length);
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    cursor.value =
      (cursor.value - 1 + filtered.value.length) %
      Math.max(1, filtered.value.length);
  } else if (e.key === "Enter") {
    e.preventDefault();
    runAt(cursor.value);
  }
}
</script>

<template>
  <div v-if="paletteOpen" class="palette-scrim" @click="paletteOpen = false">
    <div class="palette" role="dialog" aria-label="명령 팔레트" @click.stop>
      <input
        ref="inputRef"
        v-model="query"
        class="palette-input"
        type="text"
        placeholder="명령 검색…"
        @keydown="onKeydown"
      />
      <ul class="palette-list">
        <li
          v-for="(cmd, i) in filtered"
          :key="cmd.id"
          :class="{ on: i === cursor }"
          @mouseenter="cursor = i"
          @click="runAt(i)"
        >
          <span>{{ cmd.label }}</span>
          <kbd v-if="cmd.hint">{{ cmd.hint }}</kbd>
        </li>
        <li v-if="filtered.length === 0" class="empty">일치하는 명령 없음</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.palette-scrim {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding-top: 18vh;
  background: rgba(0, 0, 0, 0.28);
}
.palette {
  width: min(440px, 92vw);
  border-radius: 14px;
  border: 1px solid var(--border);
  background: var(--surface);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.28);
  overflow: hidden;
}
.palette-input {
  width: 100%;
  padding: 14px 16px;
  border: 0;
  border-bottom: 1px solid var(--border);
  background: none;
  color: var(--foreground);
  font: inherit;
  font-size: 15px;
  outline: none;
}
.palette-list {
  margin: 0;
  padding: 6px;
  list-style: none;
  max-height: 46vh;
  overflow-y: auto;
}
.palette-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 12px;
  border-radius: 8px;
  font-size: 14px;
  color: var(--foreground);
  cursor: pointer;
}
.palette-list li.on {
  background: var(--surface-2);
}
.palette-list li.empty {
  color: var(--muted);
  cursor: default;
  justify-content: flex-start;
}
.palette-list kbd {
  font-family: var(--font-manuscript);
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 5px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  color: var(--muted);
}
</style>
