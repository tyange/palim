<script setup lang="ts">
import EditorToolbar from "../components/EditorToolbar.vue";
import GridEditor from "../components/GridEditor.vue";
import ManuscriptPreview from "../components/ManuscriptPreview.vue";
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

    <div class="flex flex-wrap items-start gap-6">
      <div class="flex flex-col gap-2">
        <!-- 미리보기 헤더와 같은 높이의 헤더 → 격자와 미리보기 SVG 상단을 맞춘다 -->
        <div class="flex h-[30px] items-center">
          <span class="text-sm text-muted">에디터</span>
        </div>
        <GridEditor />
      </div>
      <ManuscriptPreview />
    </div>
  </main>
</template>
