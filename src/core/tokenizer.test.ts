import { describe, expect, it } from "vitest";
import { classifyChar, tokenize } from "./tokenizer";

describe("classifyChar", () => {
  it("한글 음절·한자·단독 자모를 hangul로 분류한다", () => {
    expect(classifyChar("가")).toBe("hangul");
    expect(classifyChar("훈")).toBe("hangul");
    expect(classifyChar("漢")).toBe("hangul");
    // IME 조합 중 단독 자모도 hangul (Unicode Script 판정)
    expect(classifyChar("ㄱ")).toBe("hangul");
    expect(classifyChar("ㅏ")).toBe("hangul");
  });

  it("반각 숫자·영문만 묶기 대상으로 분류한다", () => {
    expect(classifyChar("0")).toBe("digit");
    expect(classifyChar("9")).toBe("digit");
    expect(classifyChar("A")).toBe("upper");
    expect(classifyChar("Z")).toBe("upper");
    expect(classifyChar("a")).toBe("lower");
    expect(classifyChar("z")).toBe("lower");
  });

  it("전각 숫자·영문은 묶기 대상이 아니라 other다", () => {
    expect(classifyChar("０")).toBe("other");
    expect(classifyChar("Ａ")).toBe("other");
  });

  it("반각·전각 구두점을 함께 처리한다", () => {
    expect(classifyChar(".")).toBe("punctuation");
    expect(classifyChar(",")).toBe("punctuation");
    expect(classifyChar("．")).toBe("punctuation");
    expect(classifyChar("，")).toBe("punctuation");
    expect(classifyChar("。")).toBe("punctuation");
    expect(classifyChar("、")).toBe("punctuation");
    expect(classifyChar("·")).toBe("punctuation");
  });

  it("물음표·느낌표는 mark다", () => {
    expect(classifyChar("?")).toBe("mark");
    expect(classifyChar("!")).toBe("mark");
    expect(classifyChar("？")).toBe("mark");
    expect(classifyChar("！")).toBe("mark");
  });

  it("따옴표류는 quote다", () => {
    for (const q of ["'", '"', "‘", "’", "“", "”"]) {
      expect(classifyChar(q)).toBe("quote");
    }
  });

  it("줄임표·공백·줄바꿈을 각각 분류한다", () => {
    expect(classifyChar("…")).toBe("ellipsis");
    expect(classifyChar(" ")).toBe("space");
    expect(classifyChar("\t")).toBe("space");
    expect(classifyChar("\n")).toBe("newline");
    expect(classifyChar("\r")).toBe("newline");
    expect(classifyChar("\r\n")).toBe("newline");
  });

  it("그 외 문자는 other다", () => {
    expect(classifyChar("@")).toBe("other");
    expect(classifyChar("€")).toBe("other");
  });
});

describe("tokenize", () => {
  it("각 자소를 char·type·offset으로 토큰화한다", () => {
    expect(tokenize("a1")).toEqual([
      { char: "a", type: "lower", offset: 0 },
      { char: "1", type: "digit", offset: 1 },
    ]);
  });

  it("결합 문자를 한 자소로 묶고 offset은 UTF-16 인덱스다", () => {
    // "a" + 결합 악센트(U+0301) = 한 grapheme "á"
    const tokens = tokenize("áb");
    expect(tokens).toEqual([
      { char: "á", type: "lower", offset: 0 },
      { char: "b", type: "lower", offset: 2 },
    ]);
  });

  it("서로게이트 쌍(이모지) offset을 UTF-16 단위로 센다", () => {
    const tokens = tokenize("가😀나");
    expect(tokens.map((t) => t.offset)).toEqual([0, 1, 3]);
    expect(tokens[1]).toEqual({ char: "😀", type: "other", offset: 1 });
  });

  it("CRLF를 하나의 newline 토큰으로 묶는다", () => {
    expect(tokenize("\r\n")).toEqual([
      { char: "\r\n", type: "newline", offset: 0 },
    ]);
  });
});
