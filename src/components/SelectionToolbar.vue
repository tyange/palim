<script setup lang="ts">
import {
  AlignHorizontalDistributeCenter,
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
  AlignHorizontalJustifyStart,
  AlignVerticalDistributeCenter,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
} from "lucide-vue-next";
import {
  ToolbarButton,
  ToolbarRoot,
  ToolbarSeparator,
  TooltipContent,
  TooltipPortal,
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
} from "reka-ui";
import type { AlignEdge } from "../core/align";

defineProps<{ count: number }>();
const emit = defineEmits<{
  align: [edge: AlignEdge];
  distribute: [axis: "x" | "y"];
}>();

interface AlignBtn {
  edge: AlignEdge;
  icon: typeof AlignHorizontalJustifyStart;
  label: string;
}

const horizontalBtns: AlignBtn[] = [
  { edge: "left", icon: AlignHorizontalJustifyStart, label: "왼쪽 정렬" },
  {
    edge: "centerX",
    icon: AlignHorizontalJustifyCenter,
    label: "가로 중앙 정렬",
  },
  { edge: "right", icon: AlignHorizontalJustifyEnd, label: "오른쪽 정렬" },
];
const verticalBtns: AlignBtn[] = [
  { edge: "top", icon: AlignVerticalJustifyStart, label: "위 정렬" },
  {
    edge: "centerY",
    icon: AlignVerticalJustifyCenter,
    label: "세로 중앙 정렬",
  },
  { edge: "bottom", icon: AlignVerticalJustifyEnd, label: "아래 정렬" },
];
</script>

<template>
  <TooltipProvider :delay-duration="400">
    <ToolbarRoot class="selection-toolbar" aria-label="선택 조각 정렬">
      <span class="count">{{ count }}개 선택</span>

      <ToolbarSeparator class="divider" />

      <TooltipRoot v-for="btn in horizontalBtns" :key="btn.edge">
        <TooltipTrigger as-child>
          <ToolbarButton
            class="icon-btn"
            :aria-label="btn.label"
            @click="emit('align', btn.edge)"
          >
            <component :is="btn.icon" :size="16" :stroke-width="2" />
          </ToolbarButton>
        </TooltipTrigger>
        <TooltipPortal>
          <TooltipContent class="tooltip" :side-offset="8">{{
            btn.label
          }}</TooltipContent>
        </TooltipPortal>
      </TooltipRoot>

      <ToolbarSeparator class="divider" />

      <TooltipRoot v-for="btn in verticalBtns" :key="btn.edge">
        <TooltipTrigger as-child>
          <ToolbarButton
            class="icon-btn"
            :aria-label="btn.label"
            @click="emit('align', btn.edge)"
          >
            <component :is="btn.icon" :size="16" :stroke-width="2" />
          </ToolbarButton>
        </TooltipTrigger>
        <TooltipPortal>
          <TooltipContent class="tooltip" :side-offset="8">{{
            btn.label
          }}</TooltipContent>
        </TooltipPortal>
      </TooltipRoot>

      <template v-if="count >= 3">
        <ToolbarSeparator class="divider" />

        <TooltipRoot>
          <TooltipTrigger as-child>
            <ToolbarButton
              class="icon-btn"
              aria-label="가로 균등 배치"
              @click="emit('distribute', 'x')"
            >
              <AlignHorizontalDistributeCenter :size="16" :stroke-width="2" />
            </ToolbarButton>
          </TooltipTrigger>
          <TooltipPortal>
            <TooltipContent class="tooltip" :side-offset="8"
              >가로 균등 배치</TooltipContent
            >
          </TooltipPortal>
        </TooltipRoot>

        <TooltipRoot>
          <TooltipTrigger as-child>
            <ToolbarButton
              class="icon-btn"
              aria-label="세로 균등 배치"
              @click="emit('distribute', 'y')"
            >
              <AlignVerticalDistributeCenter :size="16" :stroke-width="2" />
            </ToolbarButton>
          </TooltipTrigger>
          <TooltipPortal>
            <TooltipContent class="tooltip" :side-offset="8"
              >세로 균등 배치</TooltipContent
            >
          </TooltipPortal>
        </TooltipRoot>
      </template>
    </ToolbarRoot>
  </TooltipProvider>
</template>

<style scoped>
.selection-toolbar {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 40;
  display: flex;
  align-items: center;
  gap: 4px;
  width: max-content;
  max-width: calc(100vw - 24px);
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: color-mix(in srgb, var(--surface) 86%, transparent);
  backdrop-filter: blur(8px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.14);
}
.count {
  padding: 0 4px;
  color: var(--muted);
  font-size: 12px;
  white-space: nowrap;
}
.divider {
  width: 1px;
  align-self: stretch;
  margin: 4px 2px;
  background: var(--border);
}
.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: 0;
  border-radius: 7px;
  background: none;
  color: var(--muted);
  cursor: pointer;
  transition:
    color 0.12s ease,
    background 0.12s ease;
}
.icon-btn:hover {
  color: var(--foreground);
  background: var(--surface-2);
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
