import { describe, expect, it } from "vitest";
import { MARGIN_COLS, MARGIN_ROWS, padRect, trimRect } from "./rect";

describe("trimRect", () => {
  it("줄 끝 공백·탭을 제거한다", () => {
    expect(trimRect("가 \t\n나  ")).toBe("가\n나");
  });

  it("끝의 빈 줄을 제거하되 마지막 한 줄은 남긴다", () => {
    expect(trimRect("가\n\n\n")).toBe("가");
    expect(trimRect("   \n   ")).toBe("");
  });

  it("중간 빈 줄과 앞쪽 공백은 그대로 둔다", () => {
    expect(trimRect("가\n\n  나")).toBe("가\n\n  나");
  });
});

describe("padRect", () => {
  it("모든 줄을 (최장 줄 + marginCols) 폭으로 채운다", () => {
    const out = padRect("가\n나다").split("\n");
    const w = 2 + MARGIN_COLS;
    expect(out[0]).toHaveLength(w);
    expect(out[1]).toHaveLength(w);
    expect(out[0]).toBe("가" + " ".repeat(w - 1));
  });

  it("marginRows 개의 전폭 공백 줄을 아래에 붙인다", () => {
    const src = "가나";
    const out = padRect(src).split("\n");
    const w = 2 + MARGIN_COLS;
    expect(out).toHaveLength(1 + MARGIN_ROWS);
    for (let i = 1; i <= MARGIN_ROWS; i++) {
      expect(out[i]).toBe(" ".repeat(w));
    }
  });

  it("빈 문자열도 직사각형이 된다", () => {
    const out = padRect("").split("\n");
    expect(out).toHaveLength(1 + MARGIN_ROWS);
    expect(out.every((l) => l === " ".repeat(MARGIN_COLS))).toBe(true);
  });

  it("왕복: trimRect(padRect(x)) === trimRect(x)", () => {
    for (const x of ["가", "가\n나 다\n\n  마", "", "한 줄"]) {
      expect(trimRect(padRect(x))).toBe(trimRect(x));
    }
  });

  it("이미 패딩된 것을 다시 패딩해도 폭이 커지지 않는다(멱등에 준함)", () => {
    const once = padRect("가나다");
    const twice = padRect(once);
    expect(twice).toBe(once);
  });
});
