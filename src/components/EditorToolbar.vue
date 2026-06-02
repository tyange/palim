<script setup lang="ts">
const guideOptions = [
  "왼쪽선",
  "오른쪽선",
  "세로중심",
  "가로중심",
  "대각 /",
  "대각 \\",
];
</script>

<template>
  <section
    class="flex flex-wrap items-center gap-2.5 rounded-lg border border-border bg-surface-2 px-3 py-2.5"
    aria-label="에디터 도구"
  >
    <div class="flex flex-wrap items-center gap-2">
      <label class="inline-flex items-center gap-1.5 text-[13px] text-muted">
        행 수
        <input
          class="h-[30px] w-16 rounded-md border border-border bg-surface px-1.5 text-foreground"
          type="number"
          min="1"
          value="12"
        />
      </label>
      <label class="inline-flex items-center gap-1.5 text-[13px] text-muted">
        열 수
        <input
          class="h-[30px] w-16 rounded-md border border-border bg-surface px-1.5 text-foreground"
          type="number"
          min="1"
          value="16"
        />
      </label>
      <label class="inline-flex items-center gap-1.5 text-[13px] text-muted">
        쓰기 방향
        <select
          class="h-[30px] rounded-md border border-border bg-surface px-2 text-foreground"
          value="horizontal-tb"
        >
          <option value="horizontal-tb">가로쓰기</option>
          <option value="vertical-rl">세로쓰기</option>
        </select>
      </label>
    </div>

    <div class="flex flex-wrap items-center gap-2" aria-label="가이드 라인">
      <button
        v-for="guide in guideOptions"
        :key="guide"
        type="button"
        class="h-[30px] cursor-pointer rounded-md border border-border bg-surface px-2.5 text-[13px] text-foreground transition-colors hover:enabled:border-accent disabled:cursor-not-allowed disabled:text-muted"
        aria-pressed="false"
      >
        {{ guide }}
      </button>
    </div>

    <button
      type="button"
      class="ml-auto h-[30px] cursor-pointer rounded-md border border-accent bg-accent px-2.5 text-[13px] text-accent-contrast transition-opacity hover:opacity-90"
    >
      JSON export
    </button>
  </section>
</template>
