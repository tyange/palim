# 에디터 입력 모델 — 캐럿·IME·선택 (`GridEditor.vue`)

`GridEditor.vue`는 이 프로젝트에서 가장 복잡한 컴포넌트다. SVG 격자 위에서 입력·캐럿·
IME 조합·드래그 선택을 모두 처리한다. 수정 전 이 문서를 반드시 읽는다.

한국어 IME 조합 중 자모 탈락 버그의 상세 분석은
[`korean-ime-bug.md`](./korean-ime-bug.md)에 있다.

## 왜 숨은 textarea인가

SVG 격자는 편집 가능 요소가 아니라 **IME 조합을 직접 받을 수 없다**. 그래서 화면 밖
**1px 투명 textarea**가 키보드·IME 입력을 수집한다.

- `display:none`은 포커스가 불가능하므로 **금지**. 대신 1px 크기 + `opacity:0` +
  `pointer-events:none`로 숨긴다.
- textarea라서 Enter로 줄바꿈(`\n`)을 입력할 수 있다.
- 셀을 클릭하면 `moveCaretToCellIndex`가 이 textarea에 `focus()` + `setSelectionRange`로
  캐럿을 옮긴다.
- **v-model 금지.** v-model은 IME 조합 중 `input` 이벤트를 무시해 조합 중인 글자가
  반영되지 않는다. native `@input`을 직접 받아야 조합 중에도 buffer가 실시간 표시된다.

## 캐럿 상태

| 상태 | 의미 |
|---|---|
| `caretIndex` | 캐럿의 UTF-16 offset (textarea `selectionStart`와 같은 좌표계) |
| `virtualCell` | 빈 칸에 놓인 가상 캐럿의 칸 인덱스. `null`이면 텍스트 모드 |
| `caretBeforeCell` | 행두(col 0) 글자 '앞'에 캐럿을 둔 칸. 활성 칸 보정용 |
| `isComposing` | IME 조합 중인지 |
| `composingText` | 아직 확정(compositionend) 안 된 조합 글자 |

### 가상 캐럿 (`virtualCell`)

빈 칸을 클릭하면 공백을 만들지 않고 **화면 캐럿만 그 칸에 그린다**. textarea selection은
글 끝에 주차해 두고, 실제 입력 직전에만 `materializeCaret`로 텍스트에 실체화한다.
→ 탐색만 하다 떠나면 텍스트에 흔적이 남지 않는다(사전 공백 채우기와의 결정적 차이).

### 활성 칸 기준 (`currentCell`)

- 가상 모드: 그 빈 칸.
- `caretBeforeCell`이 있으면(행두 글자 앞 클릭): 캐럿 오른쪽 그 칸을 활성으로.
- 그 외: 캐럿 **'왼쪽 칸'**(바로 앞 글자가 놓인 칸)을 활성으로 본다. 클릭(캐럿=칸 끝)·
  타이핑 직후·이동을 모두 같은 기준으로 통일 → 활성 칸 하이라이트와 백스페이스 대상이
  일치한다. (캐럿이 글 맨 앞이면 첫 칸)

## 가상 칸 실체화 (`materializeCaret`)

가상 칸을 실제 텍스트 위치로 바꾼다. target 칸이 입력 위치가 되도록 직전의 '내용 있는
칸' 뒤에 빈틈을 채워 끼워넣는다. **입력 직전에만 호출**(`@beforeinput`·
`compositionstart`·실체화 keydown)하므로 탐색만 하다 떠나면 흔적이 안 남는다.

채움 방식은 target이 입력 중인 현재 라인보다 아래인지에 따라 갈린다:

- **같은 라인**(또는 가득 찬 행의 자동 줄넘김 직후 같은 줄): 사이 빈 칸 수만큼 공백.
- **아래 라인**(행 index가 1 이상 큼): 행 차이만큼 줄바꿈(`\n`)으로 내려가고, 그 행
  안에서 target 열까지만 공백으로 채운다.

> 아래 라인을 전부 공백으로 채우면, 한참 아래 칸을 클릭했을 때 줄바꿈 없는 거대한 공백
> 런이 생겨 미리보기에서 한 단락으로 합쳐지는 문제가 있었다. 그래서 행 차이는 `\n`으로
> 채운다.

현재 라인 판정: 직전 내용 칸 '다음 칸'이 놓이는 행으로 본다(가득 찬 행의 자동 줄넘김까지
반영해 off-by-one을 피함). 내용이 없으면 첫 행(0). 공백·줄바꿈 모두 행두 금칙 대상이
아니라 의도한 칸을 정확히 메운다.

## IME 타이밍 (핵심)

가상 칸 실체화는 **조합이 시작되기 전**에 끝나야 IME가 올바른 offset에서 조합을
시작한다. 타이밍 순서:

1. IME 첫 자모 **keydown** — `compositionstart`보다 먼저 오고, `keyCode === 229`
   ("Process")로 식별된다. (deprecated지만 IME 감지의 표준 관용구)
2. `compositionstart`
3. `compositionupdate` …
4. `compositionend`

`onKeyDown`에서 `startsTextInput`이 229/Process/Enter/단일 문자를 감지하면, 가상 칸일
때 **이 시점에** `materializeCaret`를 호출한다. `compositionstart`·`beforeinput`은 이미
옛 위치에 앵커가 잡힌 뒤라 글 끝에서 조합되는 버그가 난다([korean-ime-bug.md] 버그2).

`onCompositionStart`에서도 `materializeCaret`를 한 번 더 부르지만, 이는 keydown 경로를
타지 못한 경우의 백스톱이다.

## 셀 이동 (`moveCaretToCellIndex`)

셀 클릭·방향키 이동의 공통 처리.

- **내용(글자·공백) 있는 칸**:
  - 행두(col 0) 글자는 캐럿을 칸 '앞'(`span[0]`)에 둔다 → 그 앞에 삽입(공백 prepend)
    가능. 행두는 왼쪽 칸이 이전 줄에 있어 평소처럼 앞 칸을 클릭해 위치할 수 없으므로
    별도 분기가 필요하다(일반 에디터의 줄 맨 앞 클릭과 동일). `caretBeforeCell`로 그 칸을
    활성 칸으로 유지.
  - 그 외 칸은 캐럿을 칸 끝(글자 뒤, `span[1]`)에 둔다 → 클릭한 칸이 활성 칸이 되고
    백스페이스가 그 칸을 지운다(타이핑 직후 상태와 일관).
- **빈 칸**: 가상 모드(`virtualCell = cellIndex`). textarea selection은 글 끝에 주차.

## 방향키 이동

모든 방향키를 칸 단위 이동으로 통일한다(빈 칸도 캐럿이 앉을 수 있어 중간 갭을 넘나든다).

- `arrowDelta`가 키 → `[dRow, dCol]`. 경계 밖이면 무시.
- **조합 중 keydown은 무시.** caret을 건드리면 IME가 글자를 복제·깨뜨리므로, 네이티브가
  조합을 확정하게 두면 같은 키에 대해 `isComposing=false`인 두 번째 keydown이 곧바로 와서
  (확정 후 캐럿을 흡수한 `currentCell` 기준으로) 이동을 수행한다.

## 드래그 선택과 삭제

- 드래그는 칸 단위 `anchor`~`focus` 범위. **두 칸 이상** 걸쳐야 선택으로 간주
  (한 칸은 캐럿 이동).
- 셀은 SVG라 포커스를 못 받으므로 mousedown 시 숨은 textarea에 포커스.
- 드래그가 격자 밖에서 끝나도 종료되도록 **전역 `window` mouseup**으로 `endDrag` 수신.
  드래그 없이 같은 칸에서 끝나면 클릭 → 캐럿 이동.
- `deleteSelection`: 선택 밴드(min~max 칸)가 덮는 UTF-16 offset 구간을 원본에서 통째로
  잘라낸다. 사이에 낀 줄바꿈도 함께 제거되어 줄이 깔끔히 당겨진다.

## 백스페이스 분기 (`onKeyDown`)

- 조합 중: IME에 맡김(자모 삭제).
- 선택 있음: `deleteSelection`.
- 가상 칸: 지울 게 없으므로 네이티브 삭제(글 끝 글자 제거)를 막고 한 칸 왼쪽으로 이동.
- 텍스트 모드: 네이티브 백스페이스에 맡김.

## 활성 칸 계산 (`cells` computed)

- 조합 중이면 조합 글자가 놓인 칸들을 활성으로(여러 칸 가능).
- 아니면 `currentCell()` 한 칸.
- 선택 중에는 캐럿 강조를 숨기고, 선택 밴드 안에서 **실제 글자가 있는 칸만** 하이라이트.
