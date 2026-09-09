<script setup lang="ts">
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { EditorState, Transaction } from "@codemirror/state";
import {
  drawSelection,
  EditorView,
  highlightActiveLine,
  keymap,
  type ViewUpdate,
} from "@codemirror/view";
import { storeToRefs } from "pinia";
import { onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from "vue";
import { MARGIN_COLS, MARGIN_ROWS, padRect, trimRect } from "../core/rect";
import { GRID, useManuscriptStore } from "../stores/manuscript";

const emit = defineEmits<{ caretmove: [line: number] }>();

const { text } = storeToRefs(useManuscriptStore());

const hostRef = useTemplateRef<HTMLDivElement>("hostEl");
const rc = ref({ row: 1, col: 0 });

let view: EditorView | undefined;
let internal = false;
let repadHandle = 0;

const theme = EditorView.theme({
  "&": { height: "auto", background: "transparent" },
  ".cm-scroller": { overflow: "visible" },
  ".cm-content": {
    fontFamily: '"Nanum Gothic Coding", "D2Coding", ui-monospace, monospace',
    fontSize: `${GRID.fontSize}px`,
    lineHeight: `${GRID.lineHeight}px`,
    wordSpacing: "0.5em",
    padding: `${GRID.padY}px ${GRID.padX}px`,
    width: "max-content",
    minWidth: "0",
    flexGrow: "0",
    flexShrink: "0",
    caretColor: "var(--foreground)",
    color: "var(--foreground)",
  },
  ".cm-line": { padding: "0" },
  "&.cm-focused": { outline: "none" },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--foreground)" },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection":
    {
      background: "color-mix(in srgb, var(--accent) 22%, transparent)",
    },
  ".cm-activeLine": {
    background: "color-mix(in srgb, var(--foreground) 3.5%, transparent)",
  },
});

function reportCursor(state: EditorState) {
  const head = state.selection.main.head;
  const line = state.doc.lineAt(head);
  rc.value = { row: line.number, col: head - line.from };
  emit("caretmove", line.number - 1);
}

function pushToStore() {
  if (!view) return;
  const trimmed = trimRect(view.state.doc.toString());
  if (trimmed !== text.value) text.value = trimmed;
}

function repad() {
  if (!view || internal) return;
  const raw = view.state.doc.toString();
  const lines = raw.split("\n");
  const contentW = lines.reduce(
    (m, l) => Math.max(m, l.replace(/[ \t]+$/, "").length),
    0,
  );
  const curW = lines.reduce((m, l) => Math.max(m, l.length), 0);
  const wantW = contentW + MARGIN_COLS;

  let blankTail = 0;
  for (let i = lines.length - 1; i >= 0 && lines[i].trim() === ""; i--)
    blankTail += 1;

  const changes: { from: number; to: number; insert: string }[] = [];
  if (wantW > curW) {
    let pos = 0;
    for (const l of lines) {
      if (l.length < wantW) {
        changes.push({
          from: pos + l.length,
          to: pos + l.length,
          insert: " ".repeat(wantW - l.length),
        });
      }
      pos += l.length + 1;
    }
  }
  if (blankTail < MARGIN_ROWS) {
    const w = Math.max(curW, wantW);
    const add = MARGIN_ROWS - blankTail;
    changes.push({
      from: raw.length,
      to: raw.length,
      insert: ("\n" + " ".repeat(w)).repeat(add),
    });
  }
  if (!changes.length) return;

  internal = true;
  view.dispatch({
    changes,
    annotations: Transaction.addToHistory.of(false),
    scrollIntoView: false,
  });
  internal = false;
}

function scheduleRepad() {
  cancelAnimationFrame(repadHandle);
  repadHandle = requestAnimationFrame(repad);
}

function onUpdate(u: ViewUpdate) {
  if (u.docChanged && !internal) {
    pushToStore();
    scheduleRepad();
  }
  if (u.docChanged || u.selectionSet) reportCursor(u.state);
}

watch(text, (v) => {
  if (!view || trimRect(view.state.doc.toString()) === v) return;
  internal = true;
  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: padRect(v) },
  });
  internal = false;
});

onMounted(() => {
  if (!hostRef.value) return;
  view = new EditorView({
    parent: hostRef.value,
    state: EditorState.create({
      doc: padRect(text.value),
      extensions: [
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        drawSelection(),
        highlightActiveLine(),
        EditorView.updateListener.of(onUpdate),
        theme,
      ],
    }),
  });
  view.focus();
  reportCursor(view.state);
});

onBeforeUnmount(() => {
  cancelAnimationFrame(repadHandle);
  view?.destroy();
  view = undefined;
});
</script>

<template>
  <div class="relative w-full">
    <div ref="hostEl" class="w-full" />
    <span class="rc-readout">{{ rc.row }}:{{ rc.col }}</span>
  </div>
</template>

<style scoped>
.rc-readout {
  position: sticky;
  bottom: 8px;
  float: right;
  margin-right: 12px;
  padding: 2px 7px;
  border-radius: 999px;
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--muted);
  font-family: var(--font-manuscript);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  pointer-events: none;
}
</style>
