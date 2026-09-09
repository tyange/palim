import { ref } from "vue";

export interface ToastItem {
  id: number;
  message: string;
}

const toasts = ref<ToastItem[]>([]);
let seq = 0;

export function useToast() {
  function addToast(message: string) {
    const id = ++seq;
    toasts.value = [...toasts.value, { id, message }];
    return id;
  }

  function dismiss(id: number) {
    toasts.value = toasts.value.filter((t) => t.id !== id);
  }

  return { toasts, addToast, dismiss };
}
