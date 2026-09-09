import { useLocalStorage } from "@vueuse/core";
import { defineStore } from "pinia";
import { ref } from "vue";

export const useEditorUiStore = defineStore("editorUi", () => {
  const typewriter = useLocalStorage("palim-typewriter", true);

  const previewOpen = ref(false);
  const paletteOpen = ref(false);
  const chromeVisible = ref(true);

  function toggleTypewriter() {
    typewriter.value = !typewriter.value;
  }
  function togglePreview() {
    previewOpen.value = !previewOpen.value;
  }

  return {
    typewriter,
    previewOpen,
    paletteOpen,
    chromeVisible,
    toggleTypewriter,
    togglePreview,
  };
});
