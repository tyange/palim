function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportSvgElement(svg: SVGSVGElement, filename: string) {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const source = new XMLSerializer().serializeToString(clone);
  const blob = new Blob(
    [`<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n${source}`],
    { type: "image/svg+xml;charset=utf-8" },
  );
  downloadBlob(blob, filename);
}

export const PNG_SCALE = 3;

export async function exportPng(opts: {
  width: number;
  height: number;
  filename: string;
  awaitFont?: string;
  draw: (ctx: CanvasRenderingContext2D) => void;
}) {
  if (opts.awaitFont && document.fonts) {
    await document.fonts.load(opts.awaitFont);
  }

  const canvas = document.createElement("canvas");
  canvas.width = opts.width * PNG_SCALE;
  canvas.height = opts.height * PNG_SCALE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.scale(PNG_SCALE, PNG_SCALE);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, opts.width, opts.height);

  opts.draw(ctx);

  canvas.toBlob((blob) => {
    if (blob) downloadBlob(blob, opts.filename);
  }, "image/png");
}
