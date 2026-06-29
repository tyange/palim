# 아키텍처 — 진실원천·파이프라인과 코어 엔진

Palim 본문은 **하나의 문자열**(`text`)이 진실원천이고, `mode`("grid" | "flow")에 따라
화면이 파생된다. 이 문서는 그 파이프라인과 `core/`의 격자 배치 로직을 정리한다.

두 모드가 갈리는 근거는 [`writing-modes.md`](./writing-modes.md)에 있고, 이 문서는
**코드가 어떻게 구현하는지**를 다룬다.

## 진실원천과 파생

```
text(string) + mode            ← 단일 진실원천 (stores/manuscript.ts)
  ├─ grid: segmentGraphemes()  ① 자소 분할(offset·줄바꿈)       src/core/tokenizer.ts
  │        → flowGraphemes()   ② 자소 1=1칸, 자동 cols/rows 격자  src/core/layout.ts
  │        → GridLayout        cellText / cellToOffset / cellSpan / offsetToCell / endCellIndex
  └─ flow: <textarea> 그대로   비례폭 — 코어 파이프라인을 거치지 않음
```

- `core/`는 **DOM·Vue를 모르는 순수 TS**다. 격자 배치 규칙은 전부 여기 있고 단위
  테스트하기 좋은 형태다.
- `stores/manuscript.ts`가 `text` ref(원본)·`mode` ref와 `gridLayout` computed(파생)를
  한 스토어에 묶는다. 격자 모드의 편집(`GridEditor`)·출력(`GridPreview`)이 같은
  `gridLayout`을, 흐름 모드의 편집(`FlowEditor`)·출력(`FlowPreview`)이 같은 `text`를
  구독하므로 편집면과 출력면이 항상 일치한다.

### 크기 상수 (`stores/manuscript.ts`)

격자 크기는 **고정이 아니라 내용에 맞춰 자동 확장**된다. 상수는 하한·메트릭만 정한다.

| 상수 | 키 | 의미 |
|---|---|---|
| `GRID` | `cellSize` 32 | 격자 칸 한 변(px) |
| | `minCols` 20 | 격자 최소 열 수 |
| | `minRows` 12 | 격자 최소 행 수 |
| `FLOW` | `width` 680 | 흐름 모드 박스 폭(px) |
| | `fontSize` 18 · `lineHeight` 30 · `padX`/`padY` 16 | 흐름 조판 메트릭 |

## offset 모델 (UTF-16)

`offset`은 원본 문자열의 **UTF-16 인덱스**로, textarea `selectionStart`와 같은 좌표계다.
격자 모드의 칸↔캐럿 역산이 모두 이 offset 위에서 동작한다.

- `cellToOffset[i]` — 칸 i 첫 자소의 offset (칸 클릭 → 캐럿 위치)
- `offsetToCell.get(offset)` — 자소 시작 offset → 칸 인덱스 (캐럿 → 활성 칸)
- `cellSpan[i]` — 칸 i가 덮는 `[start, end)` 구간 (선택 삭제·캐럿 판정)

> **줄바꿈(`\n`) offset은 그 줄바꿈이 연 새 줄의 첫 칸으로 역산된다.** `\n`은 칸을
> 차지하지 않아 `cellText`/`cellSpan`엔 안 들어가지만, `offsetToCell`에는 등록한다.
> 캐럿이 `\n` 바로 뒤(=새 줄 맨 앞)에 있을 때 활성 칸을 '캐럿 왼쪽 칸'으로 역산하면
> 그 왼쪽이 `\n`이 되는데, 등록이 없으면 `endCellIndex`(글 끝)로 폴백해 캐럿이 엉뚱한
> 칸에 그려진다. 새 줄 첫 칸으로 매핑하면 중간 Enter·연속 빈 줄 모두에서 캐럿이
> 새 줄 맨 앞에 정확히 앉는다.

## ① 자소 분할 (`core/tokenizer.ts`)

`segmentGraphemes(text)`는 `Intl.Segmenter("ko", { granularity: "grapheme" })`로 문자열을
자소 단위로 끊어 `{ char, offset, isNewline }[]`로 돌려준다. 결합 문자·이모지·서로게이트
쌍도 "사용자가 보는 한 글자"로 묶이고, `offset`은 UTF-16 인덱스다. 줄바꿈은 `\n`·`\r\n`·
`\r`를 한 자소로 보고 `isNewline`으로 표시한다. 분할기는 생성 비용이 있어 모듈 수준에서
1회만 만든다. (원고지 칸 점유 분류는 더 이상 하지 않는다 — `writing-modes.md` §2.)

## ② 격자 배치 (`core/layout.ts`)

`flowGraphemes(text, minCols, minRows)`는 자소를 **한 칸에 하나씩** 격자에 흘려넣는다.
격자 무관 순수 로직이다.

- **자동 크기**: 1패스로 줄별 자소 수를 세 `cols = max(minCols, 최장 줄)`,
  `rows = max(minRows, 줄수 + 1)`를 정한다(`+1`은 아래쪽 배치용 여유 행).
- **배치**: 2패스로 자소를 `idx = row*cols+col`에 채운다. 공백도 한 칸을 차지한다(배치
  보존). `\n`은 칸을 안 먹고 `row+=1; col=0`으로 행을 내리며, 그 offset을 **다음 행 첫 칸**
  으로 `offsetToCell`에 등록한다.
- **묶기·금칙·soft-wrap 없음**: 숫자·소문자 2개 묶기, 부호 합치기, 행두 금칙 reflow, 자동
  줄넘김을 **하지 않는다**. 놓은 그대로가 결과다.

### `GridLayout` 데이터 모델

`flowGraphemes`의 결과. 격자 모드 화면은 이 구조만 보고 그린다.

| 필드 | 의미 |
|---|---|
| `rows` · `cols` | 자동 확장된 격자 크기 |
| `cellText[]` | 각 칸의 자소(`rows*cols` 길이, 빈 칸 `""`, 공백 칸 `" "`) |
| `cellToOffset[]` | 칸 인덱스 → 그 칸 자소 offset (칸 클릭 → 캐럿) |
| `cellSpan[]` | 칸 인덱스 → 덮는 `[start, end)` 구간 (선택 삭제·캐럿) |
| `offsetToCell` | 자소 시작 offset → 칸 인덱스 (캐럿 → 활성 칸) |
| `endCellIndex` | 글 끝(다음 입력)이 놓일 칸. 캐럿이 글 끝일 때 강조용. 격자 끝이면 클램프 |
