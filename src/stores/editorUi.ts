import { useLocalStorage } from "@vueuse/core";
import { defineStore } from "pinia";
import { ref } from "vue";

export const useEditorUiStore = defineStore("editorUi", () => {
  const focusMode = useLocalStorage("palim-focus-mode", true);
  const typewriter = useLocalStorage("palim-typewriter", true);

  const previewOpen = ref(false);
  const paletteOpen = ref(false);
  const chromeVisible = ref(true);

  function toggleFocusMode() {
    focusMode.value = !focusMode.value;
  }
  function toggleTypewriter() {
    typewriter.value = !typewriter.value;
  }
  function togglePreview() {
    previewOpen.value = !previewOpen.value;
  }

  return {
    focusMode,
    typewriter,
    previewOpen,
    paletteOpen,
    chromeVisible,
    toggleFocusMode,
    toggleTypewriter,
    togglePreview,
  };
});
