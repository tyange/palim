# 격자 에디터 — 좌표 맵(진실원천) + CodeMirror 6(편집 표면)

진실원천은 **좌표 맵** `doc: CoordDoc = Map<"행,열", 자소>`(`src/core/coord.ts`).
공백·빈 줄은 저장하지 않는다 — (10, 40)에 글자를 놓으면 저장되는 건 `{"10,40": 자소}`
하나뿐, 왼쪽 40칸·위 10행은 **공백도 빈 줄도 아니라 그냥 없음**(좌표). `text` 문자열은
`textFromDoc(doc)` **읽기 전용 `computed`** — 흐름 모드 textarea·미리보기·export가 보는
직렬화 투영이다.

편집 표면(`src/components/GridEditor.vue`)은 **CodeMirror 6**이 좌표 맵을
`padRectFromDoc`로 직사각형 문자열에 투영해 그리고, CM6이 낸 편집은 `docFromString`으로
다시 좌표 맵으로 파싱해 `doc`에 되돌린다. CM6은 캐럿·IME·undo·선택을 담당하는 **뷰**.

## 왜 CM6

바닥부터 만들었다가 두 번 벽에 부딪혔다:

1. **SVG 격자 + 숨은 1px textarea + 가상 캐럿**(`archive/svg-grid-editor/`) — 브라우저가
   공짜로 주는 캐럿·IME·선택·undo를 전부 재구현. 본문 소실, 캐럿 튐, IME 자모 탈락.
2. **순수 `<textarea>`**(커밋 `1f4c0a4`) — 편집은 되나 격자 도구로 키우기 hacky.

격자 모드는 본질적으로 **모노스페이스 텍스트 버퍼 + 캐럿**이고 CM6의 `state.doc`(문자열)와
잘 맞는다. CM6은 CJK/한국어 IME를 제대로 처리하고 undo/redo·선택·클립보드가 내장.

> headless UI(Reka)엔 텍스트 편집 프리미티브가 없다 — 그래서 편집 표면만은 CM6.

### 왜 좌표 맵이 진실원천인가 (true-B)

문자열 하나("공백 N개 = N칸")를 진실원천으로 쓰면 후행 공백이 의미를 갖고(모호함),
글자를 지우면 공백 구멍이 남고, 블록 이동·이름 앵커 같은 좌표 연산이 문자열 재조립이
된다. 시인의 머릿속 모델도 "40칸"이지 "40번 스페이스"가 아니다. 그래서 저장·모델
진실원천을 **좌표 맵으로 뒤집는다**. 공백은 좌표 오프셋(열 인덱스)으로만 표현되고
절대 저장되지 않는다.

- **평문으로 나갈 때만** 공백·`\n`이 물질화된다: 클립보드 복사, `.txt` export,
  다른 앱 붙여넣기 → `textFromDoc(doc)`. 평문에 2D 위치를 담을 다른 방법이 없으니
  불가피. "공백 없음"은 Palim 내부 모델·네이티브 포맷에서만 성립.
- **흐름 모드**는 `<textarea>`를 **uncontrolled**로 둔다(매 입력마다 `:value` 재바인딩
  안 함). `@input` → `store.doc = docFromString(값)`. 그래야 편집 중 후행 공백이
  정규화로 씹히지 않는다(재바인딩하면 커서 튐 + 글자 유실).

## 패키지

`@codemirror/state` + `@codemirror/view` + `@codemirror/commands`만. `codemirror`
메타패키지(`basicSetup`, 줄번호·폴딩·문법 하이라이트 등)는 안 쓴다. 익스텐션은 손으로:
`history()`, `keymap(default+history)`, `drawSelection()`, `highlightActiveLine()`,
`updateListener`, `theme`.

## 좌표로 자유 배치 — 패딩된 직사각형

시인은 "여기서 12칸 오른쪽, 2줄 아래"처럼 **위치를 계산**해 활자를 놓는다. 스페이스를
직접 세지 않는다.

- CM6에 넣는 문자열은 **항상 직사각형**: 좌표 맵을 `(최대 열 + MARGIN_COLS)` × `(최대 행
  + MARGIN_ROWS)` 격자에 놓고 나머지는 공백. `coord.ts`의 `padRectFromDoc`.
- 그래서 **모든 (행, 열)이 이미 진짜 문서 위치**(=공백)다. 빈 공간 클릭·방향키 이동이
  전부 **CM6 네이티브** — 가로채기 코드 0, IME·undo 안전(캐럿이 늘 실제 위치).
- 타이핑하면 그 자리 공백이 글자로 대체된다.
- **좌표 맵엔 공백을 저장하지 않는다**: `docFromString`이 공백 자소를 건너뛰고 열만
  전진시킨다. 앞·뒤 공백, 빈 줄 모두 좌표 오프셋일 뿐 흔적을 안 남긴다(모호함 제거).
  내부 간격은 열 인덱스로 정확히 보존된다("가 나" 1칸 ≠ "가  나" 2칸).
- 우하단에 `R:C` 좌표 배지(CM6 문자열 기준 `doc.lineAt(head)`, 좌표 맵과 같은 격자).

## 동기화 (`GridEditor.vue`)

- **에디터 → 스토어**: `updateListener`에서 `docChanged && !internal`이면
  `store.doc = docFromString(CM6 문자열)`.
- **스토어 → 에디터**: `watch(doc)`에서 `docsEqual(docFromString(CM6 문자열), d)`가
  아닐 때만 전체 교체 `dispatch({insert: padRectFromDoc(d)})`. 모드 토글 왕복·향후
  좌표 연산(점프/블록 이동) 같은 외부 변경용. 에코 판별은 플래그가 아니라 **값 비교**
  (`watch`는 비동기라 플래그가 경계를 못 넘는다).
- **재패딩(`repad`)**: 문자열 직사각형을 키운다. 좌표 맵과 무관한 **문자열 뷰 전용**
  로직. **추가(append)만** 하고 줄이지 않으며(커서 안전), `Transaction.addToHistory.of
  (false)`로 undo 스텝에 안 남긴다. 줄이는 정규화는 다음 `watch(doc)` 왕복이
  `padRectFromDoc` 전체 교체로 처리(후행 공백은 애초에 맵에 없으니 자동).
- **패딩 삽입이 캐럿과 겹치는 함정**: 캐럿이 자기 줄 끝(= 현재 폭 `curW`)에 정확히
  있을 때가 바로 그 줄에 패딩을 끼워 넣는 지점과 같다. `changes`만 주고 `dispatch`하면
  CM6 기본 매핑이 캐럿을 삽입된 공백 뒤로 밀어버려("타이핑처럼" 취급)버린다.
  `state.changes(changes)`로 얻은 `ChangeSet`을 `state.selection.map(changeSet, -1)`
  (assoc -1 = 삽입 앞에 고정)로 명시적으로 매핑해 `dispatch`에 같이 넘겨 막는다.
- **타이핑 없이 방향키만으로도 여백 끝에서 안 막히게(`gridNavKeymap`)**: `docChanged`
  때만 `repad`를 걸면 방향키 로밍은 현재 여백 끝에서 그냥 멈춘다. 그렇다고 모든
  `selectionSet`에 무방향으로 `repad`를 걸면 **왼쪽 방향키**가 줄 맨 앞에서 "이전 줄
  끝"으로 랩어라운드할 때도 캐럿이 그 줄의 현재 폭(=오른쪽 가장자리)에 서게 되어
  "더 키워야 하나?"로 오판 → 왼쪽으로 갈 때마다 폭이 계속 불어나는 진동이 생겼다
  (사용자 리포트: "좌우 방향키로 이동하면 loop 되는 거 같음"). **실제로 앞으로
  나아가는 커맨드**(`cursorCharRight`·`cursorLineDown`)만 `Prec.highest` 키맵으로
  감싸(`growing()`) 성공했을 때 그 자리에서 동기적으로 `repad()`를 부른다 — 방향을
  커맨드 단위로 확정적으로 아니 왼쪽·위쪽은 절대 안 키운다. rAF로 미루지 않고
  동기 처리하는 것도 중요하다: 미루면 다음 키 입력이 "아직 안 자란 경계"에서
  들어와 같은 경합이 재발한다.
- **왼쪽 방향키는 이전 행으로 안 넘어간다(`charLeftNoWrap`)**: CM6 기본
  `cursorCharLeft`는 산문 편집기처럼 줄 맨 앞에서 이전 줄 끝으로 랩어라운드한다.
  이 앱은 행이 좌표축이라(스프레드시트에 가까움) "왼쪽으로 가다 보니 다른 행으로
  넘어갔다"가 오히려 헷갈린다는 피드백 → 줄 맨 앞에서는 그냥 멈춘다(`ArrowUp`으로
  행은 명시적으로 이동). 이 결정 덕에 왼쪽이 다른 행의 폭 경계에 서는 경우 자체가
  없어져 위 진동도 근본적으로 재발하지 않는다.
- `internal` 플래그: 우리가 낸 `dispatch` 동안 `updateListener`가 스토어로 되쏘지
  않게. `dispatch`는 동기라 안전.

## 렌더 (`EditorView.theme`)

- 메트릭 = `stores/manuscript.ts`의 `GRID`(fontSize/lineHeight/padY/padX)와 일치 →
  `EditorView.vue`의 `centerOn`/`onJump` 기하(`line*lineHeight + padY`)가 그대로 맞는다.
- `word-spacing: 0.5em` — 고정폭 CJK 폰트에서 공백이 한글의 반칸이라, 공백 N개가
  N칸으로 보이게 보정(한글 위주 기준). CM6이 실 DOM을 측정하므로 캐럿 좌표는 정확.
- **반각 문자 정렬(`halfwidthField`)**: 라틴·숫자·ASCII 기호(`/[\x21-\x7E]+/`, 공백
  제외)는 한글 음절의 절반 폭이라 그냥 두면 격자가 어긋난다(`2026`이 한글 두 칸보다
  좁게 찍힘). `StateField`가 문서에서 반각 런을 찾아 `Decoration.mark`(`.cm-halfwidth`)
  로 감싸고, 거기에 `letter-spacing: var(--halfwidth-gap)`을 건다. 이 값은 실제
  렌더된 한글 1자 폭에서 반각 1자 폭을 뺀 값을 `onMounted`(+ 폰트 로드 완료 시)에
  DOM으로 직접 측정해(`measureHalfwidthGap`) CSS 변수로 심는다 — 시스템 폰트 스택이라
  OS마다 비율이 달라 하드코딩할 수 없다. 트레이드오프: 반각 글자 사이에 자간이 생겨
  "2026"처럼 벌어져 보인다 — 격자 정렬과 맞바꾼 것.
- 폰트는 **시스템 스택**(`ui-monospace, "SF Mono", Menlo, Consolas, "D2Coding",
  "Nanum Gothic Coding", "Apple SD Gothic Neo", "Malgun Gothic", monospace`) — 웹폰트
  비동기 로드(구글 폰트는 CJK를 유니코드 범위별로 쪼개 서브셋을 따로 불러온다)에 기대지
  않는다. 한글 음절 블록은 어떤 폰트든 정사각형 균등 폭이라 시스템 폰트로도 격자가 맞는다.
- **CM6 네이티브 스크롤러**: `"&"{height:100%}` + `.cm-scroller{overflow:auto}`(기본값에
  가깝게). 프레임 크기가 고정된 지금은 CM6가 원래 지원하는 "고정 높이 에디터 + 내부
  스크롤" 패턴 그대로라 커스텀 스크롤 래퍼가 필요 없다(아래 프레임 절 참고).
- **shrink-wrap**: CM6 기본 `.cm-content{flex-grow:2}`를 `flexGrow:0`+`width:max-content`로
  덮어 콘텐츠가 스크롤러 폭 전체로 안 뻗게(긴 줄은 대신 가로 스크롤).
- **커서 시인성**: 큰 빈 벌판에서 캐럿을 놓치지 않도록, 네이티브 캐럿은 숨기고
  (`.cm-content{caret-color:transparent}`) `drawSelection()`의 `.cm-cursor`를
  `border-left: 2px solid var(--accent)` + `box-shadow: 0 0 6px accent/70%`로 그린다.
- 선택 배경 = `color-mix(--accent 22%)`. **활성 줄 밴드는 없다**(피드백으로 제거).

## 에디터 프레임 (`.editor-frame`) — 고정 뷰포트

`.editor-frame`은 **고정 크기**(`width: min(90vw, 640px); height: min(70vh, 560px)`) +
`overflow: hidden`인 뷰포트다. 안쪽 `hostEl`이 그 크기를 100% 채우고, **CM6 자신의
`.cm-scroller`가 실제 스크롤 컨테이너**다 — 커스텀 스크롤 래퍼(`.editor-scroll`)를
따로 두지 않는다.

**왜 고정 뷰포트인가**: 예전엔 프레임이 `width: max-content` + 내용 마지막 줄까지만
자라는 높이였는데, `overflow`가 없어 CM6 호스트(패딩 여유분 포함 전체 직사각형)가
프레임 아래로 그냥 넘쳐 흘렀다 — 화면에 프레임이 안 보이는 영역까지 클릭하면 캐럿이
붙는 버그(사용자 리포트: "frame을 벗어난 곳에서도 커서를 놓을 수 있네"). 프레임을
`overflow: hidden` 고정 크기로 만들면 **프레임 밖은 진짜로 클릭이 안 닿는다**
(브라우저가 클리핑된 조상 밖의 히트 테스트를 막아줌 — `elementFromPoint`로 확인:
프레임 밖 지점은 `.editor-frame`의 자손이 아닌 다른 엘리먼트를 돌려준다).

**왜 CM6 자신의 스크롤러인가 (커스텀 `.editor-scroll` 래퍼를 걷어냄)**: 처음엔 옛날
"무대 전체가 스크롤"하던 시절의 `.cm-scroller{overflow:visible}` 오버라이드를 그대로
둔 채 바깥에 `.editor-scroll`(`overflow:auto`) 래퍼를 하나 더 씌우고 CM6의
`scrollIntoView`가 그 래퍼까지 걸어 올라가 스크롤해주길 기대했다. 방향키로 빠르게
많이 이동하면 **프레임이 어느 지점부터 따라오길 멈추고 캐럿만 계속 움직이는** 증상이
있었다(사용자 리포트) — CM6이 정식으로 지원·테스트하는 배치가 아니라 발생한 것으로
보인다. 지금은 프레임이 고정 크기니 **CM6가 원래 가장 흔하게 쓰이는 방식**(고정 높이
컨테이너에 심고 `.cm-scroller`가 직접 스크롤)으로 되돌렸다 — `"&"{height:100%}` +
`.cm-scroller{overflow:auto}`(스크롤바만 숨김). 래퍼 한 겹이 통째로 사라져 더 단순하고,
CM6 자체 스크롤 로직(잘 테스트된 경로)을 그대로 신뢰한다.

- **팬**: 트랙패드 2지 스크롤 / 휠이 `.cm-scroller`를 그대로 스크롤(공짜, 코드 0줄).
  Space+드래그는 텍스트 에디터의 기본 공백 입력과 충돌이 커서(가로채기·재삽입·IME
  가드 필요) 도입하지 않기로 했다.
- **캐럿 따라가기**: 방향키·클릭으로 캐럿이 움직이면 CM6이 `.cm-scroller`를 스스로
  스크롤해 캐럿을 보이게 한다 — 추가 코드 없음. 격자 모드는 이제 이 프레임 내부 스크롤이
  담당하므로 `EditorView.vue`의 타자기 모드(무대 중앙 정렬)는 **흐름 모드 전용**으로
  좁혔다(`onCaretLine`에서 `mode !== "flow"`면 무시).
- **면 틴트·크롭 마크**는 그대로: 배경 `color-mix(--foreground 2.5%, transparent)` +
  네 모서리 L자 틱(`linear-gradient` 8겹, `--foreground 28%`). 프레임이 고정 크기라
  마크도 항상 같은 자리.

지금 크기(`640×560`, `min()`으로 좁은 화면 대응)는 기본값이다. 캔버스를 프레임보다
훨씬 넓게 키우는 것(짧은 시에도 여백 캔버스)과 좌표 눈금자·미니맵 같은 크롬은
`design-system/mockups/palim/coordinate-editor-directions.html` 시안 방향이 정해지면
얹는다.

## 좌표 모델 (`src/core/coord.ts` + 테스트)

DOM·Vue를 모르는 순수 TS. `CoordDoc = Map<"행,열", 자소 1개>`(한글·라틴·숫자 모두 1슬롯).

- `docFromString(s)` — 줄별로 자소 분할, 공백·탭은 건너뛰고 열만 전진, 나머지를 `(행,열)`에.
- `textFromDoc(doc)` — 자소를 열 위치에 놓고 사이는 공백으로. 후행 공백·후행 빈 줄 없음
  (정규형). 흐름 모드·미리보기·export가 보는 문자열.
- `padRectFromDoc(doc, marginCols=8, marginRows=12)` — CM6용 직사각형 문자열 투영.
- `docBounds(doc)` — 자소가 차지하는 `{rows, cols}` 개수.
- `docsEqual(a, b)` — 맵 동등 비교(좌표 연산 결과 비교용).

불변식: `docFromString(textFromDoc(doc))` === `doc`,
`docFromString(padRectFromDoc(doc))` === `doc`(패딩은 파싱에 안 보임).

## 아직 없는 것

- **격자선(시각 그리드)** — CM6 `layer()` + 실측(`coordsAtPos`)으로 그렸다가
  "너무 직사각형" 피드백으로 걷어냈다(커밋 `d250cdd` → 이 커밋에서 제거). 다시 넣으면
  옅고 정사각에 가깝게.
- 활성 "칸" 박스. 흐름 모드는 계속 plain `<textarea>`(`FlowEditor.vue`).
