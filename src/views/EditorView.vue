<script setup lang="ts">
import { useMediaQuery } from "@vueuse/core";
import { ref } from "vue";
import EditorToolbar from "../components/EditorToolbar.vue";
import GridEditor from "../components/GridEditor.vue";
import ManuscriptPreview from "../components/ManuscriptPreview.vue";
import PaneToggle from "../components/PaneToggle.vue";
import ThemeToggle from "../components/ThemeToggle.vue";

const isCompact = useMediaQuery("(max-width: 1151px)");
const activePane = ref<"editor" | "preview">("editor");
</script>

<template>
  <main
    class="flex min-h-screen flex-col bg-background p-5 text-foreground min-[1152px]:justify-center max-[700px]:p-3"
  >
    <div
      class="mx-auto flex w-full flex-col gap-12 mt-12 min-[1152px]:mt-0 max-[700px]:gap-16 max-[700px]:mt-8"
      :class="isCompact ? 'max-w-[544px]' : 'max-w-[1112px]'"
    >
      <header class="flex items-center justify-between gap-4">
        <div>
          <h1 class="m-0 text-2xl leading-tight font-medium">Palim</h1>
          <p class="mt-1 mb-0 text-sm text-muted">그리드 텍스트 에디터</p>
        </div>
        <ThemeToggle />
      </header>

      <div class="flex flex-col gap-3">
        <EditorToolbar v-if="false" />

        <PaneToggle v-if="isCompact" v-model="activePane" class="py-1" />

        <div
          class="flex gap-6"
          :class="isCompact ? 'flex-col items-center' : 'items-start'"
        >
          <div
            v-show="!isCompact || activePane === 'editor'"
            class="flex min-w-0 max-w-full flex-col gap-2"
          >
            <div class="flex h-[30px] items-center">
              <span class="text-sm text-muted">에디터</span>
            </div>
            <GridEditor />
          </div>
          <ManuscriptPreview v-show="!isCompact || activePane === 'preview'" />
        </div>
      </div>
    </div>
  </main>
</template>
