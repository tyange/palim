import { beforeEach, describe, expect, it } from "vitest";
import {
  deriveTitle,
  hasDoc,
  isValidDocId,
  type KeyValueStore,
  LAST_KEY,
  loadDocRaw,
  readIndex,
  removeDoc,
  saveDoc,
  sortRecent,
  UNTITLED,
} from "./library";

function memoryStore(): KeyValueStore & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

describe("deriveTitle", () => {
  it("가장 위(그다음 왼쪽) 조각의 첫 줄을 제목으로 쓴다", () => {
    const title = deriveTitle(
      [
        { x: 50, y: 100, text: "아래" },
        { x: 80, y: 10, text: "오른쪽 위" },
        { x: 20, y: 10, text: "\n왼쪽 위\n둘째 줄" },
      ],
      "흐름",
    );
    expect(title).toBe("왼쪽 위");
  });

  it("조각이 없으면 흐름 본문의 첫 비어있지 않은 줄", () => {
    expect(deriveTitle([], "\n\n  시작  \n다음")).toBe("시작");
  });

  it("아무 내용이 없으면 제목 없음", () => {
    expect(deriveTitle([], "  ")).toBe(UNTITLED);
    expect(deriveTitle([{ x: 0, y: 0, text: " " }], "")).toBe(UNTITLED);
  });

  it("길면 잘라 말줄임표를 붙인다", () => {
    expect(deriveTitle([], "가".repeat(40))).toBe(`${"가".repeat(30)}…`);
  });
});

describe("library", () => {
  let kv: ReturnType<typeof memoryStore>;
  beforeEach(() => {
    kv = memoryStore();
  });

  it("저장하면 본문과 인덱스가 함께 생기고 다시 읽힌다", () => {
    saveDoc(kv, "a1", "RAW", "제목", 100);
    expect(loadDocRaw(kv, "a1")).toBe("RAW");
    expect(readIndex(kv)).toEqual([
      { id: "a1", title: "제목", updatedAt: 100 },
    ]);
    expect(hasDoc(kv, "a1")).toBe(true);
  });

  it("같은 id로 다시 저장하면 인덱스 항목이 하나로 갱신된다", () => {
    saveDoc(kv, "a1", "R1", "옛", 100);
    saveDoc(kv, "a1", "R2", "새", 200);
    expect(readIndex(kv)).toEqual([{ id: "a1", title: "새", updatedAt: 200 }]);
    expect(loadDocRaw(kv, "a1")).toBe("R2");
  });

  it("삭제하면 본문·인덱스·마지막 문서 표시가 정리된다", () => {
    saveDoc(kv, "a1", "R", "t", 1);
    saveDoc(kv, "b2", "R", "t", 2);
    kv.setItem(LAST_KEY, "a1");
    removeDoc(kv, "a1");
    expect(loadDocRaw(kv, "a1")).toBeNull();
    expect(readIndex(kv).map((m) => m.id)).toEqual(["b2"]);
    expect(kv.getItem(LAST_KEY)).toBeNull();
  });

  it("깨진 인덱스는 빈 목록으로 취급한다", () => {
    kv.setItem("palim-docs", "{oops");
    expect(readIndex(kv)).toEqual([]);
    kv.setItem(
      "palim-docs",
      JSON.stringify([{ id: "../x", title: "t", updatedAt: 1 }, 3]),
    );
    expect(readIndex(kv)).toEqual([]);
  });

  it("sortRecent는 최근 수정 순", () => {
    const sorted = sortRecent([
      { id: "a", title: "", updatedAt: 1 },
      { id: "b", title: "", updatedAt: 3 },
      { id: "c", title: "", updatedAt: 2 },
    ]);
    expect(sorted.map((m) => m.id)).toEqual(["b", "c", "a"]);
  });
});

describe("isValidDocId", () => {
  it("영숫자·_-만 허용", () => {
    expect(isValidDocId("ab12_-")).toBe(true);
    expect(isValidDocId("a/b")).toBe(false);
    expect(isValidDocId("")).toBe(false);
  });
});
