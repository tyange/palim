import type { Token } from "./tokenizer";

export interface CellUnit {
  text: string;
  tokens: Token[];
  isBreak: boolean;
}

const CLOSING_QUOTES = new Set(["’", "”"]);

export function packCells(tokens: Token[]): CellUnit[] {
  const cells: CellUnit[] = [];
  let i = 0;

  while (i < tokens.length) {
    const tok = tokens[i];

    if (tok.type === "newline") {
      cells.push({ text: "", tokens: [tok], isBreak: true });
      i += 1;
      continue;
    }

    if (tok.type === "digit" || tok.type === "lower") {
      const kind = tok.type;
      let end = i;
      while (end < tokens.length && tokens[end].type === kind) end += 1;
      for (let k = i; k < end; k += 2) {
        const group = tokens.slice(k, Math.min(k + 2, end));
        cells.push({
          text: group.map((t) => t.char).join(""),
          tokens: group,
          isBreak: false,
        });
      }
      i = end;
      continue;
    }

    const next = tokens[i + 1];
    if (
      (tok.type === "punctuation" || tok.type === "mark") &&
      next?.type === "quote"
    ) {
      cells.push({
        text: tok.char + next.char,
        tokens: [tok, next],
        isBreak: false,
      });
      i += 2;
      continue;
    }

    cells.push({ text: tok.char, tokens: [tok], isBreak: false });
    i += 1;
  }

  return cells;
}

function isLineStartProhibited(unit: CellUnit): boolean {
  const first = unit.tokens[0];
  return (
    first.type === "punctuation" ||
    first.type === "mark" ||
    (first.type === "quote" && CLOSING_QUOTES.has(first.char))
  );
}

export interface NewlineMark {
  row: number;
  col: number;
  offset: number;
}

export interface MarginCell {
  row: number;
  text: string;
  offset: number;
}

export interface GridLayout {
  rows: number;
  cols: number;
  cellText: string[];
  cellToOffset: (number | undefined)[];
  cellSpan: (readonly [number, number] | undefined)[];
  offsetToCell: Map<number, number>;
  endCellIndex: number;
  margins: MarginCell[];
  newlines: NewlineMark[];
  softWraps: number[];
  overflow: number;
}

export function flowToGrid(
  units: CellUnit[],
  rows: number,
  cols: number,
): GridLayout {
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
  const margins: MarginCell[] = [];
  const newlines: NewlineMark[] = [];
  const softWraps: number[] = [];

  let row = 0;
  let col = 0;
  let overflow = 0;
  let justWrapped = false;

  for (const unit of units) {
    if (unit.isBreak) {
      if (row < rows) newlines.push({ row, col, offset: unit.tokens[0].offset });
      row += 1;
      col = 0;
      justWrapped = false;
      continue;
    }

    if (justWrapped && col === 0 && row > 0 && isLineStartProhibited(unit)) {
      margins.push({ row: row - 1, text: unit.text, offset: unit.tokens[0].offset });
      continue;
    }

    if (row >= rows) {
      overflow += 1;
      continue;
    }

    if (justWrapped && col === 0 && row > 0) softWraps.push(row - 1);

    const idx = row * cols + col;
    cellText[idx] = unit.text;
    const start = unit.tokens[0].offset;
    const last = unit.tokens[unit.tokens.length - 1];
    cellToOffset[idx] = start;
    cellSpan[idx] = [start, last.offset + last.char.length] as const;
    for (const t of unit.tokens) offsetToCell.set(t.offset, idx);

    col += 1;
    if (col >= cols) {
      col = 0;
      row += 1;
      justWrapped = true;
    } else {
      justWrapped = false;
    }
  }

  const endCellIndex = row < rows ? row * cols + col : total - 1;

  return {
    rows,
    cols,
    cellText,
    cellToOffset,
    cellSpan,
    offsetToCell,
    endCellIndex,
    margins,
    newlines,
    softWraps,
    overflow,
  };
}
