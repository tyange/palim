<script setup lang="ts">
import { Moon, Sun } from "lucide-vue-next";
import { storeToRefs } from "pinia";
import {
  ToolbarButton,
  ToolbarRoot,
  ToolbarSeparator,
  ToolbarToggleGroup,
  ToolbarToggleItem,
  TooltipContent,
  TooltipPortal,
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
} from "reka-ui";
import { useTheme } from "../composables/useTheme";
import { useEditorUiStore } from "../stores/editorUi";
import { useManuscriptStore } from "../stores/manuscript";

const { mode } = storeToRefs(useManuscriptStore());
const ui = useEditorUiStore();
const { chromeVisible } = storeToRefs(ui);
const { isDark, toggle: toggleTheme } = useTheme();

function onModeChange(next: unknown) {
  if (next === "grid" || next === "flow") mode.value = next;
}
</script>

<template>
  <TooltipProvider :delay-duration="400">
    <ToolbarRoot
      class="command-bar"
      :class="{ 'command-bar--awake': chromeVisible }"
      aria-label="에디터 명령"
    >
      <ToolbarToggleGroup
        type="single"
        :model-value="mode"
        class="seg"
        aria-label="쓰기 모드"
        @update:model-value="onModeChange"
      >
        <ToolbarToggleItem value="grid">격자</ToolbarToggleItem>
        <ToolbarToggleItem value="flow">흐름</ToolbarToggleItem>
      </ToolbarToggleGroup>

      <ToolbarSeparator class="divider" />

      <ToolbarButton
        class="kbd"
        aria-label="명령 팔레트 열기"
        @click="ui.paletteOpen = true"
      >
        <span>명령</span>
        <kbd>⌘K</kbd>
      </ToolbarButton>

      <ToolbarSeparator class="divider" />

      <TooltipRoot>
        <TooltipTrigger as-child>
          <ToolbarButton
            class="icon-btn"
            :aria-label="isDark ? '라이트 모드로 전환' : '다크 모드로 전환'"
            @click="toggleTheme"
          >
            <Sun v-if="isDark" :size="18" :stroke-width="2" />
            <Moon v-else :size="18" :stroke-width="2" />
          </ToolbarButton>
        </TooltipTrigger>
        <TooltipPortal>
          <TooltipContent class="tooltip" :side-offset="8">
            {{ isDark ? "라이트 모드" : "다크 모드" }}
          </TooltipContent>
        </TooltipPortal>
      </TooltipRoot>
    </ToolbarRoot>
  </TooltipProvider>
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
.command-bar .seg :deep(button) {
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
.command-bar .seg :deep(button:hover) {
  color: var(--foreground);
}
.command-bar .seg :deep(button[data-state="on"]) {
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
.command-bar .icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 8px;
  background: none;
  color: var(--muted);
  cursor: pointer;
  transition: color 0.12s ease;
}
.command-bar .icon-btn:hover {
  color: var(--foreground);
}
.tooltip {
  padding: 4px 8px;
  border-radius: 6px;
  background: var(--foreground);
  color: var(--background);
  font-size: 12px;
  z-index: 41;
}
</style>
