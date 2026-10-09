import { type Fragment } from "./fragments";
import { normalizeLabels } from "./labels";

export const DOCUMENT_FORMAT = "palim";
export const DOCUMENT_VERSION = 1;

interface SavedFragment {
  x: number;
  y: number;
  text: string;
  labels: string[];
}

interface SavedDocument {
  format: typeof DOCUMENT_FORMAT;
  version: number;
  grid: { fragments: SavedFragment[] };
  flow: { text: string };
}

export type ParseResult =
  | { ok: true; fragments: Fragment[]; text: string }
  | { ok: false; error: string };

export function serializeDocument(
  fragments: readonly Fragment[],
  text: string,
): string {
  const doc: SavedDocument = {
    format: DOCUMENT_FORMAT,
    version: DOCUMENT_VERSION,
    grid: {
      fragments: fragments.map((f) => ({
        x: f.x,
        y: f.y,
        text: f.text,
        labels: [...f.labels],
      })),
    },
    flow: { text },
  };
  return JSON.stringify(doc, null, 2);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function parseDocument(raw: string, makeId: () => string): ParseResult {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { ok: false, error: "JSON을 읽을 수 없어요" };
  }
  if (!isRecord(data) || data.format !== DOCUMENT_FORMAT) {
    return { ok: false, error: "palim 문서가 아니에요" };
  }
  if (typeof data.version !== "number" || data.version > DOCUMENT_VERSION) {
    return { ok: false, error: "더 새로운 버전의 문서예요" };
  }
  const grid = data.grid;
  const flow = data.flow;
  if (!isRecord(grid) || !Array.isArray(grid.fragments) || !isRecord(flow)) {
    return { ok: false, error: "문서 구조가 올바르지 않아요" };
  }
  if (typeof flow.text !== "string") {
    return { ok: false, error: "문서 구조가 올바르지 않아요" };
  }

  const fragments: Fragment[] = [];
  for (const item of grid.fragments) {
    if (
      !isRecord(item) ||
      typeof item.x !== "number" ||
      typeof item.y !== "number" ||
      !Number.isFinite(item.x) ||
      !Number.isFinite(item.y) ||
      typeof item.text !== "string"
    ) {
      return { ok: false, error: "조각 데이터가 올바르지 않아요" };
    }
    const labels = Array.isArray(item.labels)
      ? normalizeLabels(item.labels.filter((l) => typeof l === "string"))
      : [];
    fragments.push({
      id: makeId(),
      x: Math.max(0, item.x),
      y: Math.max(0, item.y),
      text: item.text,
      labels,
    });
  }
  return { ok: true, fragments, text: flow.text };
}
