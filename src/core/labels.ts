export function normalizeLabel(raw: string): string {
  return raw
    .trim()
    .replace(/^#+/, "")
    .replace(/[,\s]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function normalizeLabels(raw: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of raw) {
    const label = normalizeLabel(r);
    if (!label || seen.has(label)) continue;
    seen.add(label);
    out.push(label);
  }
  return out;
}

export function labelsEqual(
  a: readonly string[],
  b: readonly string[],
): boolean {
  return a.length === b.length && a.every((l, i) => l === b[i]);
}
