<script setup lang="ts">
import EditorToolbar from "../components/EditorToolbar.vue";
import GridEditor from "../components/GridEditor.vue";
</script>

<template>
  <main
    class="flex min-h-screen flex-col gap-3 bg-[#ebe7df] p-5 text-[#1f1a14] max-[700px]:p-3"
  >
    <header class="flex items-end justify-between gap-4 max-[700px]:block">
      <div>
        <h1 class="m-0 text-2xl leading-tight">Palim</h1>
        <p class="mt-1 mb-0 text-sm text-[#645d54]">
          원고지형 그리드 텍스트 에디터 MVP
        </p>
      </div>
      <div class="text-[13px] text-[#645d54] max-[700px]:mt-1.5">
        12행 x 16열
      </div>
    </header>

    <EditorToolbar />

    <GridEditor />
  </main>
</template>
