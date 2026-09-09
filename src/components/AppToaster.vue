<script setup lang="ts">
import {
  ToastProvider,
  ToastRoot,
  ToastDescription,
  ToastViewport,
} from "reka-ui";
import { useToast } from "../composables/useToast";

const { toasts, dismiss } = useToast();
</script>

<template>
  <ToastProvider :duration="2600" swipe-direction="right">
    <ToastRoot
      v-for="t in toasts"
      :key="t.id"
      class="toast"
      @update:open="(open) => !open && dismiss(t.id)"
    >
      <ToastDescription>{{ t.message }}</ToastDescription>
    </ToastRoot>
    <ToastViewport class="toast-viewport" />
  </ToastProvider>
</template>

<style scoped>
.toast-viewport {
  position: fixed;
  bottom: 84px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 70;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
  outline: none;
}
.toast {
  padding: 8px 16px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--foreground);
  font-size: 13px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.16);
}
.toast[data-state="open"] {
  animation: toast-in 0.18s ease;
}
.toast[data-state="closed"] {
  animation: toast-out 0.14s ease;
}
@keyframes toast-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
}
@keyframes toast-out {
  to {
    opacity: 0;
  }
}
</style>
