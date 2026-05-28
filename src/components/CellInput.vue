<script setup lang="ts">
import { onMounted, ref, useTemplateRef } from "vue";

const emit = defineEmits<{
  completed: [value: string];
}>();

const inputRef = useTemplateRef<HTMLInputElement>("cellInput");

const isComposing = ref(false);

onMounted(() => {
  inputRef.value?.focus();
});

function handleCompositionEnd(event: Event) {
  if (!inputRef.value) {
    return;
  }

  const data = (event as CompositionEvent).data;
  emit("completed", data);
  isComposing.value = false;
  inputRef.value.value = "";
}

function handleInput(event: Event) {
  if (isComposing.value || !inputRef.value) {
    return;
  }

  const input = event.target as HTMLInputElement;
  emit("completed", input.value);
  inputRef.value.value = "";
}
</script>

<template>
  <input
    ref="cellInput"
    class="box-border h-full w-full border border-[#b07232] bg-transparent text-center outline-none"
    @compositionstart="isComposing = true"
    @compositionend="handleCompositionEnd"
    @input="handleInput"
  />
</template>
