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

export interface SnapGuide {
  axis: "x" | "y";
  pos: number;
}

export interface SnapResult {
  dx: number;
  dy: number;
  guides: SnapGuide[];
}

export function computeSnap(
  rect: AlignRect,
  others: AlignRect[],
  threshold = 6,
): SnapResult {
  const xCandidates = [rect.x, rect.x + rect.w / 2, rect.x + rect.w];
  const yCandidates = [rect.y, rect.y + rect.h / 2, rect.y + rect.h];

  let bestDx = 0;
  let bestDxMag = Infinity;
  let bestXPos: number | null = null;
  let bestDy = 0;
  let bestDyMag = Infinity;
  let bestYPos: number | null = null;

  for (const other of others) {
    const otherXs = [other.x, other.x + other.w / 2, other.x + other.w];
    const otherYs = [other.y, other.y + other.h / 2, other.y + other.h];

    for (const xc of xCandidates) {
      for (const ox of otherXs) {
        const d = ox - xc;
        if (Math.abs(d) <= threshold && Math.abs(d) < bestDxMag) {
          bestDxMag = Math.abs(d);
          bestDx = d;
          bestXPos = ox;
        }
      }
    }
    for (const yc of yCandidates) {
      for (const oy of otherYs) {
        const d = oy - yc;
        if (Math.abs(d) <= threshold && Math.abs(d) < bestDyMag) {
          bestDyMag = Math.abs(d);
          bestDy = d;
          bestYPos = oy;
        }
      }
    }
  }

  const guides: SnapGuide[] = [];
  if (bestXPos !== null) guides.push({ axis: "x", pos: bestXPos });
  if (bestYPos !== null) guides.push({ axis: "y", pos: bestYPos });

  return {
    dx: bestXPos !== null ? bestDx : 0,
    dy: bestYPos !== null ? bestDy : 0,
    guides,
  };
}
