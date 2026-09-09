import { useColorMode, usePreferredDark } from "@vueuse/core";
import { computed } from "vue";

export function useTheme() {
  const mode = useColorMode();
  const prefersDark = usePreferredDark();

  const isDark = computed(() =>
    mode.value === "auto" ? prefersDark.value : mode.value === "dark",
  );

  function toggle() {
    mode.value = isDark.value ? "light" : "dark";
  }

  return { isDark, toggle };
}
