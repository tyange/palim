<script setup lang="ts">
import { AlignLeft, Grid3x3 } from "lucide-vue-next";
import { storeToRefs } from "pinia";
import { useManuscriptStore } from "../stores/manuscript";

const { mode } = storeToRefs(useManuscriptStore());

function toggle() {
  mode.value = mode.value === "grid" ? "flow" : "grid";
}
</script>

<template>
  <div class="flex items-center justify-center gap-3 select-none">
    <span
      class="text-sm transition-colors"
      :class="mode === 'grid' ? 'font-medium text-foreground' : 'text-muted'"
    >
      격자
    </span>

    <button
      type="button"
      role="switch"
      :aria-checked="mode === 'flow'"
      aria-label="격자와 흐름 모드 전환"
      class="relative inline-flex h-7 w-14 shrink-0 cursor-pointer items-center rounded-full border border-border bg-surface-2 transition-colors"
      @click="toggle"
    >
      <span
        class="absolute top-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-accent-contrast transition-[left] duration-200 ease-out"
        :class="mode === 'grid' ? 'left-1' : 'left-8'"
      >
        <Grid3x3 v-if="mode === 'grid'" :size="12" :stroke-width="2.5" />
        <AlignLeft v-else :size="12" :stroke-width="2.5" />
      </span>
    </button>

    <span
      class="text-sm transition-colors"
      :class="mode === 'flow' ? 'font-medium text-foreground' : 'text-muted'"
    >
      흐름
    </span>
  </div>
</template>
