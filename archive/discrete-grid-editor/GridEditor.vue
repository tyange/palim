<script setup lang="ts">
import {
  cursorCharRight,
  cursorLineDown,
  defaultKeymap,
  history,
  historyKeymap,
} from "@codemirror/commands";
import {
  EditorSelection,
  EditorState,
  Prec,
  type Range,
  StateField,
  Transaction,
} from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  drawSelection,
  EditorView,
  keymap,
  type ViewUpdate,
} from "@codemirror/view";
import { storeToRefs } from "pinia";
import { onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from "vue";
import {
  docFromString,
  docsEqual,
  MARGIN_COLS,
  MARGIN_ROWS,
  padRectFromDoc,
} from "../core/coord";
import { GRID, useManuscriptStore } from "../stores/manuscript";

const emit = defineEmits<{ caretmove: [line: number] }>();

const store = useManuscriptStore();
const { doc } = storeToRefs(store);

function cmDoc(): string {
  return view ? view.state.doc.toString() : "";
}

const hostRef = useTemplateRef<HTMLDivElement>("hostEl");
const rc = ref({ row: 1, col: 0 });

let view: EditorView | undefined;
let internal = false;
let repadHandle = 0;

const FONT_FAMILY =
  'ui-monospace, "SF Mono", Menlo, Consolas, "D2Coding", "Nanum Gothic Coding", "Apple SD Gothic Neo", "Malgun Gothic", monospace';

const theme = EditorView.theme({
  "&": { height: "100%", background: "transparent" },
  ".cm-scroller": { overflow: "auto", scrollbarWidth: "none" },
  ".cm-scroller::-webkit-scrollbar": { display: "none" },
  ".cm-content": {
    fontFamily: FONT_FAMILY,
    fontSize: `${GRID.fontSize}px`,
    lineHeight: `${GRID.lineHeight}px`,
    wordSpacing: "0.5em",
    padding: `${GRID.padY}px ${GRID.padX}px`,
    width: "max-content",
    minWidth: "0",
    flexGrow: "0",
    flexShrink: "0",
    caretColor: "transparent",
    color: "var(--foreground)",
  },
  ".cm-line": { padding: "0" },
  ".cm-halfwidth": { letterSpacing: "var(--halfwidth-gap, 0px)" },
  "&.cm-focused": { outline: "none" },
  ".cm-cursor, .cm-dropCursor": {
    borderLeft: "2px solid var(--accent)",
    marginLeft: "-1px",
    boxShadow: "0 0 6px color-mix(in srgb, var(--accent) 70%, transparent)",
  },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection":
    {
      background: "color-mix(in srgb, var(--accent) 22%, transparent)",
    },
});

const HALFWIDTH_RE = /[\x21-\x7E]+/g;
const halfwidthMark = Decoration.mark({ class: "cm-halfwidth" });

function buildHalfwidthDecorations(state: EditorState): DecorationSet {
  const text = state.doc.toString();
  const ranges: Range<Decoration>[] = [];
  HALFWIDTH_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = HALFWIDTH_RE.exec(text))) {
    ranges.push(halfwidthMark.range(m.index, m.index + m[0].length));
  }
  return Decoration.set(ranges);
}

const halfwidthField = StateField.define<DecorationSet>({
  create: (state) => buildHalfwidthDecorations(state),
  update: (value, tr) =>
    tr.docChanged ? buildHalfwidthDecorations(tr.state) : value,
  provide: (f) => EditorView.decorations.from(f),
});

function measureHalfwidthGap(): number {
  const probe = document.createElement("span");
  probe.style.cssText = `position:fixed; visibility:hidden; white-space:pre; font-family:${FONT_FAMILY}; font-size:${GRID.fontSize}px;`;
  document.body.appendChild(probe);
  probe.textContent = "가";
  const fullWidth = probe.getBoundingClientRect().width;
  probe.textContent = "A";
  const halfWidth = probe.getBoundingClientRect().width;
  probe.remove();
  return Math.max(0, fullWidth - halfWidth);
}

function applyHalfwidthGap() {
  hostRef.value?.style.setProperty(
    "--halfwidth-gap",
    `${measureHalfwidthGap()}px`,
  );
}

function reportCursor(state: EditorState) {
  const head = state.selection.main.head;
  const line = state.doc.lineAt(head);
  rc.value = { row: line.number, col: head - line.from };
  emit("caretmove", line.number - 1);
}

function pushToStore() {
  if (!view) return;
  store.doc = docFromString(cmDoc());
}

function repad() {
  if (!view || internal) return;
  const state = view.state;
  const raw = state.doc.toString();
  const lines = raw.split("\n");
  const contentW = lines.reduce(
    (m, l) => Math.max(m, l.replace(/[ \t]+$/, "").length),
    0,
  );
  const curW = lines.reduce((m, l) => Math.max(m, l.length), 0);

  const head = state.selection.main.head;
  const caretLine = state.doc.lineAt(head);
  const caretCol = head - caretLine.from;
  const caretRow = caretLine.number;
  const wantW = Math.max(contentW + MARGIN_COLS, caretCol + MARGIN_COLS);

  let blankTail = 0;
  for (let i = lines.length - 1; i >= 0 && lines[i].trim() === ""; i--)
    blankTail += 1;
  const contentRows = lines.length - blankTail;
  const wantRows = Math.max(contentRows + MARGIN_ROWS, caretRow + MARGIN_ROWS);

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
  if (lines.length < wantRows) {
    const w = Math.max(curW, wantW);
    const add = wantRows - lines.length;
    changes.push({
      from: raw.length,
      to: raw.length,
      insert: ("\n" + " ".repeat(w)).repeat(add),
    });
  }
  if (!changes.length) return;

  const changeSet = state.changes(changes);
  const selection = state.selection.map(changeSet, -1);

  internal = true;
  view.dispatch({
    changes,
    selection,
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

function growing(cmd: (v: EditorView) => boolean) {
  return (v: EditorView): boolean => {
    const moved = cmd(v);
    if (moved) repad();
    return moved;
  };
}

function charLeftNoWrap(v: EditorView): boolean {
  const { head } = v.state.selection.main;
  const line = v.state.doc.lineAt(head);
  if (head > line.from) {
    v.dispatch({
      selection: EditorSelection.cursor(head - 1),
      scrollIntoView: true,
    });
  }
  return true;
}

const gridNavKeymap = Prec.highest(
  keymap.of([
    { key: "ArrowRight", run: growing(cursorCharRight) },
    { key: "ArrowDown", run: growing(cursorLineDown) },
    { key: "ArrowLeft", run: charLeftNoWrap },
  ]),
);

watch(doc, (d) => {
  if (!view || docsEqual(docFromString(cmDoc()), d)) return;
  internal = true;
  view.dispatch({
    changes: {
      from: 0,
      to: view.state.doc.length,
      insert: padRectFromDoc(d),
    },
  });
  internal = false;
});

onMounted(() => {
  if (!hostRef.value) return;
  view = new EditorView({
    parent: hostRef.value,
    state: EditorState.create({
      doc: padRectFromDoc(doc.value),
      extensions: [
        history(),
        gridNavKeymap,
        keymap.of([...defaultKeymap, ...historyKeymap]),
        drawSelection(),
        halfwidthField,
        EditorView.updateListener.of(onUpdate),
        theme,
      ],
    }),
  });
  view.focus();
  reportCursor(view.state);
  applyHalfwidthGap();

  document.fonts.ready.then(() => {
    view?.requestMeasure();
    applyHalfwidthGap();
  });
});

onBeforeUnmount(() => {
  cancelAnimationFrame(repadHandle);
  view?.destroy();
  view = undefined;
});
</script>

<template>
  <div class="editor-frame">
    <div ref="hostEl" class="editor-host" />
    <span class="rc-readout">{{ rc.row }}:{{ rc.col }}</span>
  </div>
</template>

<style scoped>
.editor-frame {
  position: relative;
  width: min(90vw, 640px);
  height: min(70vh, 560px);
  padding: 12px;
  overflow: hidden;
  --mark: color-mix(in srgb, var(--foreground) 28%, transparent);
  --mark-len: 14px;
  background-color: color-mix(in srgb, var(--foreground) 2.5%, transparent);
  background-image:
    linear-gradient(var(--mark), var(--mark)),
    linear-gradient(var(--mark), var(--mark)),
    linear-gradient(var(--mark), var(--mark)),
    linear-gradient(var(--mark), var(--mark)),
    linear-gradient(var(--mark), var(--mark)),
    linear-gradient(var(--mark), var(--mark)),
    linear-gradient(var(--mark), var(--mark)),
    linear-gradient(var(--mark), var(--mark));
  background-repeat: no-repeat;
  background-position:
    0 0,
    0 0,
    100% 0,
    100% 0,
    0 100%,
    0 100%,
    100% 100%,
    100% 100%;
  background-size:
    var(--mark-len) 1px,
    1px var(--mark-len),
    var(--mark-len) 1px,
    1px var(--mark-len),
    var(--mark-len) 1px,
    1px var(--mark-len),
    var(--mark-len) 1px,
    1px var(--mark-len);
}

.editor-host {
  width: 100%;
  height: 100%;
}

.rc-readout {
  position: fixed;
  right: 16px;
  bottom: 58px;
  z-index: 30;
  padding: 2px 8px;
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
