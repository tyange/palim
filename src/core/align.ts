export interface AlignRect {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export type AlignEdge =
  | "left"
  | "right"
  | "top"
  | "bottom"
  | "centerX"
  | "centerY";

export function alignEdge(
  rects: AlignRect[],
  edge: AlignEdge,
): Map<string, { x: number; y: number }> {
  const result = new Map<string, { x: number; y: number }>();
  if (rects.length < 2) return result;

  switch (edge) {
    case "left": {
      const min = Math.min(...rects.map((r) => r.x));
      for (const r of rects) result.set(r.id, { x: min, y: r.y });
      break;
    }
    case "right": {
      const max = Math.max(...rects.map((r) => r.x + r.w));
      for (const r of rects) result.set(r.id, { x: max - r.w, y: r.y });
      break;
    }
    case "centerX": {
      const min = Math.min(...rects.map((r) => r.x));
      const max = Math.max(...rects.map((r) => r.x + r.w));
      const center = (min + max) / 2;
      for (const r of rects) result.set(r.id, { x: center - r.w / 2, y: r.y });
      break;
    }
    case "top": {
      const min = Math.min(...rects.map((r) => r.y));
      for (const r of rects) result.set(r.id, { x: r.x, y: min });
      break;
    }
    case "bottom": {
      const max = Math.max(...rects.map((r) => r.y + r.h));
      for (const r of rects) result.set(r.id, { x: r.x, y: max - r.h });
      break;
    }
    case "centerY": {
      const min = Math.min(...rects.map((r) => r.y));
      const max = Math.max(...rects.map((r) => r.y + r.h));
      const center = (min + max) / 2;
      for (const r of rects) result.set(r.id, { x: r.x, y: center - r.h / 2 });
      break;
    }
  }
  return result;
}

export function distribute(
  rects: AlignRect[],
  axis: "x" | "y",
): Map<string, { x: number; y: number }> {
  const result = new Map<string, { x: number; y: number }>();
  if (rects.length < 3) return result;

  const sizeKey = axis === "x" ? "w" : "h";
  const posKey = axis === "x" ? "x" : "y";
  const sorted = [...rects].sort((a, b) => a[posKey] - b[posKey]);

  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const totalSize = sorted.reduce((sum, r) => sum + r[sizeKey], 0);
  const span = last[posKey] + last[sizeKey] - first[posKey];
  const gap = (span - totalSize) / (sorted.length - 1);

  let cursor = first[posKey] + first[sizeKey] + gap;
  for (let i = 1; i < sorted.length - 1; i++) {
    const r = sorted[i];
    const pos = { x: r.x, y: r.y };
    if (axis === "x") pos.x = cursor;
    else pos.y = cursor;
    result.set(r.id, pos);
    cursor += r[sizeKey] + gap;
  }
  return result;
}
