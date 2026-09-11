import { segmentGraphemes } from "./tokenizer";

export interface GridLayout {
  rows: number;
  cols: number;
  cellText: string[];
  cellToOffset: (number | undefined)[];
  cellSpan: (readonly [number, number] | undefined)[];
  offsetToCell: Map<number, number>;
  endCellIndex: number;
}

export function flowGraphemes(
  text: string,
  minCols: number,
  minRows: number,
): GridLayout {
  const graphemes = segmentGraphemes(text);

  let lineLen = 0;
  let maxLineLen = 0;
  let lineCount = 1;
  for (const g of graphemes) {
    if (g.isNewline) {
      if (lineLen > maxLineLen) maxLineLen = lineLen;
      lineLen = 0;
      lineCount += 1;
    } else {
      lineLen += 1;
    }
  }
  if (lineLen > maxLineLen) maxLineLen = lineLen;

  const cols = Math.max(minCols, maxLineLen);
  const rows = Math.max(minRows, lineCount + 1);
  const total = rows * cols;

  const cellText = Array.from({ length: total }, () => "");
  const cellToOffset: (number | undefined)[] = Array.from(
    { length: total },
    () => undefined,
  );
  const cellSpan: (readonly [number, number] | undefined)[] = Array.from(
    { length: total },
    () => undefined,
  );
  const offsetToCell = new Map<number, number>();

  let row = 0;
  let col = 0;
  for (const g of graphemes) {
    if (g.isNewline) {
      const nextRowStart = (row + 1) * cols;
      if (nextRowStart < total) offsetToCell.set(g.offset, nextRowStart);
      row += 1;
      col = 0;
      continue;
    }

    const idx = row * cols + col;
    cellText[idx] = g.char;
    cellToOffset[idx] = g.offset;
    cellSpan[idx] = [g.offset, g.offset + g.char.length] as const;
    offsetToCell.set(g.offset, idx);
    col += 1;
  }

  const endCellIndex = Math.min(row * cols + col, total - 1);

  return {
    rows,
    cols,
    cellText,
    cellToOffset,
    cellSpan,
    offsetToCell,
    endCellIndex,
  };
}
