import { describe, expect, it } from "vitest";
import { type AlignRect, alignEdge, computeSnap, distribute } from "./align";

function rect(id: string, x: number, y: number, w = 40, h = 20): AlignRect {
  return { id, x, y, w, h };
}

describe("alignEdge", () => {
  const rects = [rect("a", 0, 0), rect("b", 100, 50), rect("c", 40, 200)];

  it("left: 가장 왼쪽 x로 맞춘다", () => {
    const result = alignEdge(rects, "left");
    expect(result.get("a")).toEqual({ x: 0, y: 0 });
    expect(result.get("b")).toEqual({ x: 0, y: 50 });
    expect(result.get("c")).toEqual({ x: 0, y: 200 });
  });

  it("right: 가장 오른쪽 x+w로 맞춘다", () => {
    const result = alignEdge(rects, "right");
    expect(result.get("a")).toEqual({ x: 100, y: 0 });
    expect(result.get("b")).toEqual({ x: 100, y: 50 });
  });

  it("centerX: 가로 중앙으로 맞춘다", () => {
    const result = alignEdge(rects, "centerX");
    const c = result.get("a");
    expect(c?.x).toBeCloseTo(50);
  });

  it("top/bottom/centerY도 같은 방식으로 세로축에 적용된다", () => {
    const top = alignEdge(rects, "top");
    expect(top.get("c")).toEqual({ x: 40, y: 0 });
    const bottom = alignEdge(rects, "bottom");
    expect(bottom.get("a")?.y).toBe(200);
  });

  it("조각이 2개 미만이면 빈 결과", () => {
    expect(alignEdge([rect("a", 0, 0)], "left").size).toBe(0);
    expect(alignEdge([], "left").size).toBe(0);
  });
});

describe("distribute", () => {
  it("가로축: 첫/끝은 그대로, 가운데는 간격이 균등해지도록 옮긴다", () => {
    const rects = [
      rect("a", 0, 0, 20),
      rect("b", 100, 0, 20),
      rect("c", 200, 0, 20),
    ];
    const result = distribute(rects, "x");
    expect(result.has("a")).toBe(false);
    expect(result.has("c")).toBe(false);
    // span = 220 - 0 = 220, totalSize = 60, gap = (220-60)/2 = 80
    // b.x = 0 + 20 + 80 = 100 (이미 그 자리라 변화 없음, 값 자체는 검증)
    expect(result.get("b")).toEqual({ x: 100, y: 0 });
  });

  it("정렬 안 된 입력도 위치 기준으로 정렬해 처리한다", () => {
    const rects = [
      rect("c", 200, 0, 20),
      rect("a", 0, 0, 20),
      rect("b", 90, 0, 20),
    ];
    const result = distribute(rects, "x");
    expect(result.get("b")?.x).toBeCloseTo(100);
  });

  it("세로축(y)에도 동일하게 동작한다", () => {
    const rects = [
      rect("a", 0, 0, 20, 20),
      rect("b", 0, 100, 20, 20),
      rect("c", 0, 200, 20, 20),
    ];
    const result = distribute(rects, "y");
    expect(result.get("b")).toEqual({ x: 0, y: 100 });
  });

  it("조각이 3개 미만이면 빈 결과", () => {
    expect(distribute([rect("a", 0, 0), rect("b", 10, 0)], "x").size).toBe(0);
  });
});

describe("computeSnap", () => {
  it("왼쪽 끝이 다른 조각의 왼쪽 끝과 임계값 안이면 그 위치로 스냅한다", () => {
    const dragged = rect("a", 103, 0, 40, 20);
    const other = rect("b", 100, 200, 40, 20);
    const result = computeSnap(dragged, [other]);
    expect(result.dx).toBe(-3);
    expect(result.dy).toBe(0);
    expect(result.guides).toContainEqual({ axis: "x", pos: 100 });
  });

  it("중앙·오른쪽 끝 등 서로 다른 기준끼리도 맞는다", () => {
    // dragged 중앙(x=20)이 other 왼쪽 끝(x=20)과 맞음
    const dragged = rect("a", 0, 0, 40, 20);
    const other = rect("b", 20, 0, 100, 20);
    const result = computeSnap(dragged, [other]);
    expect(result.dx).toBe(0); // 이미 정확히 맞음
    expect(result.guides.find((g) => g.axis === "x")?.pos).toBe(20);
  });

  it("임계값을 넘으면 스냅하지 않는다", () => {
    const dragged = rect("a", 110, 0, 40, 20);
    const other = rect("b", 100, 200, 40, 20);
    const result = computeSnap(dragged, [other], 6);
    expect(result.dx).toBe(0);
    expect(result.guides).toEqual([]);
  });

  it("x·y축을 독립적으로 스냅한다", () => {
    const dragged = rect("a", 3, 97, 40, 20);
    const other = rect("b", 0, 100, 40, 20);
    const result = computeSnap(dragged, [other]);
    expect(result.dx).toBe(-3);
    expect(result.dy).toBe(3);
    expect(result.guides).toHaveLength(2);
  });

  it("여러 후보 중 가장 가까운 것 하나만 축마다 고른다", () => {
    const dragged = rect("a", 0, 0, 40, 20);
    const near = rect("near", 2, 0, 40, 20);
    const far = rect("far", -5, 0, 40, 20);
    const result = computeSnap(dragged, [far, near]);
    expect(result.dx).toBe(2);
  });

  it("스냅 대상이 없으면 dx/dy 0에 빈 가이드", () => {
    const dragged = rect("a", 0, 0);
    const result = computeSnap(dragged, []);
    expect(result).toEqual({ dx: 0, dy: 0, guides: [] });
  });
});
