<script setup lang="ts">
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { EditorState } from "@codemirror/state";
import {
  drawSelection,
  EditorView,
  keymap,
  type ViewUpdate,
} from "@codemirror/view";
import { storeToRefs } from "pinia";
import { onBeforeUnmount, onMounted, useTemplateRef, watch } from "vue";
import { GRID, useManuscriptStore } from "../stores/manuscript";

const emit = defineEmits<{ caretmove: [line: number] }>();

const { text } = storeToRefs(useManuscriptStore());

const hostRef = useTemplateRef<HTMLDivElement>("hostEl");
let view: EditorView | undefined;
let applyingExternal = false;

const theme = EditorView.theme({
  "&": { height: "auto", background: "transparent" },
  ".cm-scroller": { overflow: "visible" },
  ".cm-content": {
    fontFamily: '"Nanum Gothic Coding", "D2Coding", ui-monospace, monospace',
    fontSize: `${GRID.fontSize}px`,
    lineHeight: `${GRID.lineHeight}px`,
    wordSpacing: "0.5em",
    padding: `${GRID.padY}px ${GRID.padX}px`,
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
});

function onUpdate(u: ViewUpdate) {
  if (u.docChanged && !applyingExternal) {
    text.value = u.state.doc.toString();
  }
  if (u.docChanged || u.selectionSet) {
    const head = u.state.selection.main.head;
    emit("caretmove", u.state.doc.lineAt(head).number - 1);
  }
}

watch(text, (v) => {
  if (!view || v === view.state.doc.toString()) return;
  applyingExternal = true;
  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: v },
  });
  applyingExternal = false;
});

onMounted(() => {
  if (!hostRef.value) return;
  view = new EditorView({
    parent: hostRef.value,
    state: EditorState.create({
      doc: text.value,
      extensions: [
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        drawSelection(),
        EditorView.updateListener.of(onUpdate),
        theme,
      ],
    }),
  });
  view.focus();
  emit("caretmove", 0);
});

onBeforeUnmount(() => {
  view?.destroy();
  view = undefined;
});
</script>

<template>
  <div ref="hostEl" class="w-full" />
</template>
