import { describe, expect, it } from "vitest";
import { History } from "./history";

describe("History", () => {
  it("초기 상태는 undo/redo 둘 다 불가능하다", () => {
    const h = new History<number>();
    expect(h.canUndo).toBe(false);
    expect(h.canRedo).toBe(false);
  });

  it("push 후엔 undo만 가능하다", () => {
    const h = new History<number>();
    h.push(1);
    expect(h.canUndo).toBe(true);
    expect(h.canRedo).toBe(false);
  });

  it("undo는 마지막 push된 값을 반환하고, 현재 값을 redo용으로 보관한다", () => {
    const h = new History<number>();
    h.push(1);
    const prev = h.undo(2);
    expect(prev).toBe(1);
    expect(h.canUndo).toBe(false);
    expect(h.canRedo).toBe(true);
  });

  it("redo는 undo로 보관해둔 값을 되돌려준다", () => {
    const h = new History<number>();
    h.push(1);
    h.undo(2);
    const next = h.redo(1);
    expect(next).toBe(2);
    expect(h.canUndo).toBe(true);
    expect(h.canRedo).toBe(false);
  });

  it("비어 있을 때 undo/redo는 undefined를 반환하고 상태를 바꾸지 않는다", () => {
    const h = new History<number>();
    expect(h.undo(1)).toBeUndefined();
    expect(h.redo(1)).toBeUndefined();
    expect(h.canUndo).toBe(false);
    expect(h.canRedo).toBe(false);
  });

  it("undo 이후 새로 push하면 redo 가능성이 사라진다", () => {
    const h = new History<number>();
    h.push(1);
    h.undo(2);
    expect(h.canRedo).toBe(true);
    h.push(3);
    expect(h.canRedo).toBe(false);
  });

  it("limit을 넘는 push는 가장 오래된 항목을 버린다", () => {
    const h = new History<number>(2);
    h.push(1);
    h.push(2);
    h.push(3);
    let cur = 4;
    cur = h.undo(cur) ?? cur; // 3
    expect(cur).toBe(3);
    cur = h.undo(cur) ?? cur; // 2
    expect(cur).toBe(2);
    expect(h.undo(cur)).toBeUndefined(); // 1은 limit 초과로 버려짐
  });

  it("연속된 push/undo/redo 시퀀스가 값을 정확히 왕복한다", () => {
    const h = new History<number>();
    h.push(1);
    h.push(2);
    let cur = 3;
    cur = h.undo(cur)!;
    expect(cur).toBe(2);
    cur = h.undo(cur)!;
    expect(cur).toBe(1);
    cur = h.redo(cur)!;
    expect(cur).toBe(2);
    cur = h.redo(cur)!;
    expect(cur).toBe(3);
    expect(h.canRedo).toBe(false);
  });
});
