import { describe, expect, it } from "vitest";
import {
  bringToFront,
  cloneFragments,
  type Fragment,
  removeById,
} from "./fragments";

function make(id: string): Fragment {
  return { id, x: 0, y: 0, text: id };
}

describe("bringToFront", () => {
  it("해당 조각을 배열 맨 뒤로 옮긴다(나중 렌더 = 위로 겹침)", () => {
    const fragments = [make("a"), make("b"), make("c")];
    bringToFront(fragments, "a");
    expect(fragments.map((f) => f.id)).toEqual(["b", "c", "a"]);
  });

  it("이미 맨 뒤에 있으면 순서가 그대로다", () => {
    const fragments = [make("a"), make("b")];
    bringToFront(fragments, "b");
    expect(fragments.map((f) => f.id)).toEqual(["a", "b"]);
  });

  it("없는 id는 조용히 무시한다", () => {
    const fragments = [make("a"), make("b")];
    bringToFront(fragments, "z");
    expect(fragments.map((f) => f.id)).toEqual(["a", "b"]);
  });
});

describe("removeById", () => {
  it("해당 조각을 제거한다", () => {
    const fragments = [make("a"), make("b"), make("c")];
    removeById(fragments, "b");
    expect(fragments.map((f) => f.id)).toEqual(["a", "c"]);
  });

  it("없는 id는 조용히 무시한다", () => {
    const fragments = [make("a")];
    removeById(fragments, "z");
    expect(fragments).toHaveLength(1);
  });
});

describe("cloneFragments", () => {
  it("값은 같지만 배열·원소 모두 새 참조인 복사본을 만든다", () => {
    const original = [make("a"), make("b")];
    const clone = cloneFragments(original);
    expect(clone).toEqual(original);
    expect(clone).not.toBe(original);
    expect(clone[0]).not.toBe(original[0]);
  });

  it("복사본을 바꿔도 원본은 그대로다", () => {
    const original = [make("a")];
    const clone = cloneFragments(original);
    clone[0].text = "바뀜";
    expect(original[0].text).toBe("a");
  });
});
