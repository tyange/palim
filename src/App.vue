<script setup lang="ts">
import AppToaster from "./components/AppToaster.vue";
import { useDocuments } from "./composables/useDocuments";
import EditorView from "./views/EditorView.vue";

useDocuments().start();
</script>

<template>
  <EditorView />
  <AppToaster />
</template>
