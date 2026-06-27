<script setup lang="ts">
import { Eye, PencilLine } from "lucide-vue-next";

const model = defineModel<"editor" | "preview">({ required: true });

function toggle() {
  model.value = model.value === "editor" ? "preview" : "editor";
}
</script>

<template>
  <div class="flex items-center justify-center gap-3 select-none">
    <span
      class="text-sm transition-colors"
      :class="model === 'editor' ? 'font-medium text-foreground' : 'text-muted'"
    >
      에디터
    </span>

    <button
      type="button"
      role="switch"
      :aria-checked="model === 'preview'"
      aria-label="에디터와 미리보기 전환"
      class="relative inline-flex h-7 w-14 shrink-0 cursor-pointer items-center rounded-full border border-border bg-surface-2 transition-colors"
      @click="toggle"
    >
      <span
        class="absolute top-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-accent-contrast transition-[left] duration-200 ease-out"
        :class="model === 'editor' ? 'left-1' : 'left-8'"
      >
        <PencilLine v-if="model === 'editor'" :size="12" :stroke-width="2.5" />
        <Eye v-else :size="12" :stroke-width="2.5" />
      </span>
    </button>

    <span
      class="text-sm transition-colors"
      :class="model === 'preview' ? 'font-medium text-foreground' : 'text-muted'"
    >
      미리보기
    </span>
  </div>
</template>
