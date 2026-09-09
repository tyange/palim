export const MARGIN_COLS = 8;
export const MARGIN_ROWS = 12;

export function trimRect(s: string): string {
  const lines = s.split("\n").map((l) => l.replace(/[ \t]+$/, ""));
  while (lines.length > 1 && lines[lines.length - 1] === "") lines.pop();
  return lines.join("\n");
}

export function padRect(
  s: string,
  marginCols = MARGIN_COLS,
  marginRows = MARGIN_ROWS,
): string {
  const lines = trimRect(s).split("\n");
  const w = lines.reduce((m, l) => Math.max(m, l.length), 0) + marginCols;
  const out = lines.map((l) => l + " ".repeat(w - l.length));
  for (let i = 0; i < marginRows; i++) out.push(" ".repeat(w));
  return out.join("\n");
}
