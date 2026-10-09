import { describe, expect, it } from "vitest";
import { parseDocument, serializeDocument } from "./document";
import { type Fragment } from "./fragments";

function idFactory() {
  let seq = 0;
  return () => `n${++seq}`;
}

const sample: Fragment[] = [
  {
    id: "a",
    x: 10,
    y: 20,
    text: "나는 사랑을 모른다",
    labels: ["사랑", "무지"],
  },
  { id: "b", x: 30, y: 40, text: "그건 오만함인가", labels: [] },
];

describe("serializeDocument / parseDocument", () => {
  it("왕복해도 좌표·텍스트·라벨·순서가 보존된다(id는 새로 부여)", () => {
    const raw = serializeDocument(sample, "흐름 본문");
    const result = parseDocument(raw, idFactory());
    expect(result).toEqual({
      ok: true,
      fragments: [
        {
          id: "n1",
          x: 10,
          y: 20,
          text: "나는 사랑을 모른다",
          labels: ["사랑", "무지"],
        },
        { id: "n2", x: 30, y: 40, text: "그건 오만함인가", labels: [] },
      ],
      text: "흐름 본문",
    });
  });

  it("파일에는 id를 저장하지 않는다", () => {
    expect(serializeDocument(sample, "")).not.toContain('"id"');
  });

  it("labels가 없는 조각(옛 문서)은 빈 배열로 읽는다", () => {
    const raw = JSON.stringify({
      format: "palim",
      version: 1,
      grid: { fragments: [{ x: 1, y: 2, text: "t" }] },
      flow: { text: "" },
    });
    const result = parseDocument(raw, idFactory());
    expect(result.ok && result.fragments[0].labels).toEqual([]);
  });

  it("라벨은 읽을 때 다시 정규화한다", () => {
    const raw = JSON.stringify({
      format: "palim",
      version: 1,
      grid: {
        fragments: [{ x: 1, y: 2, text: "t", labels: ["#a b", "a_b", 3] }],
      },
      flow: { text: "" },
    });
    const result = parseDocument(raw, idFactory());
    expect(result.ok && result.fragments[0].labels).toEqual(["a_b"]);
  });

  it("JSON이 아니면 실패한다", () => {
    expect(parseDocument("{oops", idFactory()).ok).toBe(false);
  });

  it("palim 문서가 아니면 실패한다", () => {
    expect(parseDocument('{"format":"other"}', idFactory()).ok).toBe(false);
  });

  it("더 새로운 버전이면 실패한다", () => {
    const raw = JSON.stringify({
      format: "palim",
      version: 99,
      grid: { fragments: [] },
      flow: { text: "" },
    });
    expect(parseDocument(raw, idFactory()).ok).toBe(false);
  });

  it("조각 필드가 잘못되면 실패한다", () => {
    const raw = JSON.stringify({
      format: "palim",
      version: 1,
      grid: { fragments: [{ x: "1", y: 2, text: "t" }] },
      flow: { text: "" },
    });
    expect(parseDocument(raw, idFactory()).ok).toBe(false);
  });
});
