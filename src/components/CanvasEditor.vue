<script setup lang="ts">
import { storeToRefs } from "pinia";
import { nextTick, ref, useTemplateRef } from "vue";
import { bringToFront, type Fragment, removeById } from "../core/fragments";
import { CANVAS, useManuscriptStore } from "../stores/manuscript";

const store = useManuscriptStore();
const { fragments } = storeToRefs(store);

const canvasRef = useTemplateRef<HTMLDivElement>("canvasEl");
const editorRef = useTemplateRef<HTMLDivElement>("editorEl");

const editingId = ref<string | null>(null);
const editingPos = ref({ x: 0, y: 0 });
let suppressClick = false;

function placeCaretAtEnd(el: HTMLElement) {
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
}

function startEdit(id: string) {
  bringToFront(fragments.value, id);
  const f = fragments.value.find((fr) => fr.id === id);
  if (!f) return;
  editingId.value = id;
  editingPos.value = { x: f.x, y: f.y };
  nextTick(() => {
    const el = editorRef.value;
    if (!el) return;
    el.textContent = f.text;
    el.focus();
    placeCaretAtEnd(el);
  });
}

function commitEdit() {
  const id = editingId.value;
  if (id === null) return;
  const text = (editorRef.value?.innerText ?? "").replace(/\n+$/, "");
  const idx = fragments.value.findIndex((f) => f.id === id);
  if (idx !== -1) {
    if (!text.trim()) removeById(fragments.value, id);
    else fragments.value[idx] = { ...fragments.value[idx], text };
  }
  editingId.value = null;
}

function onEditorKeydown(e: KeyboardEvent) {
  if (e.key !== "Escape") return;
  e.preventDefault();
  (e.target as HTMLElement).blur();
}

function onCanvasClick(e: MouseEvent) {
  if (suppressClick) {
    suppressClick = false;
    return;
  }
  const canvasEl = canvasRef.value;
  if (!canvasEl || e.target !== canvasEl || editingId.value !== null) return;
  const rect = canvasEl.getBoundingClientRect();
  const f: Fragment = {
    id: store.fragId(),
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
    text: "",
  };
  fragments.value.push(f);
  startEdit(f.id);
}

function onFragPointerDown(e: PointerEvent, f: Fragment) {
  if (editingId.value !== null) return;
  e.preventDefault();
  const target = e.currentTarget as HTMLElement;
  const startX = e.clientX;
  const startY = e.clientY;
  const origX = f.x;
  const origY = f.y;
  let moved = false;
  target.setPointerCapture(e.pointerId);

  function onMove(ev: PointerEvent) {
    const dx = ev.clientX - startX;
    const dy = ev.clientY - startY;
    if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
    if (moved) {
      f.x = Math.max(0, origX + dx);
      f.y = Math.max(0, origY + dy);
    }
  }
  function onUp() {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    if (!moved) {
      suppressClick = true;
      startEdit(f.id);
    } else {
      bringToFront(fragments.value, f.id);
    }
  }
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
}
</script>

<template>
  <div ref="canvasEl" class="canvas" @click="onCanvasClick">
    <div
      v-for="f in fragments"
      v-show="f.id !== editingId"
      :key="f.id"
      class="frag"
      :style="{
        left: `${f.x}px`,
        top: `${f.y}px`,
        fontSize: `${CANVAS.fontSize}px`,
        lineHeight: CANVAS.lineHeight,
        fontFamily: CANVAS.fontFamily,
      }"
      @pointerdown="onFragPointerDown($event, f)"
    >
      {{ f.text }}
    </div>

    <div
      v-if="editingId !== null"
      ref="editorEl"
      class="frag-editor"
      contenteditable="true"
      :style="{
        left: `${editingPos.x}px`,
        top: `${editingPos.y}px`,
        fontSize: `${CANVAS.fontSize}px`,
        lineHeight: CANVAS.lineHeight,
        fontFamily: CANVAS.fontFamily,
      }"
      @blur="commitEdit"
      @keydown="onEditorKeydown"
    ></div>
  </div>
</template>

<style scoped>
.canvas {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 70vh;
  cursor: crosshair;
  -webkit-user-select: none;
  user-select: none;
  background-image: radial-gradient(
    circle,
    color-mix(in srgb, var(--foreground) 10%, transparent) 1px,
    transparent 1.4px
  );
  background-size: 28px 28px;
}

.frag {
  position: absolute;
  max-width: 420px;
  padding: 2px 4px;
  white-space: pre-wrap;
  color: var(--foreground);
  cursor: grab;
  border-radius: 3px;
  outline: 1px solid transparent;
  -webkit-user-select: none;
  user-select: none;
  transition:
    outline-color 0.12s ease,
    background 0.12s ease;
}
.frag:hover {
  outline-color: color-mix(in srgb, var(--foreground) 25%, transparent);
  background: color-mix(in srgb, var(--surface) 70%, transparent);
}

.frag-editor {
  position: absolute;
  min-width: 2ch;
  max-width: 420px;
  padding: 2px 4px;
  white-space: pre-wrap;
  color: var(--foreground);
  background: var(--surface);
  border-radius: 3px;
  outline: 2px solid var(--accent);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.14);
  z-index: 50;
}
</style>
