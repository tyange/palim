<script setup lang="ts">
import { useColorMode, usePreferredDark } from "@vueuse/core";
import { computed } from "vue";

// useColorMode: 'auto' | 'light' | 'dark' 를 localStorage에 저장하고
// <html>에 클래스를 자동 토글. 기본은 'auto'(시스템 설정 따름).
const mode = useColorMode();
const prefersDark = usePreferredDark();

const isDark = computed(() =>
  mode.value === "auto" ? prefersDark.value : mode.value === "dark",
);

function toggle() {
  mode.value = isDark.value ? "light" : "dark";
}
</script>

<template>
  <button
    type="button"
    class="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface text-foreground transition-colors hover:bg-surface-2"
    :aria-label="isDark ? '라이트 모드로 전환' : '다크 모드로 전환'"
    :title="isDark ? '라이트 모드' : '다크 모드'"
    @click="toggle"
  >
    <svg
      v-if="isDark"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path
        d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
      />
    </svg>
    <svg
      v-else
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  </button>
</template>
