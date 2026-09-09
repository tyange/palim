import type { Extension } from "@codemirror/state";
import { EditorView, layer, RectangleMarker } from "@codemirror/view";

function firstHangulPos(view: EditorView): number {
  const doc = view.state.doc;
  for (let i = 1; i <= doc.lines; i++) {
    const line = doc.line(i);
    for (let j = 0; j < line.length; j++) {
      const code = line.text.charCodeAt(j);
      if (code >= 0xac00 && code <= 0xd7a3) return line.from + j;
    }
  }
  return -1;
}

function cellWidth(view: EditorView): number {
  const p = firstHangulPos(view);
  if (p >= 0) {
    const a = view.coordsAtPos(p);
    const b = view.coordsAtPos(p + 1);
    if (a && b && b.left > a.left) return b.left - a.left;
  }
  return view.defaultCharacterWidth * 2;
}

function markers(view: EditorView): readonly RectangleMarker[] {
  const doc = view.state.doc;
  if (!doc.length) return [];

  const first = view.coordsAtPos(0);
  if (!first) return [];
  const s = view.scrollDOM.getBoundingClientRect();
  const ox = first.left - s.left + view.scrollDOM.scrollLeft;
  const oy = first.top - s.top + view.scrollDOM.scrollTop;

  const cw = cellWidth(view);
  const ch = view.defaultLineHeight;

  let cols = 0;
  for (let i = 1; i <= doc.lines; i++)
    cols = Math.max(cols, doc.line(i).length);
  const rows = doc.lines;

  const out: RectangleMarker[] = [];
  const gridH = rows * ch;
  const gridW = cols * cw;
  for (let c = 0; c <= cols; c++) {
    out.push(new RectangleMarker("cm-grid-col", ox + c * cw, oy, 1, gridH));
  }
  for (let r = 0; r <= rows; r++) {
    out.push(new RectangleMarker("cm-grid-row", ox, oy + r * ch, gridW, 1));
  }
  return out;
}

export const gridLines: Extension = layer({
  above: false,
  class: "cm-grid-layer",
  update: (u) => u.geometryChanged || u.docChanged || u.viewportChanged,
  markers,
});
