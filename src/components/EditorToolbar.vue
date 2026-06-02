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
    class="flex flex-wrap items-center gap-2.5 border border-[#ddd8cf] bg-[#f8f5ef] px-3 py-2.5"
    aria-label="에디터 도구"
  >
    <div class="flex flex-wrap items-center gap-2">
      <label class="inline-flex items-center gap-1.5 text-[13px] text-[#4d473f]">
        행 수
        <input
          class="h-[30px] w-16 rounded border border-[#bfb8ad] bg-[#fffdf8] px-1.5 text-[#1f1a14]"
          type="number"
          min="1"
          value="12"
        />
      </label>
      <label class="inline-flex items-center gap-1.5 text-[13px] text-[#4d473f]">
        열 수
        <input
          class="h-[30px] w-16 rounded border border-[#bfb8ad] bg-[#fffdf8] px-1.5 text-[#1f1a14]"
          type="number"
          min="1"
          value="16"
        />
      </label>
      <label class="inline-flex items-center gap-1.5 text-[13px] text-[#4d473f]">
        쓰기 방향
        <select
          class="h-[30px] rounded border border-[#bfb8ad] bg-[#fffdf8] px-2 text-[#1f1a14]"
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
        class="h-[30px] cursor-pointer rounded border border-[#bfb8ad] bg-[#fffdf8] px-2.5 text-[13px] text-[#1f1a14] shadow-none hover:enabled:border-[#c75c3a] disabled:cursor-not-allowed disabled:text-[#9b948a]"
        aria-pressed="false"
      >
        {{ guide }}
      </button>
    </div>

    <button
      type="button"
      class="ml-auto h-[30px] cursor-pointer rounded border border-[#c75c3a] bg-[#c75c3a] px-2.5 text-[13px] text-white shadow-none hover:border-[#a8492c] hover:bg-[#a8492c]"
    >
      JSON export
    </button>
  </section>
</template>
