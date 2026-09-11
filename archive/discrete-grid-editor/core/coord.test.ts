import { describe, expect, it } from "vitest";
import {
  type CoordDoc,
  coordKey,
  docBounds,
  docFromString,
  docsEqual,
  MARGIN_COLS,
  MARGIN_ROWS,
  padRectFromDoc,
  textFromDoc,
} from "./coord";

function entries(doc: CoordDoc): [string, string][] {
  return [...doc].sort(([a], [b]) => (a < b ? -1 : 1));
}

describe("docFromString", () => {
  it("자소를 (행, 열)에 놓는다", () => {
    expect(entries(docFromString("가나"))).toEqual([
      [coordKey(0, 0), "가"],
      [coordKey(0, 1), "나"],
    ]);
  });

  it("공백은 저장하지 않고 열만 전진시킨다", () => {
    expect(entries(docFromString("가 나"))).toEqual([
      [coordKey(0, 0), "가"],
      [coordKey(0, 2), "나"],
    ]);
  });

  it("후행 공백·후행 빈 줄은 흔적을 남기지 않는다", () => {
    expect(docsEqual(docFromString("가  "), docFromString("가"))).toBe(true);
    expect(docsEqual(docFromString("가\n\n\n"), docFromString("가"))).toBe(
      true,
    );
  });

  it("중간 빈 줄은 행 인덱스로 보존된다", () => {
    expect(entries(docFromString("가\n\n나"))).toEqual([
      [coordKey(0, 0), "가"],
      [coordKey(2, 0), "나"],
    ]);
  });

  it("앞 공백·빈 행은 좌표 오프셋일 뿐 저장되지 않는다", () => {
    expect(entries(docFromString("          가"))).toEqual([
      [coordKey(0, 10), "가"],
    ]);
    expect(entries(docFromString("\n\n\n   나"))).toEqual([
      [coordKey(3, 3), "나"],
    ]);
  });
});

describe("textFromDoc", () => {
  it("왕복: docFromString(textFromDoc(doc)) === doc", () => {
    for (const s of [
      "가",
      "가 나  다\n라\n\n  마",
      "",
      "한 줄",
      "   가\n나   다",
    ]) {
      const doc = docFromString(s);
      expect(docsEqual(docFromString(textFromDoc(doc)), doc)).toBe(true);
    }
  });

  it("모호한 입력을 정규형으로 되돌린다", () => {
    expect(textFromDoc(docFromString("가  "))).toBe("가");
    expect(textFromDoc(docFromString("가\n\n\n"))).toBe("가");
  });

  it("내부 간격은 그대로 유지된다", () => {
    expect(textFromDoc(docFromString("가 나  다"))).toBe("가 나  다");
  });

  it("빈 문서는 빈 문자열", () => {
    expect(textFromDoc(new Map())).toBe("");
  });
});

describe("docBounds", () => {
  it("자소가 차지하는 행·열 개수를 센다", () => {
    expect(docBounds(docFromString("가나\n다"))).toEqual({ rows: 2, cols: 2 });
    expect(docBounds(new Map())).toEqual({ rows: 0, cols: 0 });
  });
});

describe("padRectFromDoc", () => {
  it("모든 줄이 같은 폭인 직사각형을 만든다", () => {
    const lines = padRectFromDoc(docFromString("가\n나다")).split("\n");
    const w = 2 + MARGIN_COLS;
    expect(lines.every((l) => l.length === w)).toBe(true);
  });

  it("내용 아래에 marginRows 개의 빈 줄을 둔다", () => {
    const lines = padRectFromDoc(docFromString("가나")).split("\n");
    expect(lines).toHaveLength(1 + MARGIN_ROWS);
  });

  it("빈 문서도 직사각형이 된다", () => {
    const lines = padRectFromDoc(new Map()).split("\n");
    expect(lines).toHaveLength(MARGIN_ROWS);
    expect(lines.every((l) => l.length === MARGIN_COLS)).toBe(true);
  });

  it("패딩은 파싱에 보이지 않는다: docFromString(padRectFromDoc(doc)) === doc", () => {
    for (const s of ["가", "가 나\n다  라\n\n마", "한 줄만"]) {
      const doc = docFromString(s);
      expect(docsEqual(docFromString(padRectFromDoc(doc)), doc)).toBe(true);
    }
  });
});

describe("docsEqual", () => {
  it("같은 내용이면 true, 다르면 false", () => {
    expect(docsEqual(docFromString("가나"), docFromString("가나"))).toBe(true);
    expect(docsEqual(docFromString("가나"), docFromString("가다"))).toBe(false);
    expect(docsEqual(docFromString("가"), docFromString("가 "))).toBe(true);
    expect(docsEqual(docFromString("가"), docFromString("가나"))).toBe(false);
  });
});
