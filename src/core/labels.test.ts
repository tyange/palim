import { describe, expect, it } from "vitest";
import { labelsEqual, normalizeLabel, normalizeLabels } from "./labels";

describe("normalizeLabel", () => {
  it("앞의 #과 양끝 공백을 제거한다", () => {
    expect(normalizeLabel("  #사랑 ")).toBe("사랑");
    expect(normalizeLabel("##무지")).toBe("무지");
  });

  it("내부 공백·쉼표는 밑줄 하나로 바꾼다", () => {
    expect(normalizeLabel("to be or not")).toBe("to_be_or_not");
    expect(normalizeLabel("a,  b")).toBe("a_b");
  });

  it("남는 게 없으면 빈 문자열", () => {
    expect(normalizeLabel("  # ")).toBe("");
    expect(normalizeLabel("")).toBe("");
  });
});

describe("normalizeLabels", () => {
  it("정규화 후 빈 것·중복을 버리고 첫 등장 순서를 유지한다", () => {
    expect(normalizeLabels(["#사랑", "무지", "사랑", " ", "#무지"])).toEqual([
      "사랑",
      "무지",
    ]);
  });
});

describe("labelsEqual", () => {
  it("순서까지 같아야 같다", () => {
    expect(labelsEqual(["a", "b"], ["a", "b"])).toBe(true);
    expect(labelsEqual(["a", "b"], ["b", "a"])).toBe(false);
    expect(labelsEqual(["a"], ["a", "b"])).toBe(false);
  });
});
