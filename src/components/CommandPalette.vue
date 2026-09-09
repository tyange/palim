<script setup lang="ts">
import { storeToRefs } from "pinia";
import {
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  ListboxContent,
  ListboxFilter,
  ListboxItem,
  ListboxRoot,
  VisuallyHidden,
} from "reka-ui";
import { computed, ref, watch } from "vue";
import { useTheme } from "../composables/useTheme";
import { useEditorUiStore } from "../stores/editorUi";
import { useManuscriptStore } from "../stores/manuscript";

interface Command {
  id: string;
  label: string;
  hint?: string;
  run: () => void;
}

const { mode } = storeToRefs(useManuscriptStore());
const ui = useEditorUiStore();
const { paletteOpen, focusMode, typewriter, previewOpen } = storeToRefs(ui);
const { isDark, toggle: toggleTheme } = useTheme();

const query = ref("");
const picked = ref<string | null>(null);

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
    run: toggleTheme,
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
    picked.value = null;
  }
});

watch(picked, (id) => {
  if (!id) return;
  const cmd = commands.value.find((c) => c.id === id);
  picked.value = null;
  paletteOpen.value = false;
  cmd?.run();
});
</script>

<template>
  <DialogRoot v-model:open="paletteOpen">
    <DialogPortal>
      <DialogOverlay class="palette-scrim" />
      <DialogContent class="palette">
        <VisuallyHidden>
          <DialogTitle>명령 팔레트</DialogTitle>
          <DialogDescription>명령을 검색해 실행합니다</DialogDescription>
        </VisuallyHidden>
        <ListboxRoot v-model="picked" class="palette-listbox">
          <ListboxFilter
            v-model="query"
            class="palette-input"
            placeholder="명령 검색…"
            auto-focus
          />
          <ListboxContent class="palette-list">
            <ListboxItem
              v-for="cmd in filtered"
              :key="cmd.id"
              :value="cmd.id"
              class="palette-item"
            >
              <span>{{ cmd.label }}</span>
              <kbd v-if="cmd.hint">{{ cmd.hint }}</kbd>
            </ListboxItem>
            <p v-if="filtered.length === 0" class="palette-empty">
              일치하는 명령 없음
            </p>
          </ListboxContent>
        </ListboxRoot>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style scoped>
.palette-scrim {
  position: fixed;
  inset: 0;
  z-index: 60;
  background: rgba(0, 0, 0, 0.28);
}
.palette-scrim[data-state="open"] {
  animation: fade-in 0.14s ease;
}
.palette {
  position: fixed;
  top: 18vh;
  left: 50%;
  transform: translateX(-50%);
  z-index: 61;
  width: min(440px, 92vw);
  border-radius: 14px;
  border: 1px solid var(--border);
  background: var(--surface);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.28);
  overflow: hidden;
}
.palette[data-state="open"] {
  animation: fade-in 0.14s ease;
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
.palette-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 12px;
  border-radius: 8px;
  font-size: 14px;
  color: var(--foreground);
  cursor: pointer;
  outline: none;
}
.palette-item[data-highlighted] {
  background: var(--surface-2);
}
.palette-empty {
  margin: 0;
  padding: 9px 12px;
  font-size: 14px;
  color: var(--muted);
}
.palette-item kbd {
  font-family: var(--font-manuscript);
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 5px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  color: var(--muted);
}
@keyframes fade-in {
  from {
    opacity: 0;
  }
}
</style>
