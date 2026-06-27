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
  <!--
    데스크탑(≥1152px): main을 세로 flex로 만들어 콘텐츠를 수직 중앙 정렬한다.
    컴팩트/모바일: 중앙 정렬 없이 위에서부터 흐르고, 대신 콘텐츠 컨테이너의 margin-top으로
    화면 위쪽에서 띄운다(수직 중앙 정렬이 어색하게 느껴지는 문제 회피).
  -->
  <main
    class="flex min-h-screen flex-col bg-background p-5 text-foreground min-[1152px]:justify-center max-[700px]:p-3"
  >
    <!--
      콘텐츠를 컨테이너로 묶어 중앙 정렬하고, 헤더도 같은 컨테이너에 둬 가장자리를 맞춘다.
      - 넓은 화면: 패널 2개 폭(에디터 544 + 미리보기 544 + gap-6 24 = 1112px)
      - 컴팩트: 패널 하나만 보이므로 단일 패널 폭(544px)으로 좁혀 헤더가 콘텐츠보다
        넓게 퍼지지 않게 한다. 더 좁은 화면에선 자연히 100%로 줄어든다.
    -->
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

        <!-- 컴팩트 모드 전용: 에디터 ↔ 미리보기 전환 토글 -->
        <PaneToggle v-if="isCompact" v-model="activePane" class="py-1" />

        <!--
          넓은 화면: 에디터·미리보기를 가로로 나란히(컨테이너에 꽉 차므로 자연히 양 끝 정렬).
          컴팩트: 세로 + 가운데 정렬, v-show로 활성 패널만 표시(둘 다 마운트 유지 → 상태 보존).
        -->
        <div
          class="flex gap-6"
          :class="isCompact ? 'flex-col items-center' : 'items-start'"
        >
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
      </div>
    </div>
  </main>
</template>
