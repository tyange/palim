import { describe, expect, it } from "vitest";
import { flowGraphemes } from "./layout";

describe("flowGraphemes", () => {
  it("자소를 한 칸에 하나씩 순서대로 채운다(묶기 없음)", () => {
    const g = flowGraphemes("a1가", 4, 3);
    expect(g.cols).toBe(4);
    expect(g.rows).toBe(3);
    expect(g.cellText.slice(0, 4)).toEqual(["a", "1", "가", ""]);
    expect(g.cellToOffset.slice(0, 3)).toEqual([0, 1, 2]);
    expect(g.cellSpan[0]).toEqual([0, 1]);
    expect(g.offsetToCell.get(2)).toBe(2);
    expect(g.endCellIndex).toBe(3);
  });

  it("공백도 한 칸을 차지해 배치가 그대로 보존된다", () => {
    const g = flowGraphemes("가  나", 6, 3);
    expect(g.cellText.slice(0, 4)).toEqual(["가", " ", " ", "나"]);
    expect(g.cellToOffset[3]).toBe(3);
    expect(g.offsetToCell.get(1)).toBe(1);
  });

  it("줄바꿈은 칸을 비우고 다음 행으로 내린다", () => {
    const g = flowGraphemes("가\n나", 4, 3);
    expect(g.cellText[0]).toBe("가");
    expect(g.cellText[4]).toBe("나");
    expect(g.cellText[1]).toBe("");
  });

  it("줄바꿈 offset은 그 줄바꿈이 연 새 줄의 첫 칸으로 역산된다", () => {
    const g = flowGraphemes("가\n나", 4, 3);
    expect(g.offsetToCell.get(1)).toBe(4);
  });

  it("연속 줄바꿈은 각자 다음 줄의 첫 칸으로 역산된다", () => {
    const g = flowGraphemes("가\n\n", 4, 4);
    expect(g.offsetToCell.get(1)).toBe(4);
    expect(g.offsetToCell.get(2)).toBe(8);
  });

  it("cols는 가장 긴 줄에, rows는 줄 수에 맞춰 자동 확장된다", () => {
    const g = flowGraphemes("가나다라마바사\n가", 4, 3);
    expect(g.cols).toBe(7);
    expect(g.rows).toBe(3);
  });

  it("내용이 최소 크기보다 작으면 최소 크기를 유지한다", () => {
    const g = flowGraphemes("가", 20, 12);
    expect(g.cols).toBe(20);
    expect(g.rows).toBe(12);
  });

  it("빈 문자열은 최소 크기의 빈 격자다", () => {
    const g = flowGraphemes("", 20, 12);
    expect(g.cols).toBe(20);
    expect(g.rows).toBe(12);
    expect(g.endCellIndex).toBe(0);
    expect(g.cellText.every((c) => c === "")).toBe(true);
  });
});
