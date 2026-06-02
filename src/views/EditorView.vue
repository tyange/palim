<script setup lang="ts">
import EditorToolbar from "../components/EditorToolbar.vue";
import GridEditor from "../components/GridEditor.vue";
import ThemeToggle from "../components/ThemeToggle.vue";
</script>

<template>
  <main
    class="flex min-h-screen flex-col gap-3 bg-background p-5 text-foreground max-[700px]:p-3"
  >
    <header class="flex items-center justify-between gap-4">
      <div>
        <h1 class="m-0 text-2xl leading-tight font-medium">Palim</h1>
        <p class="mt-1 mb-0 text-sm text-muted">그리드 텍스트 에디터</p>
      </div>
      <ThemeToggle />
    </header>

    <EditorToolbar />

    <GridEditor />
  </main>
</template>
