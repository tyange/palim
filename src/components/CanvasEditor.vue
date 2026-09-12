<script setup lang="ts">
import { storeToRefs } from "pinia";
import { nextTick, onMounted, onUnmounted, ref, useTemplateRef } from "vue";
import {
  type AlignEdge,
  type AlignRect,
  alignEdge,
  computeSnap,
  distribute,
  type SnapGuide,
} from "../core/align";
import {
  bringToFront,
  duplicateSelected,
  type Fragment,
  nudge,
  removeById,
} from "../core/fragments";
import { useEditorUiStore } from "../stores/editorUi";
import { CANVAS, useManuscriptStore } from "../stores/manuscript";
import SelectionToolbar from "./SelectionToolbar.vue";

const store = useManuscriptStore();
const { fragments } = storeToRefs(store);
const ui = useEditorUiStore();

const canvasRef = useTemplateRef<HTMLDivElement>("canvasEl");
const editorRef = useTemplateRef<HTMLDivElement>("editorEl");
const fragEls = new Map<string, HTMLElement>();

const editingId = ref<string | null>(null);
const editingPos = ref({ x: 0, y: 0 });
const isNewFragment = ref(false);
const selectedIds = ref<Set<string>>(new Set());
const marquee = ref<{ x: number; y: number; w: number; h: number } | null>(
  null,
);
const snapGuides = ref<SnapGuide[]>([]);

function registerFragEl(id: string, el: Element | null) {
  if (el) fragEls.set(id, el as HTMLElement);
  else fragEls.delete(id);
}

function placeCaretAtEnd(el: HTMLElement) {
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
}

function startEdit(id: string) {
  selectedIds.value = new Set();
  isNewFragment.value = false;
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

function startNewFragment(x: number, y: number) {
  selectedIds.value = new Set();
  isNewFragment.value = true;
  editingId.value = store.fragId();
  editingPos.value = { x, y };
  nextTick(() => {
    const el = editorRef.value;
    if (!el) return;
    el.textContent = "";
    el.focus();
  });
}

function commitEdit() {
  const id = editingId.value;
  if (id === null) return;
  const text = (editorRef.value?.innerText ?? "").replace(/\n+$/, "");
  if (isNewFragment.value) {
    if (text.trim()) {
      store.snapshot();
      fragments.value.push({
        id,
        x: editingPos.value.x,
        y: editingPos.value.y,
        text,
      });
    }
  } else {
    const idx = fragments.value.findIndex((f) => f.id === id);
    if (idx !== -1 && text !== fragments.value[idx].text) {
      store.snapshot();
      if (!text.trim()) removeById(fragments.value, id);
      else fragments.value[idx] = { ...fragments.value[idx], text };
    }
  }
  editingId.value = null;
  isNewFragment.value = false;
}

function onEditorKeydown(e: KeyboardEvent) {
  if (e.key !== "Escape") return;
  e.preventDefault();
  (e.target as HTMLElement).blur();
}

function rectsOverlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
): boolean {
  return (
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
  );
}

function selectedRects(): AlignRect[] {
  const rects: AlignRect[] = [];
  for (const f of fragments.value) {
    if (!selectedIds.value.has(f.id)) continue;
    const el = fragEls.get(f.id);
    if (!el) continue;
    rects.push({
      id: f.id,
      x: f.x,
      y: f.y,
      w: el.offsetWidth,
      h: el.offsetHeight,
    });
  }
  return rects;
}

function rectsExcept(excludeIds: Set<string>): AlignRect[] {
  const rects: AlignRect[] = [];
  for (const f of fragments.value) {
    if (excludeIds.has(f.id) || f.id === editingId.value) continue;
    const el = fragEls.get(f.id);
    if (!el) continue;
    rects.push({
      id: f.id,
      x: f.x,
      y: f.y,
      w: el.offsetWidth,
      h: el.offsetHeight,
    });
  }
  return rects;
}

function applyPositions(positions: Map<string, { x: number; y: number }>) {
  for (const [id, pos] of positions) {
    const idx = fragments.value.findIndex((f) => f.id === id);
    if (idx !== -1) fragments.value[idx] = { ...fragments.value[idx], ...pos };
  }
}

function onAlign(edge: AlignEdge) {
  const positions = alignEdge(selectedRects(), edge);
  if (positions.size === 0) return;
  store.snapshot();
  applyPositions(positions);
}

function onDistribute(axis: "x" | "y") {
  const positions = distribute(selectedRects(), axis);
  if (positions.size === 0) return;
  store.snapshot();
  applyPositions(positions);
}

function onCanvasPointerDown(e: PointerEvent) {
  const canvasEl = canvasRef.value;
  if (!canvasEl || e.target !== canvasEl || editingId.value !== null) return;

  const rect = canvasEl.getBoundingClientRect();
  const startX = e.clientX - rect.left;
  const startY = e.clientY - rect.top;
  let moved = false;

  function onMove(ev: PointerEvent) {
    const curX = ev.clientX - rect.left;
    const curY = ev.clientY - rect.top;
    if (!moved && Math.abs(curX - startX) + Math.abs(curY - startY) <= 3)
      return;
    moved = true;
    const box = {
      x: Math.min(startX, curX),
      y: Math.min(startY, curY),
      w: Math.abs(curX - startX),
      h: Math.abs(curY - startY),
    };
    marquee.value = box;
    const hit = new Set<string>();
    for (const f of fragments.value) {
      if (f.id === editingId.value) continue;
      const el = fragEls.get(f.id);
      if (!el) continue;
      if (
        rectsOverlap(box, {
          x: f.x,
          y: f.y,
          w: el.offsetWidth,
          h: el.offsetHeight,
        })
      ) {
        hit.add(f.id);
      }
    }
    selectedIds.value = hit;
  }
  function onUp() {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    marquee.value = null;
    if (moved) return;
    startNewFragment(startX, startY);
  }
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
}

function onFragPointerDown(e: PointerEvent, f: Fragment) {
  if (editingId.value !== null) return;
  e.preventDefault();
  const target = e.currentTarget as HTMLElement;
  const startX = e.clientX;
  const startY = e.clientY;
  const isGroupDrag = selectedIds.value.has(f.id) && selectedIds.value.size > 1;
  if (!isGroupDrag) selectedIds.value = new Set();
  const origins = new Map<string, { x: number; y: number }>();
  const group = isGroupDrag ? selectedIds.value : new Set([f.id]);
  for (const id of group) {
    const fr = fragments.value.find((fx) => fx.id === id);
    if (fr) origins.set(id, { x: fr.x, y: fr.y });
  }
  let moved = false;
  target.setPointerCapture(e.pointerId);

  function groupBoundingRect(dxRaw: number, dyRaw: number): AlignRect | null {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const [id, origin] of origins) {
      const el = fragEls.get(id);
      if (!el) continue;
      const x = origin.x + dxRaw;
      const y = origin.y + dyRaw;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + el.offsetWidth);
      maxY = Math.max(maxY, y + el.offsetHeight);
    }
    if (minX === Infinity) return null;
    return { id: "", x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }

  function onMove(ev: PointerEvent) {
    const dx = ev.clientX - startX;
    const dy = ev.clientY - startY;
    if (!moved && Math.abs(dx) + Math.abs(dy) > 3) {
      moved = true;
      store.snapshot();
    }
    if (!moved) return;

    let snapDx = 0;
    let snapDy = 0;
    const movingRect = groupBoundingRect(dx, dy);
    if (movingRect) {
      const snap = computeSnap(movingRect, rectsExcept(group));
      snapDx = snap.dx;
      snapDy = snap.dy;
      snapGuides.value = snap.guides;
    } else {
      snapGuides.value = [];
    }

    for (const [id, origin] of origins) {
      const idx = fragments.value.findIndex((fx) => fx.id === id);
      if (idx === -1) continue;
      fragments.value[idx] = {
        ...fragments.value[idx],
        x: Math.max(0, origin.x + dx + snapDx),
        y: Math.max(0, origin.y + dy + snapDy),
      };
    }
  }
  function onUp() {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    snapGuides.value = [];
    if (!moved) {
      startEdit(f.id);
    } else {
      for (const id of group) bringToFront(fragments.value, id);
    }
  }
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
}

const NUDGE_KEYS: Record<string, [number, number]> = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
};
let nudging = false;
let nudgeIdleTimer: ReturnType<typeof setTimeout> | null = null;

function onKeydown(e: KeyboardEvent) {
  if (editingId.value !== null) return;
  if (ui.paletteOpen || ui.previewOpen) return;

  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
    e.preventDefault();
    if (e.shiftKey) store.redo();
    else store.undo();
    selectedIds.value = new Set();
    return;
  }

  if (selectedIds.value.size === 0) return;
  if (e.key === "Escape") {
    selectedIds.value = new Set();
    return;
  }
  if (e.key === "Delete" || e.key === "Backspace") {
    e.preventDefault();
    store.snapshot();
    for (const id of selectedIds.value) removeById(fragments.value, id);
    selectedIds.value = new Set();
    return;
  }
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d") {
    e.preventDefault();
    store.snapshot();
    const newIds = duplicateSelected(fragments.value, selectedIds.value, () =>
      store.fragId(),
    );
    selectedIds.value = new Set(newIds);
    return;
  }
  if (e.key in NUDGE_KEYS) {
    e.preventDefault();
    if (!nudging) {
      nudging = true;
      store.snapshot();
    }
    if (nudgeIdleTimer !== null) clearTimeout(nudgeIdleTimer);
    nudgeIdleTimer = setTimeout(() => {
      nudging = false;
      nudgeIdleTimer = null;
    }, 500);
    const step = e.shiftKey ? 10 : 1;
    const [dx, dy] = NUDGE_KEYS[e.key];
    nudge(fragments.value, selectedIds.value, dx * step, dy * step);
  }
}

onMounted(() => document.addEventListener("keydown", onKeydown));
onUnmounted(() => {
  document.removeEventListener("keydown", onKeydown);
  if (nudgeIdleTimer !== null) clearTimeout(nudgeIdleTimer);
});
</script>

<template>
  <div ref="canvasEl" class="canvas" @pointerdown="onCanvasPointerDown">
    <SelectionToolbar
      v-if="selectedIds.size >= 2"
      :count="selectedIds.size"
      @align="onAlign"
      @distribute="onDistribute"
    />
    <div
      v-for="f in fragments"
      v-show="f.id !== editingId"
      :key="f.id"
      :ref="(el) => registerFragEl(f.id, el as Element | null)"
      class="frag"
      :class="{ selected: selectedIds.has(f.id) }"
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

    <div
      v-if="marquee"
      class="marquee"
      :style="{
        left: `${marquee.x}px`,
        top: `${marquee.y}px`,
        width: `${marquee.w}px`,
        height: `${marquee.h}px`,
      }"
    ></div>

    <div
      v-for="g in snapGuides"
      :key="`${g.axis}-${g.pos}`"
      class="snap-guide"
      :class="g.axis"
      :style="g.axis === 'x' ? { left: `${g.pos}px` } : { top: `${g.pos}px` }"
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
.frag.selected {
  outline: 1.5px solid var(--accent);
  background: color-mix(in srgb, var(--accent) 10%, transparent);
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

.marquee {
  position: absolute;
  border: 1px solid var(--accent);
  background: color-mix(in srgb, var(--accent) 12%, transparent);
  pointer-events: none;
}

.snap-guide {
  position: absolute;
  background: var(--accent);
  pointer-events: none;
  z-index: 60;
}
.snap-guide.x {
  top: 0;
  bottom: 0;
  width: 1px;
}
.snap-guide.y {
  left: 0;
  right: 0;
  height: 1px;
}
</style>
