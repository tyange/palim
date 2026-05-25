<script setup lang="ts">
import { onMounted, ref, useTemplateRef } from "vue";

const model = defineModel<string>({ required: true });

const emit = defineEmits<{
  completed: [value: string];
}>();

const inputRef = useTemplateRef<HTMLInputElement>("cellInput");

onMounted(() => {
  inputRef.value?.focus();
});

function handleInput(event: Event) {
  const input = event.target as HTMLInputElement;
  const value = [...input.value].slice(0, 1).join("");

  model.value = value;
  input.value = value;

  if (value.length === 1 && event) {
    emit("completed", value);
  }
}
</script>

<template>
  <input
    ref="cellInput"
    :value="model"
    maxlength="1"
    class="box-border h-full w-full border border-[#b07232] bg-transparent text-center outline-none"
    @input="handleInput"
  />
</template>
