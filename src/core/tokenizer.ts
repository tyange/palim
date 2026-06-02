// 원고지 레이아웃 엔진 ① — 토큰 분류기
//
// 입력 문자열의 각 글자를 "원고지 칸 점유 규칙"의 기준이 되는 종류로 분류한다.
// 실제 칸 배치(숫자 2개 묶기, 마침표+따옴표 합치기 등)와 줄바꿈 금칙 처리는
// 다음 단계에서 이 분류 결과를 입력으로 받아 수행한다.
//
// 참고: docs/manuscript-paper-editing.md §1 (칸 점유 규칙)

export type TokenType =
  | "hangul" // 한글·한자 등 전각 문자 — 한 칸에 1글자
  | "digit" // 숫자 — 한 칸에 2개
  | "upper" // 알파벳 대문자 — 한 칸에 1개
  | "lower" // 알파벳 소문자 — 한 칸에 2개
  | "punctuation" // 마침표·쉼표 — 1칸, 뒤 칸 안 띄움
  | "mark" // 물음표·느낌표 — 1칸
  | "quote" // 따옴표류 — 여닫는 작은·큰따옴표
  | "ellipsis" // 줄임표(…) — 칸당 가운뎃점 3개
  | "space" // 공백 — 1칸
  | "newline" // 줄바꿈(문단 바꿈) — 칸을 차지하지 않음
  | "other"; // 위에 속하지 않는 기타 문자

export interface Token {
  /** 원본 자소(grapheme) — 결합 문자·이모지를 포함해 "사용자가 보는 한 글자" */
  char: string;
  /** 분류된 종류 */
  type: TokenType;
  /** 원본 문자열의 UTF-16 인덱스 — textarea selectionStart와 호환(캐럿/선택 역산용) */
  offset: number;
}

// 한글(자모 포함)·한자. Unicode Script 속성으로 판정하므로
// 완성형 음절뿐 아니라 IME 조합 중 단독 자모(ㄱ, ㅏ …)도 hangul로 분류된다.
const HANGUL_HANJA = /[\p{Script=Hangul}\p{Script=Han}]/u;

// 반각·전각을 함께 처리한다.
const PUNCTUATION = new Set([".", ",", "．", "，", "·", "、", "。"]);
const MARK = new Set(["?", "!", "？", "！"]);
const QUOTE = new Set(["'", '"', "‘", "’", "“", "”"]);

/** 자소(grapheme) 한 개를 원고지 점유 규칙의 종류로 분류한다. */
export function classifyChar(grapheme: string): TokenType {
  // 줄바꿈: textarea의 "\n", 윈도 "\r\n", 구형 "\r" 모두 한 자소로 묶일 수 있음
  if (grapheme === "\n" || grapheme === "\r\n" || grapheme === "\r")
    return "newline";
  if (grapheme === "…") return "ellipsis"; // … (가로 줄임표)
  if (PUNCTUATION.has(grapheme)) return "punctuation";
  if (MARK.has(grapheme)) return "mark";
  if (QUOTE.has(grapheme)) return "quote";
  // 숫자·알파벳은 "반각"만 한 칸에 2개(소문자)/1개(대문자) 규칙 대상.
  // 전각(０Ａ) 및 한자·한글은 1칸이므로 hangul로 분류된다.
  if (/^[0-9]$/.test(grapheme)) return "digit";
  if (/^[A-Z]$/.test(grapheme)) return "upper";
  if (/^[a-z]/.test(grapheme)) return "lower"; // é 등 결합 자소 포함
  if (HANGUL_HANJA.test(grapheme)) return "hangul";
  if (/^\s/.test(grapheme)) return "space"; // 줄바꿈은 위에서 이미 걸러짐
  return "other";
}

// 자소 분할기는 생성 비용이 있어 모듈 수준에서 1회만 만든다.
const segmenter = new Intl.Segmenter("ko", { granularity: "grapheme" });

/**
 * 문자열을 자소(grapheme) 단위로 분류해 토큰 배열을 만든다.
 * Intl.Segmenter를 써서 결합 문자·이모지도 "한 글자"로 끊는다.
 * (묶기·칸 배치는 하지 않는다 — 순수 분류 단계)
 */
export function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  for (const { segment, index } of segmenter.segment(text)) {
    tokens.push({ char: segment, type: classifyChar(segment), offset: index });
  }
  return tokens;
}
