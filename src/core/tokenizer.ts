export interface Grapheme {
  char: string;
  offset: number;
  isNewline: boolean;
}

function isNewlineChar(grapheme: string): boolean {
  return grapheme === "\n" || grapheme === "\r\n" || grapheme === "\r";
}

const segmenter = new Intl.Segmenter("ko", { granularity: "grapheme" });

export function segmentGraphemes(text: string): Grapheme[] {
  const graphemes: Grapheme[] = [];
  for (const { segment, index } of segmenter.segment(text)) {
    graphemes.push({
      char: segment,
      offset: index,
      isNewline: isNewlineChar(segment),
    });
  }
  return graphemes;
}
