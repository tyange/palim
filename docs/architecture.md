# 아키텍처 — 레이아웃 파이프라인과 코어 엔진

Palim 본문은 **하나의 문자열**(`text`)이 진실원천이고, 화면은 순수 함수
파이프라인으로 파생된다. 이 문서는 그 파이프라인과 `core/`의 도메인 규칙을 정리한다.

도메인 규칙 자체(칸 점유·금칙)는 [`manuscript-paper-editing.md`](./manuscript-paper-editing.md)에
있고, 이 문서는 그 규칙을 **코드가 어떻게 구현하는지**를 다룬다.

## 진실원천과 파이프라인

```
text(string)  ← 단일 진실원천 (stores/manuscript.ts)
  → tokenize()      ① 자소(grapheme)별 칸 점유 종류 분류        src/core/tokenizer.ts
  → packCells()     ②③ "한 칸 단위"로 묶기                      src/core/layout.ts
  → flowToGrid()    ②③ 격자 배치 + 행두 금칙 보정 + 줄넘김 표식  src/core/layout.ts
  → GridLayout      cellText / cellSpan / offsetToCell / margins / newlines / softWraps
```

- `core/`는 **DOM·Vue를 모르는 순수 TS**다. 도메인 규칙은 전부 여기 있고 단위
  테스트하기 좋은 형태다.
- `stores/manuscript.ts`가 `text` ref(원본)와 `layout` computed(파생)를 한 스토어에
  묶는다. `GridEditor`(입력·캐럿)와 `ManuscriptPreview`(출력·SVG 저장)가 같은
  `text`/`layout`을 구독하므로 항상 같은 문서를 본다.
- 단일 문서 앱이지만 툴바(행/열·쓰기방향)·undo/redo·export 설정 등 상태가 늘어날
  것을 고려해 Pinia 스토어로 둔다.

### GRID 상수 (`stores/manuscript.ts`)

격자 크기는 현재 고정값이다(추후 툴바 입력과 연결 가능).

| 키 | 값 | 의미 |
|---|---|---|
| `rows` | 12 | 행 수 |
| `cols` | 16 | 열 수 |
| `cellSize` | 32 | 칸 한 변 픽셀(SVG 단위) |
| `gutterCols` | 1 | 격자 오른쪽 여백 칸 수. **행두 금칙으로 밀려난 구두점**이 적히는 자리 |

## offset 모델 (UTF-16)

`offset`은 원본 문자열의 **UTF-16 인덱스**로, textarea `selectionStart`와 같은
좌표계다. 칸↔캐럿 역산이 모두 이 offset 위에서 동작한다.

- `cellToOffset[i]` — 칸 i 첫 토큰의 offset (칸 클릭 → 캐럿 위치)
- `offsetToCell.get(offset)` — 토큰 시작 offset → 칸 인덱스 (캐럿 → 활성 칸)
- `cellSpan[i]` — 칸 i가 덮는 `[start, end)` 구간 (선택 삭제·캐럿 판정)

## ① 토큰 분류기 (`core/tokenizer.ts`)

입력 문자열의 각 글자를 원고지 칸 점유 규칙의 기준이 되는 `TokenType`으로 분류한다.
칸 묶기·배치는 하지 않는 **순수 분류 단계**다.

### 자소 분할

`Intl.Segmenter("ko", { granularity: "grapheme" })`로 문자열을 자소 단위로 끊는다.
결합 문자·이모지도 "사용자가 보는 한 글자"로 묶인다. 분할기는 생성 비용이 있어
모듈 수준에서 1회만 만든다.

### TokenType

| 종류 | 대상 | 점유 |
|---|---|---|
| `hangul` | 한글·한자 등 전각 문자 | 한 칸 1글자 |
| `digit` | 숫자(반각) | 한 칸 2개 |
| `upper` | 알파벳 대문자(반각) | 한 칸 1개 |
| `lower` | 알파벳 소문자(반각) | 한 칸 2개 |
| `punctuation` | 마침표·쉼표류(`. , ． ， · 、 。`) | 1칸, 뒤 칸 안 띄움 |
| `mark` | 물음표·느낌표(`? ! ？ ！`) | 1칸 |
| `quote` | 따옴표류(`' " ‘ ’ “ ”`) | 1칸 |
| `ellipsis` | 줄임표(`…`) | 칸당 가운뎃점 3개 |
| `space` | 공백 | 1칸 |
| `newline` | 줄바꿈(문단 바꿈) | 칸을 차지하지 않음 |
| `other` | 위에 속하지 않는 기타 | 1칸 |

### 분류 규칙 (`classifyChar`)

- 줄바꿈은 `"\n"`, 윈도 `"\r\n"`, 구형 `"\r"`을 모두 한 자소로 처리.
- 한글·한자는 Unicode Script 속성(`\p{Script=Hangul}`, `\p{Script=Han}`)으로 판정.
  완성형 음절뿐 아니라 **IME 조합 중 단독 자모(ㄱ, ㅏ …)도 hangul로 분류**된다.
- 숫자·알파벳은 **반각만** 2개/1개 묶기 대상. 전각(`０Ａ`)은 한자·한글처럼 1칸이라
  `hangul`로 분류된다.
- 반각·전각 구두점·물음표·따옴표를 함께 처리한다.

## ②③ 레이아웃 엔진 (`core/layout.ts`)

토큰 배열을 받아 격자에 배치한다. 격자 크기와 무관한 순수 로직이다.

### (a) `packCells` — 칸 단위 묶기

토큰을 점유 규칙대로 "한 칸에 들어갈 단위(`CellUnit`)"로 묶는다.

- **숫자·소문자**: 연속한 같은 종류를 **2개씩** 한 칸에 묶음
  (`"12345"` → `"12","34","5"` / `"abc"` → `"ab","c"`)
- **문장부호(`. , ? !`) + 바로 뒤 따옴표**: **한 칸에 합침** (`"했다." + "”"` → `다."`)
- 그 외(한글·대문자·구두점·따옴표·줄임표·공백·기타): 한 칸에 한 자소
- 줄바꿈: 칸을 차지하지 않는 `isBreak: true` 단위

`CellUnit`은 `{ text, tokens, isBreak }`. `tokens`(1~2개)를 들고 있어 칸→offset 역산에
쓰인다.

### (b) `flowToGrid` — 격자 배치 + 줄 경계 보정

`CellUnit` 배열을 격자에 흘려넣으며 줄넘김·금칙을 적용한다.

- **break 단위(`\n`)**: 칸을 점유하지 않고 다음 행 첫 칸으로 이동. 줄 끝 위치를
  `newlines`에 기록해 표식(↵)으로 그린다.
- **자동 줄넘김(soft-wrap)**: 한 행이 `cols`를 넘으면 다음 행으로. 이때 앞 행을
  `softWraps`에 기록해 커넥터(⟯)로 그린다.
- **행두 금칙 보정 ③**: 자동 줄넘김 직후 줄 첫 칸에 올 구두점(`isLineStartProhibited`)은
  앞 줄 오른쪽 여백(`margins`)으로 밀어낸다. 연속 구두점도 같은 줄 여백으로 보낸다.
- **사용자 줄바꿈 직후엔 보정하지 않는다.** `justWrapped` 플래그가 자동 줄넘김에서만
  `true`라, `\n` 직후(=의도된 문단 바꿈)에는 금칙·soft-wrap 판정이 걸리지 않는다.
- `rows`를 넘는 칸은 `overflow`로만 집계(미표시).

### 행두 금칙 대상 (`isLineStartProhibited`)

줄 맨 앞 칸에 못 오는 단위:

- 마침표·쉼표(`punctuation`), 물음표·느낌표(`mark`), 또는 그것으로 시작하는 합친 단위
- **곡선 닫는 따옴표만**(`’ U+2019`, `” U+201D`). 여는 따옴표·직선 따옴표는 제외 —
  대화문은 줄 첫 칸에서 시작할 수 있으므로.

### `GridLayout` 데이터 모델

`flowToGrid`의 결과. 화면은 이 구조만 보고 그린다.

| 필드 | 의미 |
|---|---|
| `cellText[]` | 각 칸의 텍스트(`rows*cols` 길이, 빈 칸 `""`) |
| `cellToOffset[]` | 칸 인덱스 → 그 칸 첫 토큰 offset (칸 클릭 → 캐럿) |
| `cellSpan[]` | 칸 인덱스 → 덮는 `[start, end)` 구간 (선택 삭제·캐럿) |
| `offsetToCell` | 토큰 시작 offset → 칸 인덱스 (캐럿 → 활성 칸) |
| `endCellIndex` | 글 끝(다음 입력)이 놓일 칸. 캐럿이 글 끝일 때 강조용. 격자를 다 채웠으면 마지막 칸으로 클램프 |
| `margins[]` | 행두 금칙으로 줄 오른쪽 여백에 배치된 칸들(`{ row, text, offset }`) |
| `newlines[]` | 사용자 줄바꿈(`\n`) 위치들(`{ row, col, offset }`) — 표식 ↵ |
| `softWraps[]` | 자동 줄넘김된 행 인덱스들 — 커넥터 ⟯ |
| `overflow` | 격자(여백 포함)를 넘어 배치 못 한 칸 수 |
