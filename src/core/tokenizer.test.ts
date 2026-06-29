import { describe, expect, it } from "vitest";
import { segmentGraphemes } from "./tokenizer";

describe("segmentGraphemes", () => {
  it("각 자소를 char·offset으로 분할한다", () => {
    expect(segmentGraphemes("a1")).toEqual([
      { char: "a", offset: 0, isNewline: false },
      { char: "1", offset: 1, isNewline: false },
    ]);
  });

  it("서로게이트 쌍(이모지)도 한 자소로 묶고 offset을 UTF-16 단위로 센다", () => {
    const graphemes = segmentGraphemes("가😀나");
    expect(graphemes.map((g) => g.offset)).toEqual([0, 1, 3]);
    expect(graphemes[1]).toEqual({ char: "😀", offset: 1, isNewline: false });
  });

  it("줄바꿈을 isNewline으로 표시하고 CRLF를 한 자소로 묶는다", () => {
    expect(segmentGraphemes("가\n")).toEqual([
      { char: "가", offset: 0, isNewline: false },
      { char: "\n", offset: 1, isNewline: true },
    ]);
    expect(segmentGraphemes("\r\n")).toEqual([
      { char: "\r\n", offset: 0, isNewline: true },
    ]);
  });
});
