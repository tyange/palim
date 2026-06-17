<script setup lang="ts">
import { useMediaQuery } from "@vueuse/core";
import { ref } from "vue";
import EditorToolbar from "../components/EditorToolbar.vue";
import GridEditor from "../components/GridEditor.vue";
import ManuscriptPreview from "../components/ManuscriptPreview.vue";
import PaneToggle from "../components/PaneToggle.vue";
import ThemeToggle from "../components/ThemeToggle.vue";

// 에디터(544px)+프리뷰(544px)+gap+패딩이 한 줄에 들어가는 임계폭 ≈ 1152px.
// 그 아래에선 둘을 세로로 쌓는 대신, 토글로 한 번에 하나만 보여준다.
const isCompact = useMediaQuery("(max-width: 1151px)");
const activePane = ref<"editor" | "preview">("editor");
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

    <EditorToolbar v-if="false" />

    <!-- 컴팩트 모드 전용: 에디터 ↔ 미리보기 전환 토글 -->
    <PaneToggle v-if="isCompact" v-model="activePane" class="py-1" />

    <!--
      넓은 화면: 에디터·미리보기를 가로로 나란히.
      컴팩트: 세로 정렬 + v-show로 활성 패널만 표시(둘 다 마운트 유지 → 입력/조판 상태 보존).
    -->
    <div class="flex items-start gap-6" :class="{ 'flex-col': isCompact }">
      <div
        v-show="!isCompact || activePane === 'editor'"
        class="flex min-w-0 max-w-full flex-col gap-2"
      >
        <!-- 미리보기 헤더와 같은 높이의 헤더 → 격자와 미리보기 SVG 상단을 맞춘다 -->
        <div class="flex h-[30px] items-center">
          <span class="text-sm text-muted">에디터</span>
        </div>
        <GridEditor />
      </div>
      <ManuscriptPreview v-show="!isCompact || activePane === 'preview'" />
    </div>
  </main>
</template>
