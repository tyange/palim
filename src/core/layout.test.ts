import { describe, expect, it } from "vitest";
import { flowToGrid, packCells } from "./layout";
import { tokenize } from "./tokenizer";

const pack = (s: string) => packCells(tokenize(s)).map((c) => c.text);
const lay = (s: string, rows: number, cols: number) =>
  flowToGrid(packCells(tokenize(s)), rows, cols);

describe("packCells", () => {
  it("숫자·소문자를 2개씩 한 칸에 묶는다", () => {
    expect(pack("12345")).toEqual(["12", "34", "5"]);
    expect(pack("abc")).toEqual(["ab", "c"]);
  });

  it("대문자는 묶지 않는다", () => {
    expect(pack("AB")).toEqual(["A", "B"]);
  });

  it("종류가 다르면 같은 칸으로 묶지 않는다", () => {
    expect(pack("1a")).toEqual(["1", "a"]);
  });

  it("문장부호·물음표 + 바로 뒤 따옴표를 한 칸에 합친다", () => {
    expect(pack("다.”")).toEqual(["다", ".”"]);
    expect(pack('?"')).toEqual(['?"']);
  });

  it("따옴표 단독이나 앞에 부호가 없으면 합치지 않는다", () => {
    expect(pack('"안')).toEqual(['"', "안"]);
  });

  it("줄임표는 한 칸 단위로 둔다", () => {
    expect(pack("…")).toEqual(["…"]);
  });

  it("줄바꿈은 칸을 차지하지 않는 break 단위다", () => {
    const cells = packCells(tokenize("가\n나"));
    expect(cells.map((c) => c.text)).toEqual(["가", "", "나"]);
    expect(cells[1].isBreak).toBe(true);
    expect(cells[0].isBreak).toBe(false);
  });
});

describe("flowToGrid", () => {
  it("칸을 순서대로 채우고 역산 정보를 만든다", () => {
    const g = lay("가나다", 3, 4);
    expect(g.cellText.slice(0, 4)).toEqual(["가", "나", "다", ""]);
    expect(g.cellToOffset.slice(0, 3)).toEqual([0, 1, 2]);
    expect(g.cellSpan[0]).toEqual([0, 1]);
    expect(g.offsetToCell.get(1)).toBe(1);
    expect(g.endCellIndex).toBe(3);
    expect(g.overflow).toBe(0);
    expect(g.margins).toEqual([]);
    expect(g.newlines).toEqual([]);
    expect(g.softWraps).toEqual([]);
  });

  it("숫자쌍은 한 칸을 차지하고 span이 두 offset을 덮는다", () => {
    const g = lay("12", 3, 4);
    expect(g.cellText[0]).toBe("12");
    expect(g.cellSpan[0]).toEqual([0, 2]);
    expect(g.offsetToCell.get(0)).toBe(0);
    expect(g.offsetToCell.get(1)).toBe(0);
    expect(g.endCellIndex).toBe(1);
  });

  it("합친 칸의 span은 마지막 토큰 끝까지 덮는다", () => {
    const g = lay("다.”", 3, 4);
    expect(g.cellText[1]).toBe(".”");
    expect(g.cellSpan[1]).toEqual([1, 3]);
    expect(g.offsetToCell.get(2)).toBe(1);
  });

  it("행이 가득 차면 다음 행으로 넘기고 soft-wrap을 기록한다", () => {
    const g = lay("가나다", 3, 2);
    expect(g.cellText.slice(0, 3)).toEqual(["가", "나", "다"]);
    expect(g.softWraps).toEqual([0]);
    expect(g.endCellIndex).toBe(3);
  });

  it("사용자 줄바꿈은 칸을 비우고 newline 표식을 남긴다", () => {
    const g = lay("가\n나", 3, 4);
    expect(g.newlines).toEqual([{ row: 0, col: 1, offset: 1 }]);
    expect(g.cellText[0]).toBe("가");
    expect(g.cellText[4]).toBe("나");
    expect(g.softWraps).toEqual([]);
  });

  it("자동 줄넘김 직후 행두 금칙 부호를 앞 줄 여백으로 보낸다", () => {
    const g = lay("가나.", 3, 2);
    expect(g.margins).toEqual([{ row: 0, text: ".", offset: 2 }]);
    expect(g.cellText[2]).toBe("");
  });

  it("사용자 줄바꿈 직후에는 금칙 보정을 하지 않는다", () => {
    const g = lay("가\n.", 3, 2);
    expect(g.margins).toEqual([]);
    expect(g.cellText[2]).toBe(".");
  });

  it("격자를 넘는 칸은 overflow로 집계하고 endCellIndex를 클램프한다", () => {
    const g = lay("가나다", 1, 2);
    expect(g.cellText).toEqual(["가", "나"]);
    expect(g.overflow).toBe(1);
    expect(g.endCellIndex).toBe(1);
  });
});
