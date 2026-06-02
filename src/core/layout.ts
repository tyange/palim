// 원고지 레이아웃 엔진 ②③ — 칸 배치기 + 줄 경계 보정
//
// 토큰 분류기(①)가 만든 토큰 배열을 받아,
//   (a) packCells : 점유 규칙대로 "한 칸에 들어갈 단위"로 묶고
//                   (숫자·소문자 2개 묶기 + 문장부호+닫는따옴표 한 칸 합치기 ③)
//   (b) flowToGrid: 줄바꿈·자동 줄넘김을 적용해 격자(cellText)에 흘려넣되,
//                   행두 금칙(줄 첫 칸 구두점 금지)을 여백 칸으로 보정한다 ③
//
// 참고: docs/manuscript-paper-editing.md §1(칸 점유) §3(금칙)

import type { Token } from "./tokenizer";

/** 한 칸을 차지하는 단위. 줄바꿈은 칸을 차지하지 않는 break 단위로 표현. */
export interface CellUnit {
  /** 칸에 표시할 텍스트 (숫자·소문자 최대 2글자, 문장부호+따옴표 합치기, break면 "") */
  text: string;
  /** 이 단위를 구성한 토큰들 (1~2개) */
  tokens: Token[];
  /** 줄바꿈(문단 바꿈) 단위인지 */
  isBreak: boolean;
}

// 곡선 닫는 따옴표 (’ U+2019, ” U+201D). 여는 따옴표/직선 따옴표는 행두 금칙 대상에서 제외
// — 대화문은 줄 첫 칸에서 시작할 수 있으므로.
const CLOSING_QUOTES = new Set(["’", "”"]);

/**
 * (a) 토큰을 점유 규칙대로 칸 단위로 묶는다 — 격자 크기와 무관한 순수 로직.
 *
 * - 숫자(digit)·소문자(lower): 연속한 같은 종류를 **2개씩** 한 칸에 묶음
 *   ("12345" → "12","34","5" / "abc" → "ab","c")
 * - 문장부호(. , ? !) + 바로 뒤 따옴표: **한 칸에 합침** ("했다." + "”" → 다 / ."③)
 * - 그 외(한글·대문자·구두점·따옴표·줄임표·공백·기타): 한 칸에 한 자소
 * - 줄바꿈(newline): 칸을 차지하지 않는 break 단위
 */
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

    // 숫자·소문자: 연속 런을 2개씩 묶는다
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

    // ③ 문장부호(마침표·쉼표·물음표·느낌표) + 바로 뒤 따옴표 → 한 칸에 합침
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

    // 그 외: 한 칸에 한 자소
    cells.push({ text: tok.char, tokens: [tok], isBreak: false });
    i += 1;
  }

  return cells;
}

/**
 * ③ 행두 금칙 대상인가 — 줄 맨 앞 칸에 와서는 안 되는 단위.
 * 마침표·쉼표·물음표·느낌표(또는 그것으로 시작하는 합친 단위), 곡선 닫는 따옴표.
 */
function isLineStartProhibited(unit: CellUnit): boolean {
  const first = unit.tokens[0];
  return (
    first.type === "punctuation" ||
    first.type === "mark" ||
    (first.type === "quote" && CLOSING_QUOTES.has(first.char))
  );
}

/** 격자 오른쪽 바깥 여백에 적히는 칸 (행두 금칙으로 앞 줄에 딸려 나간 구두점). */
export interface MarginCell {
  /** 어느 행의 오른쪽 여백인지 */
  row: number;
  text: string;
  /** 첫 토큰의 UTF-16 offset */
  offset: number;
}

export interface GridLayout {
  rows: number;
  cols: number;
  /** 각 칸의 텍스트 (rows*cols 길이, 빈 칸은 ""). 현재 컴포넌트의 cellChars와 호환 */
  cellText: string[];
  /** 칸 인덱스 → 그 칸 첫 토큰의 offset (칸 클릭 → 캐럿 위치 역산용) */
  cellToOffset: (number | undefined)[];
  /** ③ 행두 금칙으로 줄 오른쪽 여백에 배치된 칸들 */
  margins: MarginCell[];
  /** 격자(여백 포함)를 넘어 배치하지 못한 칸 수 */
  overflow: number;
}

/**
 * (b) 칸 단위들을 격자에 흘려넣는다.
 * - break 단위: 다음 행 첫 칸으로 이동(칸 미점유)
 * - 한 행이 cols를 넘으면 자동으로 다음 행으로 줄넘김
 * - ③ 자동 줄넘김 직후 줄 첫 칸에 올 구두점(행두 금칙 대상)은
 *   앞 줄 오른쪽 여백(margins)으로 보낸다. 단, 사용자가 친 줄바꿈(break)
 *   직후에는 보정하지 않는다(의도된 문단 바꿈이므로).
 * - rows를 넘는 칸은 overflow로만 집계(미표시)
 */
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
  const margins: MarginCell[] = [];

  let row = 0;
  let col = 0;
  let overflow = 0;
  // 직전 칸이 자동 줄넘김으로 끝났는가 (break/문단 시작은 false)
  let justWrapped = false;

  for (const unit of units) {
    if (unit.isBreak) {
      row += 1;
      col = 0;
      justWrapped = false;
      continue;
    }

    // ③ 자동 줄넘김으로 줄 첫 칸에 올 구두점 → 앞 줄 여백으로
    if (justWrapped && col === 0 && row > 0 && isLineStartProhibited(unit)) {
      margins.push({ row: row - 1, text: unit.text, offset: unit.tokens[0].offset });
      continue; // justWrapped 유지 → 연속 구두점도 같은 줄 여백으로
    }

    if (row >= rows) {
      overflow += 1;
      continue;
    }

    const idx = row * cols + col;
    cellText[idx] = unit.text;
    cellToOffset[idx] = unit.tokens[0].offset;
    col += 1;
    if (col >= cols) {
      col = 0;
      row += 1;
      justWrapped = true;
    } else {
      justWrapped = false;
    }
  }

  return { rows, cols, cellText, cellToOffset, margins, overflow };
}
