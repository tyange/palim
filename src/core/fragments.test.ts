import { describe, expect, it } from "vitest";
import {
  bringToFront,
  cloneFragments,
  duplicateSelected,
  type Fragment,
  nudge,
  removeById,
} from "./fragments";

function make(id: string, x = 0, y = 0): Fragment {
  return { id, x, y, text: id };
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

describe("nudge", () => {
  it("선택된 조각만 델타만큼 옮긴다", () => {
    const fragments = [make("a", 10, 10), make("b", 20, 20)];
    nudge(fragments, new Set(["a"]), 5, -3);
    expect(fragments[0]).toMatchObject({ x: 15, y: 7 });
    expect(fragments[1]).toMatchObject({ x: 20, y: 20 });
  });

  it("여러 조각을 한 번에 옮길 수 있다", () => {
    const fragments = [make("a", 10, 10), make("b", 20, 20)];
    nudge(fragments, new Set(["a", "b"]), 1, 1);
    expect(fragments[0]).toMatchObject({ x: 11, y: 11 });
    expect(fragments[1]).toMatchObject({ x: 21, y: 21 });
  });

  it("좌표가 음수가 되지 않도록 0에서 클램프한다", () => {
    const fragments = [make("a", 2, 2)];
    nudge(fragments, new Set(["a"]), -10, -10);
    expect(fragments[0]).toMatchObject({ x: 0, y: 0 });
  });

  it("없는 id는 조용히 무시한다", () => {
    const fragments = [make("a", 5, 5)];
    nudge(fragments, new Set(["z"]), 1, 1);
    expect(fragments[0]).toMatchObject({ x: 5, y: 5 });
  });
});

describe("duplicateSelected", () => {
  function idFactory(prefix: string) {
    let seq = 0;
    return () => `${prefix}${++seq}`;
  }

  it("선택된 조각만 오프셋을 더해 배열 끝에 복제한다(맨 위로 쌓임)", () => {
    const fragments = [make("a", 10, 10), make("b", 20, 20)];
    const newIds = duplicateSelected(fragments, new Set(["a"]), idFactory("n"));
    expect(newIds).toEqual(["n1"]);
    expect(fragments).toHaveLength(3);
    expect(fragments[2]).toMatchObject({ id: "n1", x: 26, y: 26, text: "a" });
  });

  it("여러 조각을 한 번에 복제하고 새 id들을 순서대로 반환한다", () => {
    const fragments = [make("a", 0, 0), make("b", 5, 5)];
    const newIds = duplicateSelected(
      fragments,
      new Set(["a", "b"]),
      idFactory("n"),
    );
    expect(newIds).toEqual(["n1", "n2"]);
    expect(fragments).toHaveLength(4);
  });

  it("오프셋을 지정할 수 있다", () => {
    const fragments = [make("a", 0, 0)];
    duplicateSelected(fragments, new Set(["a"]), idFactory("n"), 5, -5);
    expect(fragments[1]).toMatchObject({ x: 5, y: -5 });
  });

  it("원본은 그대로 남고 복제본만 새로 추가된다", () => {
    const fragments = [make("a", 0, 0)];
    duplicateSelected(fragments, new Set(["a"]), idFactory("n"));
    expect(fragments[0]).toMatchObject({ id: "a", x: 0, y: 0 });
  });

  it("없는 id는 무시하고 빈 배열을 반환한다", () => {
    const fragments = [make("a", 0, 0)];
    const newIds = duplicateSelected(fragments, new Set(["z"]), idFactory("n"));
    expect(newIds).toEqual([]);
    expect(fragments).toHaveLength(1);
  });
});
