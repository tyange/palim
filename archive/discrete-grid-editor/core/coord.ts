export const MARGIN_COLS = 8;
export const MARGIN_ROWS = 12;

export type CoordDoc = Map<string, string>;

const segmenter = new Intl.Segmenter("ko", { granularity: "grapheme" });

export function coordKey(row: number, col: number): string {
  return `${row},${col}`;
}

export function parseCoordKey(k: string): [number, number] {
  const i = k.indexOf(",");
  return [Number(k.slice(0, i)), Number(k.slice(i + 1))];
}

function isBlank(grapheme: string): boolean {
  return grapheme === " " || grapheme === "\t";
}

export function docFromString(s: string): CoordDoc {
  const doc: CoordDoc = new Map();
  const lines = s.split(/\r\n|\r|\n/);
  for (let row = 0; row < lines.length; row++) {
    let col = 0;
    for (const { segment } of segmenter.segment(lines[row])) {
      if (!isBlank(segment)) doc.set(coordKey(row, col), segment);
      col += 1;
    }
  }
  return doc;
}

export function docBounds(doc: CoordDoc): { rows: number; cols: number } {
  let maxRow = -1;
  let maxCol = -1;
  for (const k of doc.keys()) {
    const [row, col] = parseCoordKey(k);
    if (row > maxRow) maxRow = row;
    if (col > maxCol) maxCol = col;
  }
  return { rows: maxRow + 1, cols: maxCol + 1 };
}

export function textFromDoc(doc: CoordDoc): string {
  if (doc.size === 0) return "";
  const byRow = new Map<number, Map<number, string>>();
  let maxRow = 0;
  for (const [k, g] of doc) {
    const [row, col] = parseCoordKey(k);
    let rowMap = byRow.get(row);
    if (!rowMap) {
      rowMap = new Map();
      byRow.set(row, rowMap);
    }
    rowMap.set(col, g);
    if (row > maxRow) maxRow = row;
  }

  const lines: string[] = [];
  for (let row = 0; row <= maxRow; row++) {
    const rowMap = byRow.get(row);
    if (!rowMap) {
      lines.push("");
      continue;
    }
    let maxCol = 0;
    for (const col of rowMap.keys()) if (col > maxCol) maxCol = col;
    let line = "";
    for (let col = 0; col <= maxCol; col++) line += rowMap.get(col) ?? " ";
    lines.push(line);
  }
  return lines.join("\n");
}

export function padRectFromDoc(
  doc: CoordDoc,
  marginCols = MARGIN_COLS,
  marginRows = MARGIN_ROWS,
): string {
  const { rows: contentRows, cols: contentCols } = docBounds(doc);
  const w = contentCols + marginCols;
  const h = contentRows + marginRows;

  const grid: string[][] = Array.from({ length: h }, () =>
    Array.from({ length: w }, () => " "),
  );
  for (const [k, g] of doc) {
    const [row, col] = parseCoordKey(k);
    grid[row][col] = g;
  }
  return grid.map((row) => row.join("")).join("\n");
}

export function docsEqual(a: CoordDoc, b: CoordDoc): boolean {
  if (a.size !== b.size) return false;
  for (const [k, v] of a) if (b.get(k) !== v) return false;
  return true;
}
