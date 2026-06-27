export type TokenType =
  | "hangul"
  | "digit"
  | "upper"
  | "lower"
  | "punctuation"
  | "mark"
  | "quote"
  | "ellipsis"
  | "space"
  | "newline"
  | "other";

export interface Token {
  char: string;
  type: TokenType;
  offset: number;
}

const HANGUL_HANJA = /[\p{Script=Hangul}\p{Script=Han}]/u;

const PUNCTUATION = new Set([".", ",", "．", "，", "·", "、", "。"]);
const MARK = new Set(["?", "!", "？", "！"]);
const QUOTE = new Set(["'", '"', "‘", "’", "“", "”"]);

export function classifyChar(grapheme: string): TokenType {
  if (grapheme === "\n" || grapheme === "\r\n" || grapheme === "\r")
    return "newline";
  if (grapheme === "…") return "ellipsis";
  if (PUNCTUATION.has(grapheme)) return "punctuation";
  if (MARK.has(grapheme)) return "mark";
  if (QUOTE.has(grapheme)) return "quote";
  if (/^[0-9]$/.test(grapheme)) return "digit";
  if (/^[A-Z]$/.test(grapheme)) return "upper";
  if (/^[a-z]/.test(grapheme)) return "lower";
  if (HANGUL_HANJA.test(grapheme)) return "hangul";
  if (/^\s/.test(grapheme)) return "space";
  return "other";
}

const segmenter = new Intl.Segmenter("ko", { granularity: "grapheme" });

export function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  for (const { segment, index } of segmenter.segment(text)) {
    tokens.push({ char: segment, type: classifyChar(segment), offset: index });
  }
  return tokens;
}
